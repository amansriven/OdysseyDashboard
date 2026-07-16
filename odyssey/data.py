"""CSV loading for Odyssey.

Only the six Prompt 1 tables are loaded. Tables keyed by measure_id
(care_gaps, appointment_slots, stars_*, segment_*, campaign_dispositions,
historical_interventions) belong to a different hackathon prompt.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import pandas as pd

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


def _data_root() -> Path:
    candidates = [
        os.environ.get("ODYSSEY_DATA"),
        Path.home() / "data",                          # Cloud Shell
        Path(__file__).resolve().parents[1] / "data",  # local checkout
    ]
    for c in candidates:
        if c and (Path(c) / "structured").is_dir():
            return Path(c)
    raise FileNotFoundError(
        "No data/structured found. Set ODYSSEY_DATA to the directory holding it."
    )


@lru_cache(maxsize=1)
def load() -> dict[str, pd.DataFrame]:
    """Load the in-scope tables. Cached; call freely."""
    root = _data_root() / "structured"
    tables: dict[str, pd.DataFrame] = {}
    for name in IN_SCOPE:
        df = pd.read_csv(root / f"{name}.csv", dtype=str, keep_default_na=False)
        for col in BOOL_COLS.get(name, []):
            df[col] = df[col].map({"True": True, "False": False}).astype("boolean")
        for col in DATE_COLS.get(name, []):
            df[col] = pd.to_datetime(df[col], errors="coerce")
        tables[name] = df
    return tables


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
