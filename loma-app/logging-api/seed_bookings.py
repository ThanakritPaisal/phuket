#!/usr/bin/env python3
"""Seed the `booking` table with the demo bookings the web app used to hard-code
(src/bookings.ts). Idempotent — upserts by ref, so it is safe to re-run.

    python seed_bookings.py
"""
from db import BOOKING_TABLE, get_conn, init_booking_schema

# (ref, community_id, hotel, guest, pax, date, round, status)
SEED = [
    ("BK-2041", "bang-rong",  "Istanbul Boutique Hotel", "Müller +1",     2, "2026-07-11", "Morning · 09:00",   "attended"),
    ("BK-2042", "bang-rong",  "Tall Tree Kata Phuket",   "Ferrari family", 4, "2026-07-12", "Afternoon · 13:00", "confirmed"),
    ("BK-2043", "koh-maprao", "Istanbul Boutique Hotel", "Andersson",      2, "2026-07-10", "Morning · 09:00",   "attended"),
    ("BK-2044", "bang-rong",  "RentaBikePhuket.com",     "Tanaka +2",      3, "2026-07-13", "Morning · 09:00",   "requested"),
    ("BK-2045", "koh-maprao", "Tall Tree Kata Phuket",   "O'Brien",        2, "2026-07-09", "Afternoon · 13:00", "noshow"),
    ("BK-2046", "kamala",     "Istanbul Boutique Hotel", "Rossi +1",       2, "2026-07-11", "Morning · 09:00",   "attended"),
    ("BK-2047", "old-town",   "Tall Tree Kata Phuket",   "Nguyen family",  3, "2026-07-12", "Afternoon · 13:00", "confirmed"),
    ("BK-2048", "cape-panwa", "RentaBikePhuket.com",     "Silva",          2, "2026-07-13", "Morning · 09:00",   "requested"),
    ("BK-2049", "bang-tao",   "Istanbul Boutique Hotel", "Kim +2",         3, "2026-07-10", "Afternoon · 13:00", "attended"),
]


def main() -> None:
    init_booking_schema()
    with get_conn() as conn:
        for ref, cid, hotel, guest, pax, date, rnd, status in SEED:
            conn.execute(
                f"""
                INSERT INTO {BOOKING_TABLE}
                    (ref, community_id, hotel, guest, pax, booking_date, round, status, self_serve)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s, FALSE)
                ON CONFLICT (ref) DO UPDATE SET
                    community_id=EXCLUDED.community_id, hotel=EXCLUDED.hotel, guest=EXCLUDED.guest,
                    pax=EXCLUDED.pax, booking_date=EXCLUDED.booking_date, round=EXCLUDED.round,
                    status=EXCLUDED.status, updated_at=now()
                """,
                (ref, cid, hotel, guest, pax, date, rnd, status),
            )
        total = conn.execute(f"SELECT count(*) AS n FROM {BOOKING_TABLE}").fetchone()["n"]
    print(f"seeded {len(SEED)} bookings; table now has {total} rows")


if __name__ == "__main__":
    main()
