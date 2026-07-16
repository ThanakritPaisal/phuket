#!/usr/bin/env python3
"""Seed the `provider` table with the full catalog (existing 255 + batch 1,000),
reattaching review text to the batch records (kept out of the client providers.json
to keep the bundle lean, but wanted in the DB per the review-storage decision).

Photo fields already point to the GCS bucket (/providers/<id>.jpg) which was uploaded
separately, so the images travel with the records. Idempotent (upsert by id).
"""
import json, os
from psycopg.types.json import Json
from db import get_conn, init_provider_schema, PROVIDER_TABLE

HERE = os.path.dirname(__file__)
PROVIDERS = os.path.join(HERE, "..", "src", "data", "providers.json")
BATCH = os.path.join(HERE, "..", "..", "batch1_enriched.json")


def main() -> None:
    rows = json.load(open(PROVIDERS, encoding="utf-8"))
    # id -> full-only fields (review text + Google deep-link/meta) from the enriched batch
    extra = {}
    if os.path.exists(BATCH):
        for b in json.load(open(BATCH, encoding="utf-8")):
            extra[b["id"]] = {k: b[k] for k in ("reviews_text", "matched_name", "business_status") if k in b}

    reattached = 0
    for p in rows:
        e = extra.get(p.get("id"))
        if e:
            p.update(e)
            reattached += 1

    init_provider_schema()
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
        with_reviews = conn.execute(
            f"SELECT count(*) AS n FROM {PROVIDER_TABLE} WHERE data ? 'reviews_text'"
        ).fetchone()["n"]
    print(f"seeded {len(rows)} providers (review text reattached to {reattached}); "
          f"table now has {total} rows, {with_reviews} with review text")


if __name__ == "__main__":
    main()
