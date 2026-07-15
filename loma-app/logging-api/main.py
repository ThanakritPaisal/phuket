"""
LOMA logging API
================
FastAPI service that stores *every* tracking event fired by the LOMA web app and
exposes analytics that answer the questions the product cares about:

  รร (hotel front desk)
    - กดสร้างลิ้ง / กดส่ง / กดแชร์   -> how many links created / sent / shared

  นักท่องเที่ยว (tourist who received a link)
    - รับลิ้งสำเร็จ / เปิดจริง / mark ว่าไป
      -> received the link / actually opened it / marked that they'll go

  นักท่องเที่ยวสำรวจเว็บเอง (tourist browsing on their own)
    - view ร้านนั้น / วิวร้านนี้      -> per-shop card views

  นักท่องเที่ยวไปจริง (tourist arrives)
    - ร้านปลายทางสแกน                -> destination shop scanned / confirmed the visit

Storage is PostgreSQL (DigitalOcean managed) — database `loma`, table `log`.
The connection string comes from POSTGRESQL_CONNECTING_STRING in the repo-root .env
(see db.py). The frontend logger (src/logger.ts) POSTs to /events (or /events/batch).
"""

from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from db import LOG_TABLE, get_conn, setup

# --------------------------------------------------------------------------------------
# Event taxonomy — kept in sync with the frontend (src/logger.ts / src/impact.ts).
# The three product questions map onto these event types.
# --------------------------------------------------------------------------------------

# รร — hotel front desk actions
EV_LINK_CREATED = ["recommendation_created", "qr_generated", "link_created"]  # กดสร้างลิ้ง
EV_LINK_SENT = ["link_sent"]                                                  # กดส่ง
EV_LINK_SHARED = ["link_shared"]                                             # กดแชร์

# นักท่องเที่ยว — link funnel
EV_LINK_RECEIVED = ["link_received"]   # รับลิ้งสำเร็จ
EV_LINK_OPENED = ["link_opened"]       # เปิดจริง
EV_VISIT_MARKED = ["visit_marked"]     # mark ว่าไป

# นักท่องเที่ยวสำรวจเอง — self-serve browsing
EV_PROVIDER_VIEW = ["provider_card_viewed"]  # วิวร้าน

# ร้านปลายทาง — arrival scan
EV_DESTINATION_SCAN = ["destination_scanned", "provider_confirmed_visit"]  # ร้านปลายทางสแกน

# CORS: the Vite dev server + any origin during the demo. Tighten for production.
ALLOWED_ORIGINS = os.environ.get("LOMA_LOG_CORS", "*").split(",")


# --------------------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------------------

class EventIn(BaseModel):
    """A single tracking event. Mirrors the frontend TrackingEvent; all fields optional
    except event_type so the logger can stay a thin fire-and-forget client."""

    event_type: str
    event_id: Optional[str] = Field(default=None, description="Client id, e.g. ev_12")
    hotel_id: Optional[str] = None
    staff_id: Optional[str] = None
    provider_id: Optional[str] = None
    community_id: Optional[str] = None
    recommendation_list_id: Optional[str] = None
    tourist_session_id: Optional[str] = None
    channel: Optional[str] = None            # WhatsApp / LINE / Copy link / SMS / Email / QR
    credits: Optional[int] = None
    counted: Optional[bool] = None
    flagged: Optional[bool] = None
    timestamp: Optional[str] = None          # client-supplied event time
    metadata: dict[str, Any] = Field(default_factory=dict)


class EventBatch(BaseModel):
    events: list[EventIn]


# --------------------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------------------

