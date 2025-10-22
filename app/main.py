from __future__ import annotations

import asyncio
import io
import logging
import math
import os
import sys
import threading
import time
from contextlib import redirect_stdout
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from fastapi import File, FastAPI, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator

from .can_manager import CANManager, CANNotConfiguredError
from .dbc_manager import DBCManager, DBCNotLoadedError
from .log_manager import RecordingManager
from .translations import get_all_translations, get_translation

try:
    import can
except ImportError as exc:  # pragma: no cover - handled during runtime
    raise RuntimeError(
        "python-can is required for CAN operations. Please install dependencies from requirements.txt."
    ) from exc

logger = logging.getLogger(__name__)


def _resource_path(*parts: str) -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).resolve().parent.parent
    return base.joinpath(*parts)


def _detect_can_interfaces() -> list[Dict[str, Any]]:
    detector = getattr(can, "detect_available_configs", None)
    if detector is None:  # pragma: no cover - depends on python-can version
        logger.warning("python-can detect_available_configs() fonksiyonu kullanılamıyor.")
        return []

    try:
        with redirect_stdout(io.StringIO()):
            configs = detector()
    except Exception as exc:  # pragma: no cover - depends on environment
        logger.exception("CAN arayüzleri listelenirken hata oluştu: %s", exc)
        return []

    results: list[Dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for config in configs:
        interface = config.get("interface")
        channel = config.get("channel")
        if not interface or channel is None:
            continue
        key = (interface, str(channel))
        if key in seen:
            continue
        seen.add(key)
        kwargs = {k: v for k, v in config.items() if k not in {"interface", "channel"} and v is not None}
        results.append(
            {
                "interface": interface,
                "channel": str(channel),
                "kwargs": kwargs,
            }
        )

    results.sort(key=lambda item: (item["interface"], item["channel"]))
    return results


class SignalChaserManager:
    """Sequentially toggles signals to their max/min values on a timer."""

    def __init__(
        self,
        dbc_manager: DBCManager,
        can_manager: CANManager,
    ) -> None:
        self._dbc_manager = dbc_manager
        self._can_manager = can_manager
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._notifier: Optional[Callable[[str, Dict[str, Any]], None]] = None

    def set_notifier(self, notifier: Callable[[str, Dict[str, Any]], None]) -> None:
        self._notifier = notifier

    def start(self, message_name: str, interval_seconds: float) -> Dict[str, Any]:
        if interval_seconds <= 0:
            raise ValueError("Süre 0'dan büyük olmalı.")

        with self._lock:
            if message_name in self._tasks:
                raise RuntimeError("Bu mesaj için sinyal taraması zaten çalışıyor.")

        try:
            message = self._dbc_manager.get_message_by_name(message_name)
        except KeyError as exc:
            raise RuntimeError("Mesaj bulunamadı.") from exc
        signals = list(message.signals)
        if not signals:
            raise RuntimeError("Mesajda sinyal bulunamadı.")

        status = self._can_manager.get_status()
        if not status.get("configured"):
            raise RuntimeError("Önce CAN arayüzünü yapılandırın.")

        stop_event = threading.Event()
        started_at = time.time()
        info: Dict[str, Any] = {
            "messageName": message_name,
            "intervalSeconds": interval_seconds,
            "startedAt": started_at,
            "signals": [signal.name for signal in signals],
            "currentSignal": None,
        }

        thread = threading.Thread(
            target=self._run,
            args=(message_name, signals, interval_seconds, stop_event),
            name=f"signal-chaser-{message_name}",
            daemon=True,
        )

        with self._lock:
            self._tasks[message_name] = {
                "thread": thread,
                "stop": stop_event,
                "info": info,
            }

        thread.start()
        return info.copy()

    def stop(self, message_name: str) -> Dict[str, Any]:
        with self._lock:
            task = self._tasks.get(message_name)
            if not task:
                raise RuntimeError("Bu mesaj için aktif sinyal taraması yok.")
            stop_event: threading.Event = task["stop"]
            info = task["info"].copy()

        stop_event.set()
        task["thread"].join(timeout=1.0)

        with self._lock:
            self._tasks.pop(message_name, None)

        return info

    def get_status(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [task["info"].copy() for task in self._tasks.values()]

    def stop_all(self) -> None:
        for message_name in list(self._tasks.keys()):
            try:
                self.stop(message_name)
            except RuntimeError:
                continue

    def _run(
        self,
        message_name: str,
        signals: List[Any],
        interval_seconds: float,
        stop_event: threading.Event,
    ) -> None:
        index = 0
        signal_count = len(signals)

        while not stop_event.is_set():
            payload: Dict[str, Any] = {}
            for signal in signals:
                payload[signal.name] = self._min_value(signal)

            current_signal = signals[index]
            payload[current_signal.name] = self._max_value(current_signal)

            try:
                encoded = self._dbc_manager.encode(message_name, payload)
                self._send(message_name, encoded)
                self._update_current_signal(message_name, current_signal.name)
            except Exception as exc:  # pragma: no cover - runtime safety
                logger.exception("Sinyal taraması gönderim hatası: %s", exc)

            if stop_event.wait(interval_seconds):
                break
            index = (index + 1) % signal_count

        with self._lock:
            if message_name in self._tasks:
                self._tasks[message_name]["info"]["currentSignal"] = None

    def _send(self, message_name: str, encoded: Dict[str, Any]) -> None:
        message = _build_can_message(encoded)
        self._can_manager.send(message)
        if self._notifier:
            self._notifier(message_name, encoded)

    def _update_current_signal(self, message_name: str, signal_name: str) -> None:
        with self._lock:
            task = self._tasks.get(message_name)
            if not task:
                return
            task["info"]["currentSignal"] = signal_name
            task["info"]["lastSentAt"] = time.time()

    @staticmethod
    def _min_value(signal: Any) -> float:
        if signal.minimum is not None:
            return signal.minimum
        if signal.initial is not None:
            return signal.initial
        if signal.choices:
            try:
                keys = list(signal.choices.keys())
                keys.sort(key=lambda item: float(getattr(item, "value", item)))
                best = keys[0]
                return getattr(best, "value", best)
            except Exception:
                return 0.0
        return 0.0

    @staticmethod
    def _max_value(signal: Any) -> float:
        if signal.maximum is not None:
            return signal.maximum
        if signal.choices:
            try:
                keys = list(signal.choices.keys())
                keys.sort(key=lambda item: float(getattr(item, "value", item)))
                best = keys[-1]
                return getattr(best, "value", best)
            except Exception:
                return 1.0
        if signal.initial is not None:
            return signal.initial
        length = getattr(signal, "length", None)
        if isinstance(length, int) and length > 0:
            return float((1 << length) - 1)
        return 1.0
class MessageBroadcaster:
    """Tracks websocket connections and sends events to all clients."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: Dict[str, Any]) -> None:
        async with self._lock:
            dead: list[WebSocket] = []
            for connection in self._connections:
                try:
                    await connection.send_json(payload)
                except Exception:
                    dead.append(connection)
            for connection in dead:
                self._connections.discard(connection)

    def send_threadsafe(self, payload: Dict[str, Any]) -> None:
        if self._loop is None:
            logger.debug("No event loop set for broadcaster, dropping payload")
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(payload), self._loop)


app = FastAPI(title="CAN Bus Tester", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
STATIC_DIR = _resource_path("static")
INDEX_FILE = STATIC_DIR / "index.html"
PLAYBACK_FILE = STATIC_DIR / "playback.html"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

dbc_manager = DBCManager()
can_manager = CANManager()
broadcaster = MessageBroadcaster()

env_record_dir = os.environ.get("CANBUS_RECORDINGS_DIR")
if env_record_dir:
    recording_root = Path(env_record_dir).expanduser()
else:
    recording_root = Path.cwd() / "recordings"
recording_root.mkdir(parents=True, exist_ok=True)

recording_manager = RecordingManager(recording_root)
signal_chaser = SignalChaserManager(dbc_manager, can_manager)


class ConfigureInterfaceRequest(BaseModel):
    interface: str
    channel: str
    bitrate: Optional[int] = Field(default=None, ge=0)
    kwargs: Dict[str, Any] = Field(default_factory=dict)


class MessageSendRequest(BaseModel):
    message_name: str = Field(alias="messageName")
    signals: Dict[str, Any]
    period_ms: Optional[int] = Field(default=None, alias="periodMs", gt=0)
    task_key: Optional[str] = Field(default=None, alias="taskKey")

    @validator("task_key", always=True)
    def default_task_key(cls, value: Optional[str], values: Dict[str, Any]) -> Optional[str]:
        period = values.get("period_ms")
        if period and not value:
            return values.get("message_name")
        return value


class StopTaskRequest(BaseModel):
    task_key: str = Field(alias="taskKey")


class RecordingStartRequest(BaseModel):
    name: Optional[str] = None


class SignalChaserStartRequest(BaseModel):
    message_name: str = Field(alias="messageName")
    interval_seconds: float = Field(alias="intervalSeconds", gt=0)


class SignalChaserStopRequest(BaseModel):
    message_name: str = Field(alias="messageName")


def _build_can_message(encoded: Dict[str, Any]) -> can.Message:
    return can.Message(
        arbitration_id=encoded["arbitration_id"],
        data=encoded["data"],
        dlc=encoded["dlc"],
        is_extended_id=encoded["is_extended"],
    )


def _handle_tx_event(
    message_name: str,
    encoded: Dict[str, Any],
    task_key: Optional[str] = None,
    period_ms: Optional[int] = None,
) -> None:
    timestamp = time.time()
    payload = {
        "type": "tx",
        "message": message_name,
        "taskKey": task_key,
        "periodMs": period_ms,
        "id": encoded["arbitration_id"],
        "dlc": encoded["dlc"],
        "data": list(encoded["data"]),
        "timestamp": timestamp,
    }
    broadcaster.send_threadsafe(payload)
    recording_manager.append_event(payload)


signal_chaser.set_notifier(_handle_tx_event)


def _on_can_message(message: can.Message) -> None:
    payload: Dict[str, Any] = {
        "type": "rx",
        "id": message.arbitration_id,
        "timestamp": message.timestamp if message.timestamp else time.time(),
        "is_extended": message.is_extended_id,
        "dlc": message.dlc,
        "data": list(message.data),
    }
    if dbc_manager.is_loaded():
        try:
            decoded = dbc_manager.decode(message.arbitration_id, message.data)
        except DBCNotLoadedError:
            decoded = None
        if decoded:
            payload["decoded"] = decoded
    broadcaster.send_threadsafe(payload)
    recording_manager.append_event(payload)


can_manager.register_callback(_on_can_message)


@app.on_event("startup")
async def on_startup() -> None:
    broadcaster.set_loop(asyncio.get_running_loop())
    logger.info("CAN Bus Tester API ready")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    can_manager.shutdown()
    signal_chaser.stop_all()


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(str(INDEX_FILE))


@app.get("/playback")
async def playback() -> FileResponse:
    return FileResponse(str(PLAYBACK_FILE))


@app.get("/api/translations/{lang}")
async def get_translations(lang: str) -> Dict[str, Any]:
    """Get all translations for a specific language."""
    translations = get_all_translations(lang)
    return {"language": lang, "translations": translations}


@app.get("/api/interface/available")
async def get_available_interfaces() -> Dict[str, Any]:
    interfaces = _detect_can_interfaces()
    return {"interfaces": interfaces}


@app.get("/api/interface/status")
async def get_interface_status() -> Dict[str, Any]:
    return can_manager.get_status()


@app.post("/api/interface/configure")
async def configure_interface(request: ConfigureInterfaceRequest) -> Dict[str, Any]:
    try:
        status = can_manager.configure(
            interface=request.interface,
            channel=request.channel,
            bitrate=request.bitrate,
            **request.kwargs,
        )
        broadcaster.send_threadsafe({"type": "interface", "status": status})
        return status
    except Exception as exc:
        logger.exception("Failed to configure CAN interface: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/dbc/load")
async def load_dbc(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        contents = await file.read()
        metadata = dbc_manager.load_from_content(contents, file.filename)
        broadcaster.send_threadsafe(
            {"type": "dbc", "path": metadata.get("path"), "name": metadata.get("name")}
        )
        signal_chaser.stop_all()
        return metadata
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - depends on cantools
        logger.exception("Failed to load DBC: %s", exc)
        raise HTTPException(status_code=400, detail="DBC dosyası yüklenemedi.")


@app.get("/api/dbc/messages")
async def get_dbc_messages() -> Dict[str, Any]:
    if not dbc_manager.is_loaded():
        raise HTTPException(status_code=404, detail="DBC not loaded.")
    return dbc_manager.list_messages()


@app.get("/api/messages/chaser/status")
async def get_signal_chaser_status(message_name: Optional[str] = Query(default=None, alias="messageName")) -> Dict[str, Any]:
    tasks = signal_chaser.get_status()
    if message_name:
        tasks = [task for task in tasks if task.get("messageName") == message_name]
    return {"tasks": tasks}


@app.post("/api/messages/chaser/start")
async def start_signal_chaser(request: SignalChaserStartRequest) -> Dict[str, Any]:
    if not dbc_manager.is_loaded():
        raise HTTPException(status_code=400, detail="Önce bir DBC dosyası yükleyin.")
    try:
        task = signal_chaser.start(request.message_name, request.interval_seconds)
        return {"status": "running", "task": task}
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/messages/chaser/stop")
async def stop_signal_chaser(request: SignalChaserStopRequest) -> Dict[str, Any]:
    try:
        task = signal_chaser.stop(request.message_name)
        return {"status": "stopped", "task": task}
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/logs")
async def list_logs() -> Dict[str, Any]:
    logs = recording_manager.list_recordings()
    active = recording_manager.get_active()
    if active:
        active["duration"] = max(0.0, time.time() - active["started_at"])
    return {"active": active, "logs": logs}


@app.post("/api/logs/start")
async def start_log(request: RecordingStartRequest) -> Dict[str, Any]:
    try:
        info = recording_manager.start(request.name)
        broadcaster.send_threadsafe({"type": "recording", "state": "started", "record": info})
        return info
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/logs/stop")
async def stop_log() -> Dict[str, Any]:
    try:
        info = recording_manager.stop()
        broadcaster.send_threadsafe({"type": "recording", "state": "stopped", "record": info})
        return info
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/logs/{log_id}")
async def get_log(log_id: str) -> Dict[str, Any]:
    data = recording_manager.get_recording(log_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return data


@app.post("/api/logs/{log_id}/decode")
async def decode_log(log_id: str, file: UploadFile = File(...)) -> Dict[str, Any]:
    data = recording_manager.get_recording(log_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")

    contents = await file.read()
    temp_manager = DBCManager()
    try:
        temp_manager.load_from_content(contents, file.filename)
    except Exception as exc:  # pragma: no cover - depends on cantools
        raise HTTPException(status_code=400, detail=f"DBC yüklenemedi: {exc}")

    try:
        metadata = temp_manager.list_messages()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"DBC mesajları okunamadı: {exc}")

    signal_catalog: Dict[tuple[str, str], Dict[str, Any]] = {}
    for message in metadata.get("messages", []):
        for signal in message.get("signals", []):
            signal_catalog[(message["name"], signal["name"])] = signal

    started_at = data.get("started_at", 0.0)
    events = data.get("events", [])
    decoded_events: list[Dict[str, Any]] = []
    events_total = len(events)
    max_events = 2000
    max_points = 5000
    series_map: Dict[str, Dict[str, Any]] = {}

    for event in events:
        event_timestamp = float(event.get("timestamp", started_at))
        relative_time = event_timestamp - started_at
        decoded_payload: Optional[Dict[str, Any]] = None
        data_bytes = bytes(event.get("data", []))
        try:
            decoded_payload = temp_manager.decode(event.get("id", 0), data_bytes)
        except Exception:
            decoded_payload = None

        if decoded_payload is None and event.get("message"):
            try:
                message_obj = temp_manager.get_message_by_name(event["message"])
                decoded_signals = message_obj.decode(data_bytes)
                decoded_payload = {
                    "name": message_obj.name,
                    "signals": decoded_signals,
                    "is_extended": message_obj.is_extended_frame,
                    "comment": message_obj.comment,
                }
            except Exception:
                decoded_payload = None

        if decoded_payload and decoded_payload.get("name"):
            message_name = decoded_payload["name"]
            signals = decoded_payload.get("signals", {})
            for signal_name, value in signals.items():
                key = f"{message_name}.{signal_name}"
                entry = series_map.setdefault(
                    key,
                    {
                        "key": key,
                        "message": message_name,
                        "signal": signal_name,
                        "unit": signal_catalog.get((message_name, signal_name), {}).get("unit"),
                        "points": [],
                    },
                )
                numeric_value: Optional[float]
                if isinstance(value, bool):
                    numeric_value = float(int(value))
                elif isinstance(value, (int, float)):
                    numeric_value = float(value)
                else:
                    numeric_value = None
                if numeric_value is not None:
                    entry["points"].append({"timestamp": event_timestamp, "relative": relative_time, "value": numeric_value})

        if len(decoded_events) < max_events:
            decoded_events.append(
                {
                    "type": event.get("type"),
                    "timestamp": event_timestamp,
                    "relative_time": relative_time,
                    "id": event.get("id"),
                    "dlc": event.get("dlc"),
                    "data": event.get("data"),
                    "message": event.get("message"),
                    "decoded": decoded_payload,
                    "periodMs": event.get("periodMs"),
                }
            )

    series = sorted(series_map.values(), key=lambda item: item["key"])
    for entry in series:
        points = entry.get("points", [])
        original_count = len(points)
        if original_count > max_points:
            step = max(1, math.ceil(original_count / max_points))
            entry["points"] = points[::step]
            entry["downsampled"] = True
            entry["original_points"] = original_count
        else:
            entry["downsampled"] = False
            entry["original_points"] = original_count
    duration = 0.0
    if events:
        last_timestamp = max(float(e.get("timestamp", started_at)) for e in events)
        duration = max(0.0, last_timestamp - started_at)

    return {
        "log": {
            "id": data.get("id"),
            "name": data.get("name"),
            "started_at": started_at,
            "ended_at": data.get("ended_at"),
            "duration": duration,
            "event_count": len(events),
        },
        "events": decoded_events,
        "events_shown": len(decoded_events),
        "events_total": events_total,
        "series": series,
    }


@app.post("/api/messages/send")
async def send_message(request: MessageSendRequest) -> JSONResponse:
    if not dbc_manager.is_loaded():
        raise HTTPException(status_code=400, detail="DBC file must be loaded before sending messages.")

    try:
        encoded = dbc_manager.encode(request.message_name, request.signals)
        message = _build_can_message(encoded)
    except Exception as exc:
        logger.exception("Failed to encode message: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))

    period_ms = request.period_ms
    try:
        if period_ms:
            period_seconds = period_ms / 1000.0
            task_key = request.task_key or request.message_name
            can_manager.start_periodic(task_key, message, period_seconds)
            _handle_tx_event(request.message_name, encoded, task_key=task_key, period_ms=period_ms)
            return JSONResponse({"status": "periodic", "taskKey": task_key, "periodMs": period_ms})

        can_manager.send(message)
        _handle_tx_event(request.message_name, encoded)
        return JSONResponse({"status": "sent"})

    except CANNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to send CAN message: %s", exc)
        raise HTTPException(status_code=500, detail="Internal CAN send error.")


@app.post("/api/messages/stop")
async def stop_message(request: StopTaskRequest) -> Dict[str, Any]:
    can_manager.stop_periodic(request.task_key)
    return {"status": "stopped", "taskKey": request.task_key}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await broadcaster.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
