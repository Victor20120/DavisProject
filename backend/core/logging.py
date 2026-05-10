# logging.py — sets up a single logger for the whole app
#
#  use the logger:
#   from core.logging import logger
#   logger.info("user sent a message")
#   logger.error("Claude API failed", exc_info=True)
#
# Why a real logger:
#   - print() has no level (you can't turn off debug noise in production)
#   - logger.error() automatically includes the filename + line number
#   - logger.exception() captures the full stack trace on errors
#   - Later we can swap in Cloud Logging with zero code changes

import logging
import sys

logger = logging.getLogger("medime")
logger.setLevel(logging.DEBUG)  # capture everything; handlers below filter by level

_handler = logging.StreamHandler(sys.stdout)
_handler.setLevel(logging.DEBUG)

# Format: timestamp | level | message
# Example: 2026-05-09 14:32:01 | INFO | user dev_user sent a message
_formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_handler.setFormatter(_formatter)

# Only add the handler once — prevents duplicate lines if this module is imported multiple times
if not logger.handlers:
    logger.addHandler(_handler)
