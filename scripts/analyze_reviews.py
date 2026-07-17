#!/usr/bin/env python3
"""Phase 1 — review analysis: turn stored Google review bodies into structured,
evidence-cited labels in `provider.data->'review_analysis'`.

Contract (see updated_instructions.md): **Gemini labels and explains; rules count and
decide.** This script never emits a score. It emits per-review labels + one grounded
`why_visit` blurb; `scoring.ts` derives sentiment/strengths/risk/confidence from them.

Guardrails enforced by the validator (deterministic, not the model):
  - every claim cites the review index it came from (out-of-range -> reject)
  - no accessibility claims        (updated_instructions.md:1342 — banned outright)
  - no price assertions            (updated_instructions.md:1193)
  - no ownership conclusions       (reviews are WEAK evidence — lines 34-38)
  - no superlatives in why_visit   (line 1003 rejects marketing copy)
Review text NEVER satisfies a hard filter: `signals` are weak evidence for ranking,
display and the verification queue only.

Skips permanently/temporarily closed providers (line 283 makes "not closed" a
hard-required field) — they must not be recommended, so they must not be described.

Usage:
    python scripts/analyze_reviews.py --limit 30 --dry-run   # pilot, writes nothing
    python scripts/analyze_reviews.py                        # full run, writes DB
    python scripts/analyze_reviews.py --force                # re-analyse everything
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "loma-app", "logging-api"))
from db import get_conn, PROVIDER_TABLE  # noqa: E402
from psycopg.types.json import Json  # noqa: E402

SCHEMA_VERSION = 2   # v2 adds cultural_locality; bumping re-runs every provider
VALIDATOR_VERSION = 2
MODEL = "gemini-2.5-flash"
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# ---- closed enums: countable output, and the model cannot invent categories ----
ASPECTS = ["food_quality", "service", "value", "atmosphere", "cleanliness",
           "authenticity", "wait_time", "staff_language"]
COMPLAINTS = ["overcharging", "scam", "hygiene", "safety", "rude_service",
              "long_wait", "misleading_info", "closed_unexpectedly"]
# Matches the `Setting` union in src/types.ts — "mixed" is rain-OK per rainyOk().
SETTINGS = ["indoor", "outdoor", "mixed"]
DIETARY = ["halal", "vegetarian", "vegan"]
LOCAL = ["family_run", "where_locals_eat", "traditional_recipe",
         "local_ingredients", "long_established"]
POLARITY = ["positive", "mixed", "negative"]
# "mixed" is real: reviewers say "food good but inconsistent". Pilot rejected it.
ASPECT_POLARITY = ["positive", "negative", "mixed"]
SEVERITY = ["low", "medium", "high"]

# Cultural locality — SEPARATE from ownership, and that distinction is the whole point.
#   ownership ("who owns this?")  -> reviews are weak evidence; banned (spec line 18-38)
#   cultural  ("what is served?") -> reviews are STRONG evidence, and LOMA's own locality
#                                    definition includes "uses local products, ingredients,
#                                    craft or knowledge" and "distinctive local identity,
#                                    not generic tourist business" (hidden_gem_instructions
#                                    .md:33-42) — all readable from what customers describe.
# Conflating the two is what let a Nordic bistro rank #1 as a local hidden gem.
CULTURAL = ["thai_traditional", "thai_modern", "international",
            "expat_tourist_oriented", "cannot_tell"]
CONFIDENCE = ["high", "medium", "low"]
# an ownership claim in the cultural verdict is a contract violation, not a style nit
OWNERSHIP_CLAIM = re.compile(
    r"\b(owned|owner|ownership|family[- ]run|locally[- ]owned|proprietor|runs? the business)\b", re.I)

# ---- validator patterns ----
SUPERLATIVE = re.compile(
    r"\b(best|worst|amazing|incredible|must[- ]visit|must[- ]try|unforgettable|"
    r"world[- ]class|finest|ultimate|perfect|stunning|legendary)\b", re.I)
ACCESSIBILITY = re.compile(r"\b(wheelchair|accessible|accessibility|ramp|disabled|step[- ]free)\b", re.I)
PRICE_CLAIM = re.compile(r"(฿\s*\d|\b\d+\s*(baht|thb)\b|\b\d+\s*-\s*\d+\s*(baht|thb)\b)", re.I)
MAX_WHY_VISIT = 300
# The prompt asks for <= 100 chars; allow headroom so a slightly long phrase does not
# throw away an otherwise good analysis (the pilot lost 6/30 to a 15-words vs 120-chars
# unit mismatch between prompt and validator).
MAX_PHRASE = 160


def build_prompt(name: str, category: str, reviews: list[dict[str, Any]]) -> str:
    lines = []
    for r in reviews:
        stars = r.get("rating")
        lines.append(f"[{r['index']}] ({stars}★) {r['text']}")
    body = "\n\n".join(lines)
    return f"""You are labelling customer reviews for a Phuket tourism catalog. Reply with ONLY JSON.

