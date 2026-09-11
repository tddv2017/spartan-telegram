"""Spartan Institutional Structured JSON Logger."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class SpartanJsonFormatter(logging.Formatter):
    """Formats log records as strict institutional JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "message": record.getMessage(),
        }

        # Include structured extra payload if present
        if hasattr(record, "payload") and isinstance(record.payload, dict):
            log_entry["payload"] = record.payload

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def get_logger(name: str = "spartan_quant", level: int = logging.INFO) -> logging.Logger:
    """Creates or returns configured institutional structured logger."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(SpartanJsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False

    return logger


class InstitutionalLogger:
    """Wrapper providing structured logging convenience methods."""

    def __init__(self, name: str = "spartan_quant"):
        self._logger = get_logger(name)

    def info(self, message: str, **kwargs: Any) -> None:
        self._log(logging.INFO, message, kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        self._log(logging.WARNING, message, kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self._log(logging.ERROR, message, kwargs)

    def critical(self, message: str, **kwargs: Any) -> None:
        self._log(logging.CRITICAL, message, kwargs)

    def debug(self, message: str, **kwargs: Any) -> None:
        self._log(logging.DEBUG, message, kwargs)

    def _log(self, level: int, message: str, extra: Dict[str, Any]) -> None:
        extra_dict = {"payload": extra} if extra else {}
        self._logger.log(level, message, extra=extra_dict)
