from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class Recording:
    """In-memory representation of an active CAN log recording."""

    id: str
    name: str
    started_at: float
    events: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self, include_events: bool = True) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "started_at": self.started_at,
        }
        if include_events:
            data["events"] = list(self.events)
        return data


class RecordingManager:
    """Stores CAN RX/TX events to disk for later playback."""

    def __init__(self, base_directory: Path) -> None:
        self._base_directory = base_directory
        self._base_directory.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._active: Optional[Recording] = None

    def start(self, name: Optional[str]) -> Dict[str, Any]:
        """Start a new recording session."""
        with self._lock:
            if self._active is not None:
                raise RuntimeError("Aktif bir kayıt zaten devam ediyor.")

            timestamp = time.time()
            identifier = uuid.uuid4().hex
            label = (name or "").strip() or time.strftime("%Y%m%d-%H%M%S", time.localtime(timestamp))

            self._active = Recording(id=identifier, name=label, started_at=timestamp)
            return self._active.to_dict(include_events=False)

    def stop(self) -> Dict[str, Any]:
        """Stop the current recording and persist it to disk."""
        with self._lock:
            if self._active is None:
                raise RuntimeError("Aktif kayıt bulunamadı.")

            ended_at = time.time()
            record = self._active
            record_data = record.to_dict(include_events=True)
            record_data["ended_at"] = ended_at
            record_data["event_count"] = len(record.events)

            path = self._record_path(record.id)
            with path.open("w", encoding="utf-8") as handle:
                json.dump(record_data, handle, ensure_ascii=False, indent=2)

            self._active = None
            return record_data

    def append_event(self, event: Dict[str, Any]) -> None:
        """Append a CAN event to the active recording."""
        with self._lock:
            if self._active is None:
                return
            # Events are already JSON serialisable (lists/ints/str/floats).
            self._active.events.append(dict(event))

    def list_recordings(self) -> List[Dict[str, Any]]:
        """Return available recordings on disk sorted by newest first."""
        recordings: List[Dict[str, Any]] = []
        for path in sorted(self._base_directory.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                with path.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
            except Exception:
                continue
            data.setdefault("id", path.stem)
            events = data.get("events", [])
            data.setdefault("event_count", len(events))
            started = data.get("started_at")
            ended = data.get("ended_at")
            if isinstance(started, (int, float)) and isinstance(ended, (int, float)):
                data["duration"] = max(0.0, ended - started)
            data.pop("events", None)
            recordings.append(data)
        return recordings

    def get_recording(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Load a recording from disk by identifier."""
        path = self._record_path(record_id)
        if not path.exists():
            return None
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def get_active(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            if self._active is None:
                return None
            return self._active.to_dict(include_events=False)

    def _record_path(self, record_id: str) -> Path:
        return self._base_directory / f"{record_id}.json"