BUSINESS: {name}
CATEGORY: {category}

REVIEWS (each prefixed with its index):
{body}

Return this exact JSON structure:
{{
  "per_review": [
    {{
      "index": <the review's index, integer>,
      "polarity": one of {POLARITY},
      "lang": ISO-639-1 code of the review language, e.g. "en" or "th",
      "aspects": [{{"aspect": one of {ASPECTS},
                   "polarity": one of {ASPECT_POLARITY},
                   "phrase": "AT MOST 100 CHARACTERS, paraphrasing what THIS review said about that aspect"}}],
      "complaint": null OR {{"type": one of {COMPLAINTS}, "severity": one of {SEVERITY}}},
      "signals": {{
        "setting": one of {SETTINGS} or null,
        "dietary": subset of {DIETARY},
        "local": subset of {LOCAL}
      }}
    }}
  ],
  "why_visit": {{
    "text": "one or two plain sentences on why a tourist might go, grounded ONLY in these reviews",
    "evidence": [<indices of the reviews that support the text>]
  }},
  "cultural_locality": {{
    "verdict": one of {CULTURAL},
    "confidence": one of {CONFIDENCE},
    "evidence": ["each item MUST name a specific dish, ingredient, craft or practice
                  the reviews actually mention — not an adjective, not the business name"],
    "reason": "at most 15 words"
  }}
}}

CULTURAL LOCALITY — judge WHAT IS SERVED OR MADE, never who owns it:
- "thai_traditional": Thai / Phuket / regional Thai food, traditional recipes, local
  ingredients or local craft. Evidence looks like: Khao Soy, Hokkien mee, Kanom Jeen,
  moo hong, southern curry, batik, local dessert.
- "thai_modern": Thai identity, contemporary presentation (modern Thai cafe, Thai-leaning fusion).
- "international": primarily non-Thai (Italian, Nordic, steakhouse, Japanese, burgers, brunch).
- "expat_tourist_oriented": built for foreign visitors — western breakfast, sports bar,
  generic beach cafe with no Thai identity.
- "cannot_tell": the reviews never describe what is served or made.
A Thai-sounding NAME is not evidence. A Thai dish being served IS evidence.

HARD RULES — breaking any of these makes the output unusable:
1. Only label what a review actually says. Never infer, never generalise, never invent.
2. NEVER mention wheelchair access, accessibility, ramps or step-free entry. Not even if a review does.
3. NEVER state a price, price level or currency amount. The "value" aspect is for
   sentiment about value-for-money only.
4. NEVER conclude the business is locally owned — not in "cultural_locality", not anywhere.
   Ownership is not knowable from reviews and is not being asked. "family_run" is a weak
   signal a reviewer implied, not a fact you are asserting.
5. why_visit must contain NO superlatives (no "best", "amazing", "must-visit").
   Write like a guidebook stating facts, not an advert. Max {MAX_WHY_VISIT} characters.
   Good: "A family-run kitchen where reviewers repeatedly mention fresh seafood cooked to order."
   Bad:  "The best and most amazing restaurant in Phuket."
6. Only include an entry in "signals" when a review explicitly indicates it. Otherwise
   use null / empty list. Unknown is not the same as no.
7. Include one per_review entry for every index shown above, and no others.
"""


def call_gemini(prompt: str, retries: int = 3) -> dict[str, Any]:
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            # 5 reviews x several aspects overruns 2048 and the JSON arrives truncated,
            # which surfaces as an unfixable parse error rather than a clean failure.
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                f"{ENDPOINT}?key={GEMINI_KEY}",
                data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
            cand = d["candidates"][0]
            if cand.get("finishReason") not in (None, "STOP"):
                raise ValueError(f"bad finishReason: {cand.get('finishReason')}")
            raw = cand["content"]["parts"][0]["text"].strip()
            raw = re.sub(r"^```(json)?|```$", "", raw, flags=re.I | re.M).strip()
            return json.loads(raw)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 503):          # rate limit / transient -> back off
                time.sleep(2 ** attempt * 2)
                continue
            raise
        except Exception as e:                      # noqa: BLE001 - malformed JSON etc
            last = e
            time.sleep(1 + attempt)
    raise RuntimeError(f"gemini failed after {retries} attempts: {last}")


def repair(out: dict[str, Any]) -> list[str]:
    """Fix cosmetic problems in place; return what was repaired.

    Length is not a correctness failure. LLMs cannot count characters (the pilot saw a
    498-char "phrase" against a 100-char instruction), and throwing away a whole
    provider's analysis over a long string is disproportionate. Truncate those; reserve
    rejection for claims that are actually wrong or unsafe.
    """
    fixed: list[str] = []
    for r in out.get("per_review") or []:
        for a in r.get("aspects") or []:
            ph = a.get("phrase") or ""
            if len(ph) > MAX_PHRASE:
                cut = ph[:MAX_PHRASE].rsplit(" ", 1)[0].rstrip(" ,;:")
                a["phrase"] = cut + "…"
                fixed.append("phrase_truncated")
    wv = out.get("why_visit") or {}
    text = (wv.get("text") or "").strip()
    if len(text) > MAX_WHY_VISIT:
        # keep whole sentences only — a blurb cut mid-clause reads as broken, not terse
        keep = ""
        for sent in re.split(r"(?<=[.!?])\s+", text):
            if len(keep) + len(sent) + 1 > MAX_WHY_VISIT:
                break
            keep = (keep + " " + sent).strip()
        if keep:
            wv["text"] = keep
            fixed.append("why_visit_truncated")
    return fixed


def validate(out: dict[str, Any], valid_idx: set[int]) -> list[str]:
    """Deterministic gate — correctness and safety only. Returns failed checks."""
    fails: list[str] = []
    per = out.get("per_review")
    if not isinstance(per, list) or not per:
        return ["per_review_missing"]

    seen: set[int] = set()
    for r in per:
        i = r.get("index")
        if not isinstance(i, int) or i not in valid_idx:
            fails.append(f"index_out_of_range:{i}")
            continue
        if i in seen:
            fails.append(f"duplicate_index:{i}")
        seen.add(i)
        if r.get("polarity") not in POLARITY:
            fails.append(f"bad_polarity:{r.get('polarity')}")
        for a in r.get("aspects") or []:
            if a.get("aspect") not in ASPECTS:
                fails.append(f"bad_aspect:{a.get('aspect')}")
            if a.get("polarity") not in ASPECT_POLARITY:
                fails.append(f"bad_aspect_polarity:{a.get('polarity')}")
            if ACCESSIBILITY.search(a.get("phrase") or ""):
                fails.append("accessibility_claim_in_phrase")
        c = r.get("complaint")
        if c is not None:
            if c.get("type") not in COMPLAINTS:
                fails.append(f"bad_complaint_type:{c.get('type')}")
            if c.get("severity") not in SEVERITY:
                fails.append(f"bad_severity:{c.get('severity')}")
        sig = r.get("signals") or {}
        if sig.get("setting") not in SETTINGS + [None]:
            fails.append(f"bad_setting:{sig.get('setting')}")
        if not set(sig.get("dietary") or []).issubset(DIETARY):
            fails.append("bad_dietary")
        if not set(sig.get("local") or []).issubset(LOCAL):
            fails.append("bad_local_signal")

    wv = out.get("why_visit") or {}
    text = (wv.get("text") or "").strip()
    if not text:
        fails.append("why_visit_missing")
    else:
        if len(text) > MAX_WHY_VISIT:      # repair() failed to find a sentence boundary
            fails.append("why_visit_unsplittable")
        if SUPERLATIVE.search(text):
            fails.append("why_visit_superlative")
        if ACCESSIBILITY.search(text):
            fails.append("why_visit_accessibility_claim")
        if PRICE_CLAIM.search(text):
            fails.append("why_visit_price_claim")
    ev = wv.get("evidence")
    if not isinstance(ev, list) or not ev:
        fails.append("why_visit_no_evidence")
    elif not set(ev).issubset(valid_idx):
        fails.append("why_visit_evidence_out_of_range")

    cl = out.get("cultural_locality") or {}
    v = cl.get("verdict")
    if v not in CULTURAL:
        fails.append(f"bad_cultural_verdict:{v}")
    if cl.get("confidence") not in CONFIDENCE:
        fails.append(f"bad_cultural_confidence:{cl.get('confidence')}")
    cev = cl.get("evidence") or []
    # a verdict with no named dish/craft is an opinion, not a judgement — refuse it
    if v and v != "cannot_tell" and not cev:
        fails.append("cultural_verdict_without_evidence")
    blob = " ".join([str(x) for x in cev] + [str(cl.get("reason") or "")])
    if OWNERSHIP_CLAIM.search(blob):
        fails.append("cultural_ownership_claim")
    if ACCESSIBILITY.search(blob) or PRICE_CLAIM.search(blob):
        fails.append("cultural_banned_claim")
    return fails


def analyse(row: dict[str, Any]) -> dict[str, Any]:
    """Analyse one provider. Returns the review_analysis record to store."""
    reviews_raw = row["reviews_text"] or []
    reviews = [
        {"index": i, "text": (r.get("text") or "").strip(),
         "rating": r.get("rating"), "time": r.get("time")}
        for i, r in enumerate(reviews_raw)
        if (r.get("text") or "").strip()
    ]
    stamp = date.today().isoformat()
    base = {"schema_version": SCHEMA_VERSION, "source": "google_places",
            "model": MODEL, "analyzed_at": stamp}

    if not reviews:
        return {**base, "status": "unknown", "reason": "no_review_text",
                "evidence_count": 0, "per_review": [], "why_visit": None}

    out = call_gemini(build_prompt(row["name"] or "", row["category"] or "", reviews))
    valid_idx = {r["index"] for r in reviews}
    repairs = repair(out)                       # cosmetic fixes first...
    fails = validate(out, valid_idx)            # ...then judge correctness/safety

    by_idx = {r["index"]: r for r in reviews}
    per_review = []
    for r in out.get("per_review") or []:
        i = r.get("index")
        if i not in by_idx:
            continue
        src = by_idx[i]
        per_review.append({
            "index": i,
            "rating": src["rating"],      # copied: the bundle needs it for the
            "time": src["time"],          # disagreement check + recency weight
            "polarity": r.get("polarity"),
            "lang": r.get("lang"),
            "aspects": r.get("aspects") or [],
            "complaint": r.get("complaint"),
            "signals": r.get("signals") or {"setting": None, "dietary": [], "local": []},
        })

    rec = {
        **base,
        "status": "ok" if not fails else "rejected_validation",
        "evidence_count": len(reviews),
        "languages": sorted({p["lang"] for p in per_review if p.get("lang")}),
        "per_review": per_review,
        "why_visit": out.get("why_visit") if not fails else None,
        "cultural_locality": out.get("cultural_locality") if not fails else None,
        "validation": {"passed": not fails, "checks_failed": fails,
                       "repairs": repairs, "validator_version": VALIDATOR_VERSION},
        "human_review": {"reviewed": False, "reviewer": None,
                         "reviewed_at": None, "verdict": None},
    }
    return rec


def fetch(limit: int | None, force: bool, stratify: bool) -> list[dict[str, Any]]:
    """Return one work item per REAL PLACE, not per row.

    Several rows can share a placeId (e.g. Chillva Market is 4 rows at identical
    coordinates) — data.ts dedupeByPlace() hides that at render, so it never surfaced.
    Analysing per row would burn ~10% of calls re-reading the same reviews and mint
    conflicting blurbs for one place. Analyse once; write to every row that shares it.
    """
    resume = "" if force else \
        "AND COALESCE(data->'review_analysis'->>'schema_version','') <> %(v)s"
    sql = f"""
        SELECT id, name, category, data->>'placeId' AS place_id,
               data->'reviews_text' AS reviews_text
        FROM {PROVIDER_TABLE}
        WHERE jsonb_typeof(data->'reviews_text') = 'array'
          AND jsonb_array_length(data->'reviews_text') > 0
          AND COALESCE(data->>'business_status','OPERATIONAL')
              NOT IN ('CLOSED_PERMANENTLY','CLOSED_TEMPORARILY')
          {resume}
        ORDER BY id
    """
    with get_conn() as conn:
        rows = conn.execute(sql, {"v": str(SCHEMA_VERSION)}).fetchall()

    # collapse by placeId; rows without one are never merged (they are not resolvable)
    groups: dict[str, dict[str, Any]] = {}
    items: list[dict[str, Any]] = []
    for r in rows:
        key = r["place_id"]
        if not key:
            items.append({**r, "ids": [r["id"]]})
            continue
        g = groups.get(key)
        if g:
            g["ids"].append(r["id"])
        else:
            groups[key] = {**r, "ids": [r["id"]]}
            items.append(groups[key])

    collapsed = len(rows) - len(items)
    if collapsed:
        print(f"  collapsed {len(rows)} rows -> {len(items)} unique places "
              f"({collapsed} duplicate rows share a placeId)")

    if stratify and limit:                      # spread the pilot across categories
        buckets: dict[str, list] = {}
        for r in items:
            buckets.setdefault(r["category"], []).append(r)
        out, i = [], 0
        while len(out) < limit and any(len(b) > i for b in buckets.values()):
            for c in sorted(buckets):
                if len(buckets[c]) > i and len(out) < limit:
                    out.append(buckets[c][i])
            i += 1
        return out
    return items[:limit] if limit else items


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=10)
    ap.add_argument("--force", action="store_true", help="re-analyse already-done providers")
    ap.add_argument("--dry-run", action="store_true", help="do not write to the database")
    ap.add_argument("--stratify", action="store_true", help="spread --limit across categories")
    ap.add_argument("--out", help="also dump results to this JSON file")
    args = ap.parse_args()

    if not GEMINI_KEY:
        sys.exit("GEMINI_API_KEY is not set (repo-root .env)")

    rows = fetch(args.limit, args.force, args.stratify)
    print(f"analysing {len(rows)} providers with {args.workers} workers"
          f"{' (dry run — no writes)' if args.dry_run else ''}\n")

    results: list[tuple[list[str], dict[str, Any]]] = []
    errors: list[tuple[str, str]] = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(analyse, r): r for r in rows}
        for n, f in enumerate(as_completed(futs), 1):
            r = futs[f]
            try:
                rec = f.result()
                results.append((r["ids"], rec))     # one analysis -> every row sharing it
                mark = {"ok": "✓", "unknown": "–"}.get(rec["status"], "✗")
            except Exception as e:  # noqa: BLE001
                errors.append((r["id"], str(e)[:100]))
                mark = "!"
            dup = f" (+{len(r['ids'])-1} dup rows)" if len(r["ids"]) > 1 else ""
            print(f"  [{n}/{len(rows)}] {mark} {r['id']}{dup}", flush=True)

    dt = time.time() - t0
    print(f"\ndone in {dt:.1f}s ({dt/max(1,len(rows)):.2f}s/place)")

    if not args.dry_run and results:
        n_rows = 0
        with get_conn() as conn:
            for ids, rec in results:
                for pid in ids:
                    conn.execute(
                        f"UPDATE {PROVIDER_TABLE} SET data = jsonb_set(data, '{{review_analysis}}', %s::jsonb), "
                        f"updated_at = now() WHERE id = %s",
                        (json.dumps(rec, ensure_ascii=False), pid))
                    n_rows += 1
        print(f"wrote review_analysis to {n_rows} rows ({len(results)} unique places)")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump({ids[0]: rec for ids, rec in results}, fh, ensure_ascii=False, indent=1)
        print(f"dumped -> {args.out}")

    ok = sum(1 for _, r in results if r["status"] == "ok")
    rej = sum(1 for _, r in results if r["status"] == "rejected_validation")
    unk = sum(1 for _, r in results if r["status"] == "unknown")
    print(f"\nok={ok}  rejected_validation={rej}  unknown={unk}  errors={len(errors)}")
    for pid, e in errors[:5]:
        print(f"  ! {pid}: {e}")


if __name__ == "__main__":
    main()
