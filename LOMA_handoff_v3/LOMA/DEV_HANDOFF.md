# LOMA — Developer Handoff

**LOMA** is an AI-powered local-tourism recommendation platform for Phuket hotels & tourists
(Hackathon for Better Tourism Phuket). Hotels recommend verified local shops & community
experiences to guests; every tourist action earns the hotel transparent "Impact Credits"
instead of hidden commission.

This package is the **latest working prototype + the material a dev team needs to build the
real product**.

---

## Read this first - what the prototype IS and IS NOT

`LOMA.html` is a **single self-contained HTML file** (~1.4 MB, vanilla JS, no build step).
Just open it in a browser - no install, no server.

It is a **high-fidelity interactive spec**, NOT a production app:
- **Data is in-memory mock data** (hard-coded JS objects + the JSON/XLSX seeds in this package).
- **"AI" scoring is deterministic rule-based JS**, not a trained model (intentional - fully
  explainable). See the 5-dimension formula in `LOMA_v2_CHANGES.md`.
- **No real backend, auth, or database.** Login is faked; "auth" is state flags.

Use `LOMA_v2_CHANGES.md` as the architecture bridge (it maps every in-memory structure 1:1 to
the production DB tables that were planned).

## Run it
Open `LOMA.html`. Demo logins:
- Hotel staff: `seabreeze` / `breeze2026`
- Provider:    `baanrimtalay` / `kitchen2026`
- Admin & Tourist: no login.
Top bar has a Phone / Tablet-Desktop toggle for the Staff & Provider apps.

## What to build for production
- Real backend: database (schema mapped 1:1 in `LOMA_v2_CHANGES.md`), auth, provider onboarding.
- Keep the AI scoring explainable (core promise: "popularity earns nothing").
- Wire the seed data (below) into the DB.
- Status machine must stay: AI-discovered providers cannot go live without human approval.

---

## Recent features in this build (2026-07-16)
1. **Image-forward tourist cards** - big photo, minimal text; rich detail on the detail page.
2. **"Plan a guided trip"** (route / half-day) hidden for demo - code still present.
3. **Tablet/Desktop view** de-distorted (compact search bar, no oversized map, clean card grid).
   TODO to fully match the pitch slide: add the left sidebar
   (Dashboard/Recommended/Categories/Local Partners/Analytics/Settings).
4. **Social links** ("SEE THEIR SOCIALS": FB/IG/TikTok) on tourist AND staff provider-detail.
   Data: `p.social={facebook,instagram,tiktok}` (DEMO = search URLs; PROD = real profile URLs).
5. **Mock TikTok review video player** on tourist AND staff provider-detail (function
   `reviewVideo(p)`, CSS `.rvid`). DEMO ONLY - a styled poster with fake TikTok chrome.
   PROD: replace `.poster` with a real <video>/TikTok embed.
6. **Provider TikTok source fields** in the provider profile editor (`ppEdit`): a **TikTok place
   link** (`p.tiktok_place`) to auto-pull the 3 top clips of that location, plus 3 optional
   **pinned clip** URLs (`p.reviewClips[]`) to curate exactly which clips auto-play. Empty pins
   -> auto-select. PROD wires the player to `p.reviewClips` (else top clips of `p.tiktok_place`)
   via TikTok oEmbed/API.

---

## Package contents
- `LOMA.html` .................. the master prototype (latest - open this)
- `DEV_HANDOFF.md` ............. this file
- `LOMA_v2_CHANGES.md` ......... architecture / spec (mock-vs-real, DB schema 1:1, scoring, credits)
- `LOMA_Pitch_Script.md` ...... product vision / narrative
- `LOMA_Judge_QA_Prep.md` ..... Q&A / edge cases
- `LOMA_Pitch_Deck.pdf/.pptx` . pitch deck
- `data/` ..................... generated seed data (operators, recommendations, tourists,
                                transactions, staff, areas) + gen script + README
- `loma_cbt_seed.json`, `LOMA_provider_seed_CBT.xlsx`, `LOMA_provider_leads_tiktok.xlsx` .. provider/community data
- `enrich_cbt_google_places.py`, `_cbt_seed_inject.js` .. data enrichment / injection scripts
- Brand assets: `loma-white.png` + `artwork/` (logos, poster, key images)

Note: ~28 MB of AI-generated exploration images were left OUT to keep this package small. Ask
Joe if the full `artwork/` folder is needed.
