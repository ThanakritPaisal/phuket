# LOMA — handover to engineering

**LOMA is an AI-powered local tourism distribution system for Phuket.** It helps local SMEs and community tourism providers reach tourists through trusted touchpoints — hotels, guesthouses, villa managers and frontline staff.

> *LOMA turns tourist questions into measurable local income.*

---

## Run it

```bash
open LOMA-prototype.html      # that's it — no build, no server, no install
```

It is **one self-contained HTML file**. Vanilla JS, no framework, no backend, no database, no bundler. Double-click and it runs.

The three PNGs must sit **next to** the HTML (the file references them by relative path). Everything else — photos — loads from Unsplash / loremflickr over the network, so a first load needs internet.

## Run the tests

```bash
npm install          # installs jsdom only
npm test             # 282 assertions across 14 headless suites
```

Each suite is a plain Node script that boots the page in jsdom, clicks through it like a user, and asserts. `tests/smoke.js` renders all 47 screens across the 4 personas and fails on any JS error.

| suite | what it locks down |
|---|---|
| `acceptance.js` | the 6 demo flows, end to end |
| `smoke.js` | every screen renders, zero console errors |
| `chportal.js` | community host portal (5 tabs) |
| `isotest.js` | **data isolation** — a community host can only ever see its own data |
| `checkin.js` | a booking is not a visit; no-show = ฿0 |
| `econtest.js` | economic-impact valuation method |
| `commtest.js` · `segtest.js` | hotel → community recommendation, tourist receiving it |
| `thaitest.js` | bilingual concierge (Thai + typo tolerance) |
| `mergetest.js` · `fixtest.js` · `bookmgmt.js` · `themetest.js` · `themecheck.js` | staff Find flow, sticky QR bar, booking management, theme |

---

## Demo credentials

| role | user | pass |
|---|---|---|
| Hotel staff | `seabreeze` | `breeze2026` |
| Hotel staff | `katahostel` | `kata2026` |
| Local business | `baanrimtalay` | `kitchen2026` |
| Community host | `bangrong` | `bangrong2026` |
| Community host | `kohlonecbt` | `kohlone2026` |
| Admin · Tourist | — | no login |

Six community hosts exist, one per community. They are listed on the provider sign-in screen.

---

## Where the logic lives

Everything is in `LOMA-prototype.html`. Search for these section banners:

| section | what it does |
|---|---|
| `LOMA AI CURATION ENGINE` | the 5 scoring dimensions, hidden-gem rule, status machine, freshness loop |
| `TRACKING EVENTS + HOTEL IMPACT CREDITS` | event log, points, multipliers, tiers, anti-gaming |
| `ESTIMATED LOCAL ECONOMIC IMPACT` | valuation without trusting a shop to type a number |
| `RECOMMENDATION LISTS + QR LINKS` | assisted (per-guest) and passive (hotel-wide) QR |
| `COMMUNITY HOST PORTAL` | the 5 community screens + data isolation guard |
| `SHARED AI / IMPACT UI PRIMITIVES` | badges, score bars, AI explanation box |

`state` is a single module-scoped object. Each persona has a screen map and a render function (`renderStaff`, `renderTourist`, `renderProvider`, `renderAdmin`). All interaction goes through **one** delegated click listener on `document.body`, keyed on `data-*` attributes.

## If you port this to a real stack

The in-memory data uses the **exact field names** a real schema would, so the mapping is 1:1:

- `providers` → `source_type`, `locality_score`, `quality_score`, `visibility_gap_score`, `readiness_score`, `risk_score`, `overall_loma_score`, `status`, `freshness_status`, `last_checked_at`, `last_verified_at`, `ai_summary`
- `tracking_events` → `TRACKING_EVENTS[]` (`event_type`, `hotel_id`, `staff_id`, `provider_id`, `community_id`, `recommendation_list_id`, `tourist_session_id`, `credits`, `counted`, `flagged`)
- `recommendation_lists` → `RECOMMENDATION_LISTS[]` (`kind: assisted | passive`)
- `community_experiences` → `COMMUNITIES[]` + `readiness_level` + `CLOSED_ROUNDS`
- `hotel_favorites` → `SAVED`
- `hotel_faq` → `HOTEL_INFO`

Read `LOMA_v2_CHANGES.md` for the scoring maths and the impact-credit formula.

---

## Things that are deliberately NOT real

Say these out loud rather than discovering them later:

- **All provider data is seed/mock.** The 5 showcase hidden gems are flagged `seed: true`.
- **The AI scoring is deterministic rules, not a model.** That is intentional — it is fully explainable and auditable. The roadmap is NLP over review text, and a recommendation engine trained on tourist demographics × time-of-day.
- **The concierge chatbot is keyword rules**, not an LLM. It is bilingual (EN/TH) and typo-tolerant.
- **There is no auth, no backend, no persistence.** Reloading the page resets everything.
- Photos come from public stock APIs and are not licensed for production.
