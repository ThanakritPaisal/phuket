# LOMA v2 — “AI for Better Tourism Phuket” hackathon build

**Positioning shipped:** LOMA is an **AI-powered local tourism distribution system** — it turns tourist questions into measurable local income. Not a hotel chatbot. Not a directory.

---

## 1. Architecture reality (read this first)

LOMA is a **single self-contained HTML file** — `LOMA-prototype.html` (~3,700 lines). There is **no backend, no database, no framework, no real auth.** Everything is vanilla JS with in-memory state, so it runs by double-clicking the file. Nothing to install, nothing to deploy.

**So section 9 of the spec (migrations / DB tables) was implemented as in-memory data structures using the exact field names from the spec.** The demo behaves identically, and the schema maps 1:1 if you ever move it to a real backend:

| Spec entity | In the code |
|---|---|
| `providers` | `OPS` + `PROVIDERS` + `AI_DISCOVERED` (83 records), unified by `allProviders()` |
| `provider_scores` | fields on each provider: `locality_score`, `quality_score`, `visibility_gap_score`, `readiness_score`, `risk_score`, `overall_loma_score` |
| `provider_nominations` | `source_type` (`ai_discovered` · `hotel_nominated` · `community_nominated` · `self_registered` · `admin_added`) |
| `review_queue_items` | `reviewQueue()` + `queueReason()` |
| `recommendation_lists` / `_items` / `qr_links` | `RECOMMENDATION_LISTS[]`, `createRecList(ids, kind)`, `recUrl()` |
| `tracking_events` | `TRACKING_EVENTS[]` + `trackEvent(type, opts)` |
| `hotel_impact_credits` | `impactCredits()`, `CREDIT_POINTS`, `MULTIPLIERS`, `hotelTier()` |
| `tourist_sessions` | `SESSION_ID` + per-event `tourist_session_id` |
| `hotel_favorites` | `SAVED` |
| `hotel_faq` | `HOTEL_INFO` + `HOTEL_FIELDS` (staff-editable) |
| `community_experiences` | `COMMUNITIES[]` + `readiness_level` |

**Deliberately NOT built** (production concerns, not demo concerns): DB migrations, real auth, LLM API calls, room-night normalisation. Flagged rather than faked.

---

## 2. How the AI scoring works

Deterministic, offline, recomputable. `aiScore(p)` runs over public/mock signals every provider already carries (rating, review count, branch count, hours, contact, language, price, safety). `aiRefresh()` re-runs it for all 83 providers — that's what the **AI Refresh** button in admin calls.

**Five dimensions (0–100):**

| Dimension | Signals | Note |
|---|---|---|
| **Locality** | single branch, locally owned, local sourcing, community connection; franchise names are hard-zeroed | |
| **Quality signal** | review sentiment, rating, enough reviews to trust, owner engagement | |
| **Visibility gap** | `100 − fame`, where `fame = log-scaled review count` calibrated to the catalogue (10 reviews → 0, 700 → 100). +10 if rating ≥ 4.3. −12 if it sits in an obvious tourist zone (Patong/Kata/Karon). | **HIGH = under-discovered** |
| **Tourist readiness** | clear hours, contact channel, stated price, English, photos | |
| **Risk filter** | inverse safety, complaint/fake-review pattern, unclear price, high-risk licensing category | **LOW is good** |

`overall_loma_score = 0.30·Locality + 0.25·Quality + 0.20·VisibilityGap + 0.25·Readiness − 0.30·Risk`

**Hidden Gem badge** requires *all five*: Locality ≥ 78 **and** Quality ≥ 72 **and** VisibilityGap ≥ 55 **and** Readiness ≥ 62 **and** Risk ≤ 25.

> The point that makes this defensible on stage: **popularity earns nothing.** If you weight review volume, the AI just re-ranks TripAdvisor's top — the opposite of “local.” UI copy: *“Quality under-discovered — not just popular.”*

**Status machine:** `ai_discovered` and `self_registered` providers **cannot** go live without a human. They land as `candidate` / `ai_shortlisted` / `needs_human_review` and only become `verified` when an admin approves them.
Current spread: **35 verified · 18 AI-shortlisted · 28 candidates · 2 needs-review**, **29 hidden gems** (top 5 cover Local Food, Café, Massage & Spa, Souvenirs & Crafts, Community Experience).

**Freshness loop:** every provider carries `last_checked_at`, `last_verified_at`, `freshness_status` (fresh / needs_refresh / stale) and `review_signal_status` (improving / stable / declining / risk_detected). The review queue buckets by *reason*, and **AI Refresh** re-scores everything from current signals. This is the answer to *“new shops appear constantly — how do you keep up without humans?”*

---

## 3. How Hotel Impact Credits work

Replaces hidden commission entirely. **A scan is worth almost nothing; a real tourist action is worth a lot.**

**Base points:** `recommendation_created +1` · `qr_generated +1` · `qr_scanned +2` · `provider_card_viewed +3` · `direction_clicked +5` · `contact_clicked +5` · `community_inquiry_clicked +10` · `provider_confirmed_visit +20` · `positive_feedback +10` · `complaint −15`

**Multipliers** (compounded, on provider-linked events): hidden gem ×1.3 · community experience ×1.5 · under-served area ×1.2 · verified provider ×1.1

