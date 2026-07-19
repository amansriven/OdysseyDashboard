"""Data access for Odyssey.

Source is MongoDB when MONGO_URI is set, otherwise the training_data CSVs.
Either way, load() returns the same dict of coerced pandas DataFrames, so
tools.py and the agents never know or care where the rows came from.

Only the six Prompt 1 tables are loaded. Tables keyed by measure_id
(care_gaps, appointment_slots, stars_*, segment_*, campaign_dispositions,
historical_interventions) belong to a different prompt and are out of scope.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import pandas as pd

from . import config

IN_SCOPE = (
    "claims",
    "members",
    "roi_authorizations",
    "coverage_rules",
    "compliance_flags",
    "providers",
)

BOOL_COLS = {
    "claims": [
        "denial_fixable",
        "referral_on_file",
        "prior_auth_required",
        "prior_auth_obtained",
        "denial_risk_flag",
        "modifier_mismatch",
    ],
    "roi_authorizations": ["auth_on_file", "auth_expired"],
    "coverage_rules": ["covered", "prior_auth_required"],
    "compliance_flags": ["resolved"],
}

DATE_COLS = {
    "claims": ["service_date", "submitted_date", "adjudication_date"],
    "roi_authorizations": ["expiration_date", "date_added"],
    "compliance_flags": ["flag_date"],
    "members": ["dob", "enrollment_date"],
}

MONGO_DB = config.MONGO_DB


def _data_root() -> Path:
    candidates = [
        os.environ.get("ODYSSEY_DATA"),
        Path.home() / "training_data",                          # Cloud Shell
        Path(__file__).resolve().parents[1] / "training_data",  # local checkout
    ]
    for c in candidates:
        if c and (Path(c) / "structured").is_dir():
            return Path(c)
    raise FileNotFoundError(
        "No training_data/structured found. Set ODYSSEY_DATA to the directory holding it."
    )


def _coerce(name: str, df: pd.DataFrame) -> pd.DataFrame:
    """Apply the same bool/date typing regardless of source (CSV or Mongo).

    Rows are stored as strings in both backends, so 'True'/'False' and ISO dates
    coerce identically. Anything downstream depends on these types.
    """
    for col in BOOL_COLS.get(name, []):
        if col in df:
            df[col] = df[col].map({"True": True, "False": False}).astype("boolean")
    for col in DATE_COLS.get(name, []):
        if col in df:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def _from_csv() -> dict[str, pd.DataFrame]:
    root = _data_root() / "structured"
    tables: dict[str, pd.DataFrame] = {}
    for name in IN_SCOPE:
        df = pd.read_csv(root / f"{name}.csv", dtype=str, keep_default_na=False)
        tables[name] = _coerce(name, df)
    return tables


def _from_mongo(uri: str) -> dict[str, pd.DataFrame]:
    from pymongo import MongoClient

    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    client.admin.command("ping")  # fail fast if unreachable
    db = client[MONGO_DB]
    tables: dict[str, pd.DataFrame] = {}
    for name in IN_SCOPE:
        docs = list(db[name].find({}, {"_id": 0}))
        if not docs:
            raise RuntimeError(
                f"Collection '{name}' is empty. Run `python3 -m odyssey.load_mongo` first."
            )
        # Stored as strings on load, so the shared coercion applies unchanged.
        df = pd.DataFrame(docs).astype(str)
        tables[name] = _coerce(name, df)
    return tables


@lru_cache(maxsize=1)
def load() -> dict[str, pd.DataFrame]:
    """Load the in-scope tables, from MongoDB if configured else CSV. Cached."""
    if config.MONGO_URI:
        return _from_mongo(config.MONGO_URI)
    return _from_csv()


def source() -> str:
    """Human-readable description of where the data came from -- for banners/logs."""
    return f"MongoDB ({MONGO_DB})" if config.MONGO_URI else "training_data CSVs"


def table(name: str) -> pd.DataFrame:
    return load()[name]


def row(name: str, key_col: str, key: str) -> dict | None:
    """Single row as a plain dict, or None. NaT/NA are normalised to None."""
    df = table(name)
    hit = df[df[key_col] == key]
    if hit.empty:
        return None
    rec = hit.iloc[0].to_dict()
    return {k: (None if pd.isna(v) else v) for k, v in rec.items()}
