# LOMA logging API

FastAPI service that stores **every** tracking event the LOMA web app fires, and
serves analytics for the three product questions:

| Group | Question | Endpoint |
|-------|----------|----------|
| รร (hotel) | links **created / sent / shared** | `GET /stats/hotel` |
| นักท่องเที่ยว (link) | link **received / opened / marked-going** | `GET /stats/tourist-funnel` |
| สำรวจเอง | **views per shop** | `GET /stats/provider-views` |
| ปลายทาง | **scans per destination shop** | `GET /stats/destination-scans` |

Everything at once: `GET /stats/summary`. Raw log: `GET /events`.

## Bookings (community experiences)

DB-backed booking system for the community-experience flow (table **`booking`**). A
booking is **not** a visit — only a host check-in (`status=attended`) counts as income.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/bookings?community_id=&status=&date=` | list bookings (host reads their own community) |
| `POST` | `/bookings` | tourist self-books a slot — server mints the `ref` |
| `PATCH` | `/bookings/{ref}` | host check-in / no-show (`{"status":"attended"}`) |
| `DELETE` | `/bookings/{ref}` | guest cancels a self-serve booking |
| `GET` | `/bookings/availability?community_id=&date=&round=` | seats left for a slot |

`POST /bookings` body: `{ "community_id": "bang-rong", "date": "2026-07-13",
"round": "Morning · 09:00", "pax": 2, "hotel": "...", "guest": "..." }`. Responses match
the web app's `Booking` type (`src/bookings.ts`) 1:1. Seed the demo bookings once with
`python seed_bookings.py`. The frontend hydrates from `GET /bookings` at boot and syncs
every create/cancel/check-in back, falling back to localStorage when the API is down.

## Storage

PostgreSQL (DigitalOcean managed). Database **`loma`**, tables **`log`**, **`provider`**,
**`booking`**. The connection
string is read from `POSTGRESQL_CONNECTING_STRING` in the **repo-root `.env`** (see
[`db.py`](db.py)). `db.py setup()` creates the database and table if missing and runs
automatically on app startup — or run it standalone:

```bash
python db.py    # creates the `loma` DB + `log` table, then exits
```

## Run with Docker (recommended)

The database is external (DigitalOcean managed Postgres), so compose runs only the
backend. It reads the connection string from the repo-root `.env` via `env_file`.

```bash
cd loma-app/logging-api
docker compose up -d --build      # build + start on http://localhost:8000
docker compose logs -f backend    # tail logs
docker compose down               # stop
```

Health check: `curl http://localhost:8000/health`

## Run locally (without Docker)

```bash
cd loma-app/logging-api
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive docs at http://localhost:8000/docs

The frontend reads the base URL from `VITE_LOG_API_URL` (see `loma-app/.env.local`,
default `http://localhost:8000`).

## Ingestion

`POST /events` — one event; `POST /events/batch` — `{ "events": [...] }`.
Only `event_type` is required; every other field is optional. Example:

```json
{ "event_type": "provider_card_viewed", "hotel_id": "htl_demo",
  "provider_id": "p_123", "tourist_session_id": "ts_42",
  "metadata": { "source": "explore" } }
```

## Event taxonomy (must match `src/logger.ts`)

- Hotel: `recommendation_created`, `qr_generated`, `link_created` (created) · `link_sent` (sent) · `link_shared` (shared, `channel` = QR/LINE/WhatsApp/Copy link/SMS/Email)
- Tourist link: `link_received` · `link_opened` · `visit_marked`
- Self-serve: `provider_card_viewed`
- Destination: `destination_scanned`, `provider_confirmed_visit`
