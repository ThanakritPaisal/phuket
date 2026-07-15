#!/usr/bin/env python3
"""Seed the `provider` table in the loma DB from the web app's providers.json.
Idempotent (upsert by id). Run once (or after regenerating providers):

    python seed_providers.py
"""
import json
import os

from psycopg.types.json import Json

from db import get_conn, init_provider_schema, PROVIDER_TABLE

HERE = os.path.dirname(__file__)
PROVIDERS = os.path.join(HERE, "..", "src", "data", "providers.json")


def main() -> None:
    init_provider_schema()
    rows = json.load(open(PROVIDERS, encoding="utf-8"))
    with get_conn() as conn:
        for p in rows:
            conn.execute(
                f"""
                INSERT INTO {PROVIDER_TABLE}
                    (id, name, category, area, lat, lng, source, community_slug, confidence, data, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
                ON CONFLICT (id) DO UPDATE SET
                    name=EXCLUDED.name, category=EXCLUDED.category, area=EXCLUDED.area,
                    lat=EXCLUDED.lat, lng=EXCLUDED.lng, source=EXCLUDED.source,
                    community_slug=EXCLUDED.community_slug, confidence=EXCLUDED.confidence,
                    data=EXCLUDED.data, updated_at=now()
                """,
                (p.get("id"), p.get("name"), p.get("category"), p.get("area"),
                 p.get("lat"), p.get("lng"), p.get("source"), p.get("communitySlug"),
                 p.get("confidence"), Json(p)),
            )
        total = conn.execute(f"SELECT count(*) AS n FROM {PROVIDER_TABLE}").fetchone()["n"]
    print(f"seeded {len(rows)} providers; table now has {total} rows")


if __name__ == "__main__":
    main()
