"""Compatibility-safe logging module with stdlib passthrough and service helpers.

This project intentionally has a local module named ``logging.py`` per structure docs.
To avoid breaking tools that import Python's standard ``logging`` module, this file
loads and re-exports stdlib logging symbols, then adds service helper functions.
"""
from __future__ import annotations

import importlib.util
import os
import sysconfig


def _load_stdlib_logging_module():
	stdlib_dir = sysconfig.get_path("stdlib")
	module_path = os.path.join(stdlib_dir, "logging", "__init__.py")
	spec = importlib.util.spec_from_file_location("_stdlib_logging", module_path)
	if spec is None or spec.loader is None:
		raise ImportError("Unable to load Python stdlib logging module.")

	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


_stdlib_logging = _load_stdlib_logging_module()

# Re-export stdlib logging API so imports like `from logging import LogRecord` still work.
for _name in dir(_stdlib_logging):
	if _name.startswith("__") and _name not in {"__all__", "__doc__"}:
		continue
	globals()[_name] = getattr(_stdlib_logging, _name)


_configured = False


def configure_logging(level: str = "INFO") -> None:
	"""Configure process-wide logging once."""
	global _configured
	if _configured:
		return

	resolved = getattr(_stdlib_logging, level.upper(), _stdlib_logging.INFO)
	_stdlib_logging.basicConfig(
		level=resolved,
		format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
	)
	_configured = True


def get_logger(name: str):
	"""Return a configured logger."""
	configure_logging()
	return _stdlib_logging.getLogger(name)
