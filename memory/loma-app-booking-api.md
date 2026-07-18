---
name: loma-app-booking-api
description: DB-backed booking system — FastAPI endpoints in loma-app/logging-api, `booking` table, wired to both frontends
metadata:
  type: project
---

The community-experience **booking system** is DB-backed (DigitalOcean Postgres, db `loma`, table `booking`).

- **Backend:** `loma-app/logging-api/main.py` — `GET/POST /bookings`, `PATCH /bookings/{ref}` (check-in/no-show), `DELETE /bookings/{ref}`, `GET /bookings/availability`. Schema in `db.py` (`init_booking_schema`), demo rows via `seed_bookings.py`. A booking is NOT a visit — only `status=attended` counts as income.
- **Frontends wired to it:** the React app (`loma-app/src/bookings.ts` + `bookingsApi.ts`, hydrates at boot in `main.tsx`) AND the standalone prototype (`LOMA_handoff-LASTEST/LOMA/LOMA.html`, patched via `_wire_booking_backend.py` — functions `lomaAddBooking/lomaCancelBooking/lomaCheckIn/lomaHydrateBookings`, base URL `http://<host>:8000`).
- **Communities are now unified** (2026-07-17): the prototype's 6 fabricated demo communities were replaced with loma-app's 10 real ones (real ids `bang-rong`, `kamala`, `old-town`, `bang-tao`, `cape-panwa`, `koh-maprao`, `kathu`, `koh-maprao`, `ban-kian`, `tha-chatchai`, `ban-sakhu`) via `LOMA_handoff-LASTEST/LOMA/data/gen_communities.mjs` (sources loma-app `v2/communities.json` + `v2/communityAccounts.json`, mirrors `assets.ts` image resolution). It rewrites `const COMMUNITIES` + `const COMMUNITY_ACCOUNTS` in LOMA.html; idempotent. Because ids now match, prototype bookings share community ids with loma-app + the DB seed rows.
- Providers already matched before this: prototype's `LOMA_DATA.operators` (1234) are generated from loma-app `providers.json` (1243, minus 9 with no lat/lng) — DB `provider` table == providers.json exactly, no drift.

See [[loma-html-served-by-docker-nginx]] for the deploy gotcha when editing LOMA.html.
