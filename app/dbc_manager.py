from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import cantools
from cantools.database import Database
from cantools.database.can import Message


class DBCNotLoadedError(RuntimeError):
    """Raised when an operation requires a loaded DBC, but none is available."""


class DBCManager:
    """Loads and queries CAN DBC database files."""

    def __init__(self) -> None:
        self._dbc_path: Optional[Path] = None
        self._dbc_label: Optional[str] = None
        self._db: Optional[Database] = None

    @property
    def dbc_path(self) -> Optional[Path]:
        return self._dbc_path

    def load(self, path: str | Path) -> Dict[str, Any]:
        """Load a DBC file from disk and return its metadata."""
        candidate = Path(path).expanduser().resolve()
        if not candidate.exists():
            raise FileNotFoundError(f"DBC file not found: {candidate}")

        self._db = cantools.database.load_file(candidate)
        self._dbc_path = candidate
        self._dbc_label = candidate.name
        return self._build_metadata()

    def load_from_content(self, content: bytes, label: Optional[str] = None) -> Dict[str, Any]:
        """Load a DBC from raw file content (e.g. uploaded file)."""
        if not content:
            raise ValueError("DBC içeriği boş olamaz.")

        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")

        self._db = cantools.database.load_string(text, database_format="dbc")
        self._dbc_path = None
        self._dbc_label = label
        return self._build_metadata()

    def is_loaded(self) -> bool:
        return self._db is not None

    def _require_db(self) -> Database:
        if self._db is None:
            raise DBCNotLoadedError("DBC file is not loaded yet.")
        return self._db

    def _build_metadata(self) -> Dict[str, Any]:
        """Return a serialisable representation of the database."""
        db = self._require_db()
        messages = []
        for message in db.messages:
            messages.append(
                {
                    "name": message.name,
                    "frame_id": message.frame_id,
                    "is_extended": message.is_extended_frame,
                    "length": message.length,
                    "comment": message.comment,
                    "senders": message.senders,
                    "signals": [self._format_signal(signal) for signal in message.signals],
                }
            )
        return {
            "path": str(self._dbc_path) if self._dbc_path else None,
            "name": self._dbc_label,
            "messages": messages,
        }

    def list_messages(self) -> Dict[str, Any]:
        """Expose message metadata for API consumption."""
        return self._build_metadata()

    def get_message_by_name(self, name: str) -> Message:
        db = self._require_db()
        try:
            return db.get_message_by_name(name)
        except KeyError as exc:
            raise KeyError(f"Message '{name}' not found in DBC.") from exc

    def encode(self, message_name: str, signals: Dict[str, Any]) -> Dict[str, Any]:
        message = self.get_message_by_name(message_name)
        raw_data = message.encode(signals, strict=False)
        arbitration_id = message.frame_id
        return {
            "arbitration_id": arbitration_id,
            "data": bytes(raw_data),
            "is_extended": message.is_extended_frame,
            "dlc": message.length,
        }

    def decode(self, arbitration_id: int, data: bytes) -> Optional[Dict[str, Any]]:
        """Decode a CAN message if it exists in the active DBC."""
        db = self._require_db()
        try:
            message = db.get_message_by_frame_id(arbitration_id)
        except KeyError:
            return None

        try:
            decoded = message.decode(data)
        except Exception:
            return None

        return {
            "name": message.name,
            "signals": decoded,
            "is_extended": message.is_extended_frame,
            "comment": message.comment,
        }

    def _format_signal(self, signal: cantools.database.can.signal.Signal) -> Dict[str, Any]:
        choices = None
        if signal.choices:
            choices = []
            for raw, choice in signal.choices.items():
                label = getattr(choice, "name", None) or str(choice)
                choices.append({"value": raw, "name": label})

        return {
            "name": signal.name,
            "start": signal.start,
            "length": signal.length,
            "byte_order": signal.byte_order,
            "is_signed": signal.is_signed,
            "initial": signal.initial,
            "minimum": signal.minimum,
            "maximum": signal.maximum,
            "scale": signal.scale,
            "offset": signal.offset,
            "unit": signal.unit,
            "choices": choices,
            "comment": signal.comment,
            "receivers": signal.receivers,
        }
