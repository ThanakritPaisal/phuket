# Data pipeline scripts

One-off / re-runnable scripts that discover, enrich and score providers. They are
the reference for how the data in `loma-app/src/data/` was produced.

> **Heads-up:** paths inside these scripts are currently **absolute** (hardcoded to
> `C:/Projects/phuket/...` and the author's scratchpad). Adjust the path constants at
> the top of each file before running on another machine. They read the API key from
> the `GMAPS_KEY` (Places) or `GEMINI_API_KEY` env var — see the repo `.env.example`.
> `python` needs `openpyxl`; the `.cjs` scripts need Node.

Typical run (Places scripts): set the key then run, e.g.
`GMAPS_KEY=$PLACES_API_KEY python scripts/osm_bulk.py`

| Script | What it does | Output |
|---|---|---|
| `extract.cjs` | Extract mock data from the v1 prototype HTML | JSON fixtures |
| `extract_v2.cjs` | Extract v2 mock data (communities, hotel info, partners) | `loma-app/src/data/v2/*.json` |
| `enrich.py` | Enrich the CBT provider seed via Google Places (name→place_id→details+photo) | `LOMA_provider_enriched.xlsx`, images |
| `enrich_accounts.py` | Resolve the 3 partner hotel accounts to real Places listings | `loma-app/src/data/accounts.real.json` |
| `osm_discover.py` | **Discovery:** pull all LOMA-relevant Phuket POIs from OpenStreetMap/Overpass | `osm_phuket_candidates.json` (~3,244) |
| `osm_sample_enrich.py` | Pre-filter + Places-enrich a small sample (feasibility test) | `osm_sample_enriched.json` |
| `build_communities.py` | Build the 10 real communities from `communities.txt`; link providers via the seed `community` column | `loma-app/src/data/v2/communities.json` + `providers.json` |
| `community_samples.py` | Add sample member places per community (OSM→Places) | appends to `providers.json` |
| `osm_bulk.py` | Bulk-add good local businesses from OSM (quality-gated) to the catalog | appends to `providers.json` |
| `rehost_osm_photos.py` | Download OSM sample photos and stage them for the GCS bucket | staged jpgs + rewritten paths |

**Pipeline order for a fresh build:** `osm_discover` → `osm_bulk` / `community_samples`
→ (re-host photos → upload to bucket) → scoring runs automatically in the app via
`loma-app/src/scoring.ts`.
