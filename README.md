# LOMA — Local tourism distribution for Phuket

An **AI-powered local tourism distribution system**: it surfaces genuinely local
Phuket businesses and community experiences to tourists through trusted touchpoints
(hotels, staff, QR), scores them for authenticity/quality, and measures real local
impact — without hidden commission.

This repo contains the **React app** (the product) plus the **data pipeline** that
discovers, enriches and scores providers.

---

## Run the app

```bash
cd loma-app
npm install
npm run dev          # → http://localhost:5173
```

No API keys are needed to run the app — provider images load from a public Google
Cloud Storage bucket, and all data ships as JSON in `loma-app/src/data/`.

**Personas** (top nav): Staff · Tourist · Provider · Community host · Admin.
Demo logins: Staff `seabreeze`/`breeze2026` · Provider `baanrimtalay`/`kitchen2026`
· Community `bangrong`/`bangrong2026` · Admin & Tourist need no login.

Useful commands (from `loma-app/`): `npm run build`, `npm run preview`,
`npx tsc -p tsconfig.app.json --noEmit` (typecheck — the root `tsc` is a no-op).

---

## How it's built

- **`loma-app/`** — Vite + React + TypeScript. One persona-switcher shell; each
  persona is its own module. Design system in `src/styles/tokens.css` (navy/coral
  brand). Real maps via Leaflet + OpenStreetMap.
- **`loma-app/src/data/`** — the data the app runs on (generated):
  `providers.json` (~255 records, real Google-enriched), `v2/communities.json`
  (10 real Phuket communities), plus mock fixtures for the analytics dashboard.
- **`loma-app/src/scoring.ts`** — the AI Curation Engine: 5-dimension Hidden-Gem
  scoring (Locality, Quality, Visibility-Gap, Readiness, Risk) → `overall_loma_score`.
- **Images** are hosted in the GCS bucket `gradient-digital-group-loma-assets`
  and resolved by `src/assets.ts` (override with `VITE_ASSET_BASE` in a `.env`).

## Data pipeline (`scripts/`)

Discovery + enrichment + scoring. Needs `PLACES_API_KEY` (and later `GEMINI_API_KEY`)
in a root `.env` — see `.env.example`. See `scripts/README.md` for each script.
Flow: **OpenStreetMap discovery (free) → pre-filter → Google Places enrichment →
score (`scoring.ts`) → human review**.

## Reference

- `LOMA-prototype.html` + `LOMA-handover/` — the original v2 vanilla-HTML prototype
  (the app is a faithful React port of it).
- `hidden_gem_instructions.md` — the scoring spec. `communities.txt` — community seed.
- `*.xlsx` — raw research data (provider seed, TikTok creator scrapes, enriched output).
