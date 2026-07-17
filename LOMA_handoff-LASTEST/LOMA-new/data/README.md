# LOMA mock data

Seeded, referentially-consistent mock dataset for the LOMA prototype (Phuket). Re-run `gen_loma_data.py` to regenerate identically.

## Files & counts

| File | Records | What it is |
|---|---|---|
| `operators.json` | 200 | Vetted local businesses (supply side) — food, cafés, wellness, experiences, markets, boats, guides, souvenirs, cooking, bars |
| `staff.json` | 50 | Frontline staff (demand side) — concierge, front-desk, rental & tour-desk people who recommend |
| `tourists.json` | 600 | Anonymous tourist profiles — nationality, party type, stay area, interests |
| `recommendations.json` | 2,200 | Core event: staff → operator → tourist, with a 5-stage funnel |
| `transactions.json` | 488 | Confirmed visits that logged spend + commission |

## Relationships (foreign keys)

```
recommendations.operatorId  → operators.id
recommendations.staffId     → staff.id
recommendations.touristId   → tourists.id
transactions.recommendationId → recommendations.id   (only "spent" stage)
transactions.operatorId / staffId / touristId → respective files
```

All FKs verified to resolve with zero dangling references.

## Funnel (matches the prototype's analytics copy)

`shared → opened → directions → visited → spent`

- 76% open rate
- 30% confirmed local visit
- 73% of confirmed visits log a spend amount

## Realism notes

- Operator fields mirror the prototype's `PROVIDERS` schema (`id, name, cat, emo, area, price, quality, locality, readiness, safety, rating, ...`) plus `vettingStatus`, `loma_score`, `mapX/mapY`, and lead/open/visit counts.
- ~70% of operators are `verified`; the rest are `pending` / `needs review` so you can test the vetting UI.
- Nationality mix is weighted to real Phuket inbound (Chinese, Russian, Australian, German, British, Indian…).
- Spend scales with the operator price tier; `localEconomicImpactTHB` = full spend (LOMA keeps it local).

## Wired into the prototype

`LOMA-prototype.html` now loads `data/loma-data.js` (a `window.LOMA_DATA` bundle of all 6 arrays) and the **Admin Dashboard is computed entirely from it** — overview metrics, funnel, provider/partner/category tables, map density, verification queue and feedback all aggregate the live records. The staff / tourist / provider phone demos still use the 6 curated providers for their rich copy and map pins.

Just double-click `LOMA-prototype.html` to use it — `loma-data.js` loads via `<script src>`, which works under `file://` (a `fetch()` of the `.json` files would be blocked there).

### Regenerating

```
python3 data/gen_loma_data.py
```

Rewrites all `.json` files **and** `loma-data.js` from the same seed. To change volume, edit `N_OPERATORS / N_STAFF / N_TOURISTS / N_RECS` at the top.

### Using the raw JSON (real backend / other tools)

```js
const operators = await fetch('./data/operators.json').then(r => r.json());
```

Field names align with the prototype (`cat`, `emo`, `area`, `verified`, the four sub-scores, `rating`, `reviews`).
