"""Load the six in-scope tables into MongoDB.

    # set MONGO_URI in .env (see .env.example), then:
    python3 -m odyssey.load_mongo

Reads training_data/structured/*.csv and writes one collection per table into
the MONGO_DB database. Rows are stored as raw strings so data.py applies its
bool/date coercion identically to the CSV path. Idempotent: each collection is
dropped and recreated. The connection string comes only from config/.env --
never hardcoded here.
"""

from __future__ import annotations

import sys

import pandas as pd
from pymongo import MongoClient

from . import config
from .data import IN_SCOPE, MONGO_DB, _data_root

# Natural keys, indexed for the lookups tools.py actually performs.
KEY_INDEX = {
    "claims": "claim_id",
    "members": "member_id",
    "roi_authorizations": "auth_id",
    "coverage_rules": "rule_id",
    "compliance_flags": "flag_id",
    "providers": "provider_id",
}


def main() -> None:
    try:
        uri = config.require("MONGO_URI")
    except RuntimeError as e:
        sys.exit(str(e))

    root = _data_root() / "structured"
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    db = client[MONGO_DB]
    print(f"Connected. Loading into database '{MONGO_DB}'.\n")

    for name in IN_SCOPE:
        df = pd.read_csv(root / f"{name}.csv", dtype=str, keep_default_na=False)
        docs = df.to_dict("records")  # every value a string
        db[name].drop()
        db[name].insert_many(docs)
        key = KEY_INDEX.get(name)
        if key and key in df.columns:
            db[name].create_index(key)
        print(f"  {name:22} {len(docs):>4} docs" + (f"  (indexed on {key})" if key else ""))

    print("\nDone. Collections:")
    for name in IN_SCOPE:
        print(f"  {name:22} {db[name].count_documents({}):>4}")
    print(f"\nNow run agents with MONGO_URI set and they read from Atlas, not CSV.")


if __name__ == "__main__":
    main()
