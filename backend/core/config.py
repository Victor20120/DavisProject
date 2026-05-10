# config.py — single place to read all environment variables
#
# Every service imports from here instead of calling os.getenv() directly.
# That way if a key name ever changes, you fix it in one place, not everywhere.
# If a required key is missing, this raises an error immediately on startup
# so you know right away instead of getting a mystery crash mid-request.

import os
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    # Reads a required env var — crashes with a clear message if it's missing
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


class Settings:
    ANTHROPIC_API_KEY: str = _require("ANTHROPIC_API_KEY")

    FIREBASE_CREDENTIALS_PATH: str = _require("FIREBASE_CREDENTIALS_PATH")
 
    # What frontend origins are allowed to call this API
    # In production this would be your deployed frontend URL
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


# Single instance — import this everywhere: from core.config import settings
settings = Settings()