app = FastAPI(title="LOMA logging API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Make sure the `loma` database and `log` table exist before serving.
setup()


def _insert(conn, ev: EventIn) -> str:
    # channel can arrive either as a top-level field or inside metadata.
    channel = ev.channel or ev.metadata.get("channel")
    row = conn.execute(
        f"""
        INSERT INTO {LOG_TABLE} (
            event_id, event_type, hotel_id, staff_id, provider_id, community_id,
            recommendation_list_id, tourist_session_id, channel, credits, counted,
            flagged, client_ts, metadata
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING event_id, row_id
        """,
        (
            ev.event_id,
            ev.event_type,
            ev.hotel_id,
            ev.staff_id,
            ev.provider_id,
            ev.community_id,
            ev.recommendation_list_id,
            ev.tourist_session_id,
            channel,
            ev.credits,
            ev.counted,
            ev.flagged,
            ev.timestamp,
            Jsonb(ev.metadata),
        ),
    ).fetchone()
    # Fall back to the generated row_id when the client didn't supply an event_id.
    return row["event_id"] or f"row_{row['row_id']}"


# --------------------------------------------------------------------------------------
# Ingestion
# --------------------------------------------------------------------------------------

@app.post("/events")
def ingest_event(ev: EventIn) -> dict[str, Any]:
    with get_conn() as conn:
        eid = _insert(conn, ev)
    return {"ok": True, "event_id": eid}


@app.post("/events/batch")
def ingest_batch(batch: EventBatch) -> dict[str, Any]:
    with get_conn() as conn:
        ids = [_insert(conn, ev) for ev in batch.events]
    return {"ok": True, "count": len(ids), "event_ids": ids}


# --------------------------------------------------------------------------------------
# Raw log access
# --------------------------------------------------------------------------------------

@app.get("/events")
def list_events(
    event_type: Optional[str] = None,
    hotel_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    tourist_session_id: Optional[str] = None,
    limit: int = Query(200, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    clauses, params = [], []
    for col, val in (
        ("event_type", event_type),
        ("hotel_id", hotel_id),
        ("provider_id", provider_id),
        ("tourist_session_id", tourist_session_id),
    ):
        if val is not None:
            clauses.append(f"{col} = %s")
            params.append(val)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    with get_conn() as conn:
        total = conn.execute(f"SELECT COUNT(*) AS n FROM {LOG_TABLE} {where}", params).fetchone()["n"]
        rows = conn.execute(
            f"SELECT * FROM {LOG_TABLE} {where} ORDER BY row_id DESC LIMIT %s OFFSET %s",
            [*params, limit, offset],
        ).fetchall()
    return {"total": total, "count": len(rows), "events": [_serialize(r) for r in rows]}


def _serialize(row: dict[str, Any]) -> dict[str, Any]:
    d = dict(row)
    ts = d.get("server_ts")
    if ts is not None and not isinstance(ts, str):
        d["server_ts"] = ts.isoformat()
    return d


# --------------------------------------------------------------------------------------
# Analytics — the three product questions
# --------------------------------------------------------------------------------------

def _count(conn, types: list[str], hotel_id: Optional[str]) -> int:
    q = f"SELECT COUNT(*) AS n FROM {LOG_TABLE} WHERE event_type = ANY(%s)"
    params: list[Any] = [types]
    if hotel_id:
        q += " AND hotel_id = %s"
        params.append(hotel_id)
    return conn.execute(q, params).fetchone()["n"]


def _count_by_provider(conn, types: list[str], hotel_id: Optional[str]) -> list[dict[str, Any]]:
    q = (
        f"SELECT provider_id, COUNT(*) AS count FROM {LOG_TABLE} "
        f"WHERE event_type = ANY(%s) AND provider_id IS NOT NULL"
    )
    params: list[Any] = [types]
    if hotel_id:
        q += " AND hotel_id = %s"
        params.append(hotel_id)
    q += " GROUP BY provider_id ORDER BY count DESC"
    return [{"provider_id": r["provider_id"], "count": r["count"]} for r in conn.execute(q, params)]


def _count_by_channel(conn, types: list[str], hotel_id: Optional[str]) -> dict[str, int]:
    q = f"SELECT channel, COUNT(*) AS n FROM {LOG_TABLE} WHERE event_type = ANY(%s)"
    params: list[Any] = [types]
    if hotel_id:
        q += " AND hotel_id = %s"
        params.append(hotel_id)
    q += " GROUP BY channel"
    return {(r["channel"] or "unknown"): r["n"] for r in conn.execute(q, params)}


@app.get("/stats/hotel")
def stats_hotel(hotel_id: Optional[str] = None) -> dict[str, Any]:
    """รร — links created / sent / shared (with a breakdown by share channel)."""
    with get_conn() as conn:
        return {
            "hotel_id": hotel_id,
            "links_created": _count(conn, EV_LINK_CREATED, hotel_id),  # กดสร้างลิ้ง
            "links_sent": _count(conn, EV_LINK_SENT, hotel_id),        # กดส่ง
            "links_shared": _count(conn, EV_LINK_SHARED, hotel_id),    # กดแชร์
            "shares_by_channel": _count_by_channel(conn, EV_LINK_SHARED, hotel_id),
        }


@app.get("/stats/tourist-funnel")
def stats_tourist_funnel(hotel_id: Optional[str] = None) -> dict[str, Any]:
    """นักท่องเที่ยว — received the link / actually opened it / marked they'll go."""
    with get_conn() as conn:
        received = _count(conn, EV_LINK_RECEIVED, hotel_id)
        opened = _count(conn, EV_LINK_OPENED, hotel_id)
        marked = _count(conn, EV_VISIT_MARKED, hotel_id)
    return {
        "hotel_id": hotel_id,
        "received": received,   # รับลิ้งสำเร็จ
        "opened": opened,       # เปิดจริง
        "marked_going": marked, # mark ว่าไป
        "open_rate": round(opened / received, 4) if received else None,
        "go_rate": round(marked / opened, 4) if opened else None,
    }


@app.get("/stats/provider-views")
def stats_provider_views(hotel_id: Optional[str] = None) -> dict[str, Any]:
    """นักท่องเที่ยวสำรวจเอง — how many times each shop card was viewed."""
    with get_conn() as conn:
        return {"hotel_id": hotel_id, "views_by_provider": _count_by_provider(conn, EV_PROVIDER_VIEW, hotel_id)}


@app.get("/stats/destination-scans")
def stats_destination_scans(hotel_id: Optional[str] = None) -> dict[str, Any]:
    """ร้านปลายทาง — how many times each destination shop scanned an arriving tourist."""
    with get_conn() as conn:
        by_provider = _count_by_provider(conn, EV_DESTINATION_SCAN, hotel_id)
        total = _count(conn, EV_DESTINATION_SCAN, hotel_id)
    return {"hotel_id": hotel_id, "total_scans": total, "scans_by_provider": by_provider}


@app.get("/stats/summary")
def stats_summary(hotel_id: Optional[str] = None) -> dict[str, Any]:
    """Everything in one call — convenient for a dashboard."""
    return {
        "hotel_id": hotel_id,
        "hotel_actions": stats_hotel(hotel_id),
        "tourist_link_funnel": stats_tourist_funnel(hotel_id),
        "provider_views": stats_provider_views(hotel_id)["views_by_provider"],
        "destination_scans": stats_destination_scans(hotel_id),
    }


@app.get("/health")
def health() -> dict[str, Any]:
    with get_conn() as conn:
        n = conn.execute(f"SELECT COUNT(*) AS n FROM {LOG_TABLE}").fetchone()["n"]
    return {"ok": True, "events_stored": n, "db": "postgres:loma"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
