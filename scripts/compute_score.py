#!/usr/bin/env python3
"""Compute the LOMA score for every provider and store it on the row.

    score = hiddenness × cultural × quality × confidence²

Precomputed and written to `provider.data->'loma_score'` for the same reason
`review_analysis` and `setting` are: so there is ONE answer, in one place, and every
client just reads it. Computing this per request would be O(n²) (hiddenness needs a
catalog-wide neighbourhood pass); computing it in the browser would mean a third
independent implementation of a scoring engine.

WHY A PRODUCT, NOT A SUM
  The engine this replaces added five near-constant dimensions together, which let a
  good location excuse a safety complaint and produced a number nobody could act on.
  In a product a near-zero anywhere sinks the result and nothing buys it back: a Nordic
  bistro with a flawless 5.0 rating still scores 2.06, because cultural = 0.10.

THE ONLY HARD GATE
  Closed, or a high-severity complaint a real customer wrote. Everything else ranks —
  nothing is excluded for being uninteresting.

Usage:
    python scripts/compute_score.py --dry-run
    python scripts/compute_score.py
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import os
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "loma-app", "logging-api"))
from db import get_conn, PROVIDER_TABLE  # noqa: E402

MODEL_VERSION = "loma-score-1"

# A product opinion about how much Thai-ness matters — not a measurement. The most
# arguable constants here, and the easiest to tune.
CULTURAL_FIT = {
    "thai_traditional": 1.00,
    "thai_modern": 0.85,
    "cannot_tell": 0.35,      # unknown is uncertainty, so it damps — it does not delete
    "international": 0.10,
    "expat_tourist_oriented": 0.05,
    None: 0.30,               # never judged (no reviews to read)
}
SEV_PENALTY = {"high": 0.15, "medium": 0.55, "low": 0.85}
NEIGHBOUR_RADIUS_KM = 0.5
CONF_CAP = 0.55               # Google returns 5 relevance-picked reviews. That is the ceiling.


def km(a_lat, a_lng, b_lat, b_lng):
    dlat = math.radians(b_lat - a_lat)
    dlng = math.radians(b_lng - a_lng)
    x = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(a_lat)) * math.cos(math.radians(b_lat)) * math.sin(dlng / 2) ** 2)
    return 2 * 6371.0 * math.asin(math.sqrt(x))


def blocked_reason(p) -> str | None:
    if (p["bs"] or "OPERATIONAL") in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"):
        return "closed"
    for x in p["pr"]:
        if (x.get("complaint") or {}).get("severity") == "high":
            return "high_severity_complaint"
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with get_conn() as conn:
        rows = conn.execute(f"""
            SELECT id, category, data->>'business_status' AS bs,
                   (data->>'lat')::float AS lat, (data->>'lng')::float AS lng,
                   COALESCE((data->>'reviews')::numeric, 0)::float AS reviews,
                   (data->>'rating')::numeric AS rating,
                   data->'review_analysis' AS ra
            FROM {PROVIDER_TABLE} WHERE data->>'lat' IS NOT NULL
        """).fetchall()

    P = []
    for r in rows:
        ra = r["ra"] or {}
        P.append({**r, "pr": ra.get("per_review") or [],
                  "cl": (ra.get("cultural_locality") or {}).get("verdict")})
    print(f"catalog: {len(P)} providers with coordinates")

    # ---- neighbourhood attention: how much tourist attention the surrounding 500m gets.
    # Free — our own coordinates. This is what replaces the (category × area) peer group
    # that buried 76 of 101 results in Old Town and could not rank 56 places at all.
    cells = collections.defaultdict(list)
    for p in P:
        cells[(round(p["lat"], 2), round(p["lng"], 2))].append(p)
    for p in P:
        near = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                near += cells.get((round(p["lat"], 2) + dy * 0.01,
                                   round(p["lng"], 2) + dx * 0.01), [])
        p["nb_attention"] = sum(
            q["reviews"] for q in near
            if q is not p and km(p["lat"], p["lng"], q["lat"], q["lng"]) <= NEIGHBOUR_RADIUS_KM)

    att = sorted(p["nb_attention"] for p in P)
    qs = [att[int(len(att) * f)] for f in (.2, .4, .6, .8)]
    for p in P:
        p["band"] = sum(1 for t in qs if p["nb_attention"] > t)

    # ---- expected exposure for (category, density band) -> residual
    grp = collections.defaultdict(list)
    for p in P:
        grp[(p["category"], p["band"])].append(math.log10(p["reviews"] + 1))
    med = {k: statistics.median(v) for k, v in grp.items() if len(v) >= 5}
    overall = statistics.median([math.log10(p["reviews"] + 1) for p in P])

    for p in P:
        exp = med.get((p["category"], p["band"]), overall)
        act = math.log10(p["reviews"] + 1)
        h_raw = exp - act
        p["hiddenness"] = 1 / (1 + math.exp(-1.2 * h_raw))
        p["h_raw"] = h_raw

        p["cultural"] = CULTURAL_FIT.get(p["cl"], 0.30)

        pr = p["pr"]
        if pr:
            s = sum({"positive": 1.0, "mixed": 0.5, "negative": 0.0}.get(x.get("polarity"), .5)
                    for x in pr) / len(pr)
        else:
            s = ((float(p["rating"]) - 3.0) / 2.0) if p["rating"] else 0.5
        sev = [(x.get("complaint") or {}).get("severity") for x in pr if x.get("complaint")]
        p["quality"] = max(0.0, min(1.0, s)) * min([SEV_PENALTY.get(x, 1.0) for x in sev], default=1.0)

        # Replaces the 60-review floor that excluded 114 places. Thin evidence damps
        # instead of deleting; squared because linear was not enough — a 7-review place
        # reached #47 of 1,043 on a perfect record.
        vol = min(1.0, math.log10(p["reviews"] + 1) / 2.3)
        ev = min(1.0, len(pr) / 5)
        p["confidence"] = min(CONF_CAP, 0.15 + 0.5 * vol * (0.4 + 0.6 * ev))

        p["blocked"] = blocked_reason(p)
        p["score"] = (None if p["blocked"] else
                      round(100 * p["hiddenness"] * p["cultural"] * p["quality"]
                            * p["confidence"] ** 2, 2))

    scored = [p for p in P if p["score"] is not None]
    order = sorted(scored, key=lambda x: -x["score"])
    n = len(order)
    for i, p in enumerate(order):
        p["rank"] = i + 1
        # Four sub-1.0 multipliers compound, so the raw top is ~25, not ~90. Fine for
        # ordering, misleading as "24.87 out of 100" — so ship a percentile to display.
        p["percentile"] = round(100 * (n - i) / n)

    print(f"scored: {len(scored)}   held: {len(P)-len(scored)}")
    held = collections.Counter(p["blocked"] for p in P if p["blocked"])
    for k, v in held.most_common():
        print(f"  held · {k:26} {v}")

    print("\ntop 8:")
    for p in order[:8]:
        print(f"  {p['percentile']:3}  score {p['score']:6.2f}  {p['category'][:18]:18} "
              f"h={p['hiddenness']:.2f} c={p['cultural']:.2f} q={p['quality']:.2f} "
              f"conf={p['confidence']:.2f}  {p['id']}")

    if args.dry_run:
        print("\n(dry run — nothing written)")
        return

    with get_conn() as conn:
        for p in P:
            rec = {
                "score": p["score"],
                "percentile": p.get("percentile"),
                "rank": p.get("rank"),
                "of": n,
                "blocked": p["blocked"],
                "factors": {
                    "hiddenness": round(p["hiddenness"], 3),
                    "cultural": p["cultural"],
                    "quality": round(p["quality"], 3),
                    "confidence": round(p["confidence"], 3),
                },
                "explain": {
                    "h_raw": round(p["h_raw"], 3),
                    "neighbour_attention": int(p["nb_attention"]),
                    "density_band": p["band"],
                    "cultural_verdict": p["cl"],
                    "evidence_reviews": len(p["pr"]),
                },
                "model_version": MODEL_VERSION,
            }
            conn.execute(
                f"UPDATE {PROVIDER_TABLE} SET data = jsonb_set(data, '{{loma_score}}', %s::jsonb) "
                f"WHERE id = %s", (json.dumps(rec, ensure_ascii=False), p["id"]))
    print(f"\nwrote loma_score to {len(P)} providers  (model {MODEL_VERSION})")


if __name__ == "__main__":
    main()
