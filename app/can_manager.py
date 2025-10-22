from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

try:
    import can
except ImportError as exc:  # pragma: no cover - handled during runtime
    raise RuntimeError(
        "python-can is required for CAN operations. Please install dependencies from requirements.txt."
    ) from exc

logger = logging.getLogger(__name__)


ReceiveCallback = Callable[[can.Message], None]


@dataclass
class InterfaceConfig:
    interface: str
    channel: str
    bitrate: Optional[int]
    kwargs: Dict[str, Any]


class CANNotConfiguredError(RuntimeError):
    """Raised when the CAN interface has not been configured yet."""


class CANManager:
    """Handles CAN bus configuration, transmission, and reception."""

    def __init__(self) -> None:
        self._bus: Optional[can.BusABC] = None
        self._bus_lock = threading.RLock()
        self._rx_thread = threading.Thread(target=self._receive_loop, daemon=True)
        self._rx_thread_started = False
        self._stop_event = threading.Event()
        self._periodic_tasks: Dict[str, can.CyclicSendTaskABC] = {}
        self._callbacks: list[ReceiveCallback] = []
        self._config: Optional[InterfaceConfig] = None

    def register_callback(self, callback: ReceiveCallback) -> None:
        self._callbacks.append(callback)

    def configure(self, interface: str, channel: str, bitrate: Optional[int], **kwargs: Any) -> Dict[str, Any]:
        """Initialise the CAN interface."""
        config = InterfaceConfig(interface=interface, channel=channel, bitrate=bitrate, kwargs=kwargs)
        with self._bus_lock:
            self._shutdown_locked()
            logger.info("Opening CAN interface %s, channel=%s", interface, channel)
            self._bus = can.Bus(interface=interface, channel=channel, bitrate=bitrate, **kwargs)
            self._config = config
            self._ensure_rx_thread()
        return {
            "interface": config.interface,
            "channel": config.channel,
            "bitrate": config.bitrate,
            "kwargs": config.kwargs,
        }

    def _ensure_rx_thread(self) -> None:
        if not self._rx_thread_started:
            self._rx_thread_started = True
            self._rx_thread.start()

    def send(self, message: can.Message) -> None:
        bus = self._require_bus()
        bus.send(message)

    def start_periodic(self, key: str, message: can.Message, period_seconds: float) -> Dict[str, Any]:
        bus = self._require_bus()
        self.stop_periodic(key)
        task = bus.send_periodic(message, period_seconds, store_task=True)
        self._periodic_tasks[key] = task
        logger.info(
            "Started periodic transmission for key=%s (id=0x%X) every %.3fs",
            key,
            message.arbitration_id,
            period_seconds,
        )
        return {"key": key, "period_seconds": period_seconds}

    def stop_periodic(self, key: str) -> None:
        task = self._periodic_tasks.pop(key, None)
        if task:
            logger.info("Stopping periodic transmission for key=%s", key)
            task.stop()

    def stop_all_periodic(self) -> None:
        for key in list(self._periodic_tasks.keys()):
            self.stop_periodic(key)

    def get_status(self) -> Dict[str, Any]:
        with self._bus_lock:
            if not self._config:
                return {"configured": False}
            return {
                "configured": True,
                "interface": self._config.interface,
                "channel": self._config.channel,
                "bitrate": self._config.bitrate,
                "kwargs": self._config.kwargs,
            }

    def _require_bus(self) -> can.BusABC:
        bus = self._bus
        if bus is None:
            raise CANNotConfiguredError("CAN interface is not configured.")
        return bus

    def _receive_loop(self) -> None:  # pragma: no cover - thread loop
        logger.info("Starting CAN receive loop")
        while not self._stop_event.is_set():
            try:
                bus = self._require_bus()
            except CANNotConfiguredError:
                time.sleep(0.5)
                continue

            try:
                message = bus.recv(timeout=0.5)
            except can.CanError as exc:
                logger.error("CAN receive error: %s", exc)
                time.sleep(0.5)
                continue

            if message is None:
                continue

            for callback in list(self._callbacks):
                try:
                    callback(message)
                except Exception as exc:  # pragma: no cover
                    logger.exception("CAN callback error: %s", exc)

        logger.info("CAN receive loop stopped")

    def shutdown(self) -> None:
        with self._bus_lock:
            self._shutdown_locked()
            self._stop_event.set()
        if self._rx_thread_started:
            self._rx_thread.join(timeout=1.0)

    def _shutdown_locked(self) -> None:
        self.stop_all_periodic()
        if self._bus:
            try:
                self._bus.shutdown()
            except Exception as exc:
                logger.warning("Error while shutting down CAN bus: %s", exc)
            finally:
                self._bus = None
        self._config = None
