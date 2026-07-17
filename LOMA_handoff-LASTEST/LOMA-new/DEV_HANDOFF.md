# LOMA — Developer Handoff

**LOMA** is an AI-powered local-tourism recommendation platform for Phuket hotels & tourists
(Hackathon for Better Tourism Phuket). Hotels recommend verified local shops & community
experiences to guests; every tourist action earns the hotel transparent "Impact Credits"
instead of hidden commission.

This package is the latest working prototype + the material a dev team needs to build the real product.

## Read this first — what the prototype IS and IS NOT
`LOMA.html` is a single self-contained HTML file (~1.4 MB, vanilla JS, no build step). Open it in
a browser — no install, no server. It is a high-fidelity INTERACTIVE SPEC, not production:
- Data is in-memory mock data (JS objects + the JSON/XLSX seeds here).
- "AI" scoring is deterministic rule-based JS (intentional — fully explainable). Formula in LOMA_v2_CHANGES.md.
- No real backend/auth/DB. Login is faked.
Use LOMA_v2_CHANGES.md as the architecture bridge (maps every in-memory structure 1:1 to planned DB tables).

IMPORTANT: keep `loma-white.png` next to `LOMA.html` — the Ask LOMA bottom-tab icon references it
by relative path. (It is included in this zip alongside LOMA.html.)

## Run it
Open `LOMA.html`. Demo logins: Hotel staff `seabreeze`/`breeze2026`; Provider `baanrimtalay`/`kitchen2026`;
Admin & Tourist no login. Top bar has a Phone / Tablet-Desktop toggle for the Staff & Provider apps.

## Current build state (2026-07-17)
Tourist app:
- 5-tab bottom nav: Hotel (hotel's shared QR picks) / For You (demographic smart recs) / Explore /
  Community / Ask LOMA (AI guide). Ask LOMA tab icon = loma-white.png.
- Image-forward listing cards (big photo, minimal text); rich detail on the detail page.
- Provider detail (tourist + staff) shows: Social links row (FB/IG/TikTok) and a MOCK TikTok
  review video player. Both DEMO only.
- Community detail has a swipeable multi-image photo gallery.
- Ask LOMA chat: input is a sticky multi-line textarea (wraps; pinned to the bottom; chat scrolls above it).
- First-visit profile (gender/age/nationality) is OPTIONAL — has "Skip for now"; asks again next session.
- Hotel concierge chatbot fully REMOVED.
Staff app:
- Provider can set a TikTok place link and/or pin 3 review-clip URLs (provider profile editor).
- Tablet/Desktop view de-distorted (compact search bar, no oversized map, clean card grid).
  TODO to fully match the pitch slide: add the left sidebar.
- Removed for the demo: guided-trip planner, home quick-access tiles, "Today's picks" section,
  redundant hotel-picks button, and the "Family Friendly" + duplicate "Open Now" quick-intent chips.

## Data-model fields to wire in production
- `p.social = {facebook, instagram, tiktok}` — real per-shop profile URLs (DEMO uses search URLs).
- `p.tiktok_place` — TikTok place/location URL; auto-pull the top clips from it.
- `p.reviewClips[]` — up to 3 owner-pinned TikTok video URLs; if set, use these instead of auto-pull.
- The mock video player's `.poster` becomes a real <video>/TikTok embed sourced from the above.
Privacy note: LOMA plans to SHARE anonymized data with the public sector — do NOT add
"never shared/never sold" claims.

## Package contents
LOMA.html · DEV_HANDOFF.md · LOMA_v2_CHANGES.md (architecture/spec) · LOMA_Pitch_Script.md ·
LOMA_Judge_QA_Prep.md · LOMA_Pitch_Deck.pdf/.pptx · data/ (generated seed data + gen script) ·
loma_cbt_seed.json · LOMA_provider_seed_CBT.xlsx · LOMA_provider_leads_tiktok.xlsx ·
enrich_cbt_google_places.py · _cbt_seed_inject.js · brand assets (loma-white.png + artwork/).
(~28 MB of AI exploration images were left out to keep this small — ask Joe for the full artwork/.)
