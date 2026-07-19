"""Central configuration for Odyssey.

Every secret and environment-specific value -- GCP project, Vertex settings,
API keys, the MongoDB connection string -- lives in ONE `.env` file at the
project root. Nothing is hardcoded in source anywhere else.

Setup:
    cp .env.example .env      # then edit .env with your own values

Usage:
    from . import config
    config.MONGO_URI, config.GOOGLE_CLOUD_PROJECT, ...

Importing this module also loads .env into os.environ, so libraries that read
environment variables directly (google-genai for Vertex, pymongo) pick the
values up with no extra wiring. Values already exported in the shell are NOT
overridden -- an explicit `export` wins over .env.
"""

from __future__ import annotations

import os
from pathlib import Path

# Load .env if python-dotenv is installed; otherwise fall back to the shell env.
_ROOT = Path(__file__).resolve().parents[1]
try:
    from dotenv import load_dotenv

    for _candidate in (_ROOT / ".env", Path.home() / ".env"):
        if _candidate.is_file():
            load_dotenv(_candidate, override=False)
except ImportError:
    pass


# --- Google / Vertex AI ---------------------------------------------------
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
GOOGLE_CLOUD_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
USE_VERTEX = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").strip().upper() in ("TRUE", "1", "YES")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

# --- MongoDB --------------------------------------------------------------
# Blank MONGO_URI => data layer falls back to the training_data CSVs.
MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB = os.environ.get("MONGO_DB", "odyssey")


def require(name: str) -> str:
    """Return a required env var, or raise with a clear, actionable message."""
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(
            f"{name} is not set. Copy .env.example to .env and fill it in, "
            f"or export {name} in your shell."
        )
    return val