**Tiers:** Bronze *Local Supporter* (0) → Silver *Local Impact Partner* (250) → Gold *Phuket Local Impact Leader* (600) → Platinum *Community Tourism Champion* (1200). Demo hotel loads at **~440 credits · Silver**.

**Anti-gaming:** scan / view / click / inquiry / visit events count **once per (tourist session, provider)** — repeats are stored but flagged and credited 0. QR generation is capped. Complaints subtract. The admin Impact page and the hotel dashboard both *state on screen* how many repeat events were caught and not credited.

---

## 4. What changed, screen by screen

**New admin sections** (left nav): Provider candidates · AI shortlist · Hidden Gems · Review queue & refresh · Approved providers · Community experiences · Impact & hotel credits.
Every provider card shows the **five score bars**, the **AI explanation**, source channel, freshness pills and risk flags, with Approve / Reject / Suspend / Send-to-review actions.

**Staff (hotel front desk)** — tab bar is now `Find · Recommend · Saved · Impact · Reviews · Partner`
- **Create Assisted Recommendation** (new): category filter → AI-curated list with badges + AI notes → multi-select → **Generate QR / Link** → preview exactly what the guest sees.
- **Hotel Saved Favorites** → **Hotel Local Picks QR** (permanent, for desk / lobby / rooms).
- **Impact** (new): credits, tier + progress bar, six metric tiles, monthly trend, top categories, top providers, leaderboard, anti-gaming explainer.
- Home now leads with the Assisted CTA, the passive-QR shortcut, live credit count, and the line: *“Passive QR helps tourists browse. Assisted recommendation helps tourists decide.”*

**Tourist (no login)** — tabs are now `Recommended · Explore Nearby · Community · Hotel Info`
- **Recommended** (new): the QR landing. “Local picks recommended for you” / “Recommended by this hotel”, hotel name, *No app required*, *No hidden commission*. Shows **only** the staff-selected picks first, then routes out to Explore / Community.
- Provider cards: Hidden Gem / Verified Local / Tourist Ready / Community Experience / Contact Before Visiting badges + a plain-English *Why we picked this*, with tracked **Get Directions** / **Contact**.
- **Community**: contact-first. Readiness status (Information Only → Contactable → Ready to Recommend → Verified Community Experience), a *planned experience* explainer, and **Contact Community** / **Ask Availability** as the primary CTAs. **No “Book Now” anywhere.** The existing booking engine is preserved underneath.
- **Hotel Info** assistant is deliberately secondary — one tab, not the product.

**Provider** — new **self-service editing**: 12 profile fields, their own AI score bars, and *Save & re-score with AI* which immediately moves their **Tourist Readiness** score. Copy makes clear: filling it in proves readiness, it **cannot buy ranking**.

**Copy pass:** every required phrase is in the UI. Every forbidden phrase (“Best restaurant”, “Guaranteed”, “Book now”, “Paid ranking”, commission language) is out.

**Visual:** unchanged — your navy / coral / ivory brand book, DM Serif Display, real LOMA wordmark, coastal login hero.

---

## 5. How to test

Open `LOMA-prototype.html` in a browser. Nothing to install.

**Demo credentials**
- Hotel staff — `seabreeze` / `breeze2026` (also `katahostel` / `kata2026`, `rawairental` / `rawai2026`)
- Provider — `baanrimtalay` / `kitchen2026` (also `oldtownmassage` / `massage2026`, `rawaifisherfolk` / `rawai2026`)
- Admin & Tourist — no login

**The 6 acceptance flows, in demo order**

1. **AI Hidden Gem Curation** — Admin → *AI shortlist · Hidden Gems*. Every card shows Locality / Quality / Visibility Gap / Readiness / Risk + the AI explanation. Hit **Approve & publish** on `Baan Batik Thalang`.
2. **Staff Assisted Recommendation** — Staff → sign in → **Recommend** → pick a category → tick 3 providers → **Generate QR / Link** → **Preview what the tourist sees**. The guest sees only those 3.
3. **Hotel Passive QR** — Staff → **Saved** → **Hotel Local Picks QR** → Preview. Tourist lands on *Recommended by this hotel* and can move across all 4 tabs.
4. **Community Experience** — Tourist → **Community** → open one → programme, duration, price, contact person, *Contact Before Visiting* → **Contact Community**.
5. **Hotel Impact Credit** — do a few tourist Directions / Contact clicks, then Staff → **Impact**. Credits, tier, providers supported, community inquiries, *No hidden commission*.
6. **Freshness Loop** — Admin → **Review queue & refresh**. Filter by Risk detected / Needs refresh / Stale, then hit **AI Refresh all scores**.

**Automated tests**
```
npm install jsdom      # once
node acceptance.js     # 64 assertions across all 6 demo flows  → PASS 64  FAIL 0
node smoke.js          # renders all 47 screens across 4 personas → 0 JS errors
```

---

## 6. Honesty notes for the stage

- All provider data is **seed/mock**. The 5 showcase hidden gems are flagged `seed:true` internally and are **not** presented as independently verified.
- AI scoring is **deterministic rules**, not a trained model. That is the right call for a demo — and it's a *feature* in the pitch: the scoring is fully explainable, which a black-box model is not.
- Say “first-pass AI filter + human confirmation”, not “the AI verifies businesses”. The status machine enforces exactly that.
