#!/usr/bin/env python3
"""Deterministic attribute detection — halal + indoor/outdoor. No LLM.

Both attributes are keyword/type rules, so they belong in the rule engine, not the
model ("AI reads and explains. Rules calculate and decide." — updated_instructions.md:840).

HALAL — tiered by how strong the evidence is:
    google_type    Google itself classifies the place "Halal Restaurant"
    declared       the business puts halal/ฮาลาล/حلال in its OWN name
    directory      an existing TAT dietary tag
    review_mention reviewers say halal  -> WEAK: queue for verification, never a filter

  Negation is real ("Not Halal" appears verbatim in our review data), so every keyword
  hit is checked for a preceding negator before it counts.

SETTING — honest 3-way from Google's type, replacing the regex in enrich_batch.py:58
  that forced every `restaurant|food|cafe` to "indoor" (66 of 94 street-food stalls were
  labelled indoor). Ambiguous types now resolve to "unknown", NOT "indoor":
  unknown ≠ no ≠ yes (updated_instructions.md:849). rainyOk() already falls back to a
  category proxy for unknown, so honesty costs nothing here.

  A restaurant can be open-air or air-conditioned and its TYPE cannot tell you which —
  only review text can, and that override lands once analyze_reviews.py has run.

Usage:
    python scripts/detect_attributes.py --dry-run
    python scripts/detect_attributes.py            # writes dietary_detected / setting
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import date
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "loma-app", "logging-api"))
from db import get_conn, PROVIDER_TABLE  # noqa: E402

# ---- halal ----------------------------------------------------------------
HALAL = re.compile(r"halal|ฮาลาล|حلال", re.I)
# a negator within ~24 chars before the keyword flips the hit
NEGATOR = re.compile(r"(not|non|no|isn'?t|aren'?t|without|ไม่ใช่|ไม่มี|ไม่)\s*[-–]?\s*$", re.I)


def halal_hits(text: str) -> tuple[int, int]:
    """Return (affirmed, negated) keyword-hit counts for one blob of text."""
    if not text:
        return 0, 0
    aff = neg = 0
    for m in HALAL.finditer(text):
        window = text[max(0, m.start() - 24):m.start()]
        if NEGATOR.search(window):
            neg += 1
        else:
            aff += 1
    return aff, neg


def detect_halal(row: dict[str, Any]) -> dict[str, Any] | None:
    name = row["name"] or ""
    ptype = (row["data"].get("primaryType") or "")
    summary = (row["data"].get("summary") or "")
    reviews = row["data"].get("reviews_text") or []
    already = "halal" in (row["data"].get("dietary") or [])

    sources: list[str] = []
    evidence: list[str] = []
    negated = 0

    a, n = halal_hits(ptype)
    negated += n
    if a:
        sources.append("google_type")
        evidence.append(f"primaryType: {ptype}")

    a, n = halal_hits(name)
    negated += n
    if a:
        sources.append("name")
        evidence.append(f"name: {name}")

    a, n = halal_hits(summary)
    negated += n
    if a:
        sources.append("summary")
        evidence.append(f"summary: {summary[:80]}")

    rev_aff = 0
    for i, rv in enumerate(reviews):
        a, n = halal_hits(rv.get("text") or "")
        negated += n
        if a:
            rev_aff += 1
            if len(evidence) < 6:
                evidence.append(f"review[{i}]")
    if rev_aff:
        sources.append("review_mention")

    if already and "directory" not in sources:
        sources.append("directory")
        evidence.append("existing TAT dietary tag")

    if not sources:
        return None

    # strongest tier wins; only the top three may promote into p.dietary
    for tier in ("google_type", "name", "directory", "review_mention"):
        if tier in sources:
            top = "declared" if tier == "name" else tier
            break

    return {
        "tier": top,
        "sources": sources,
        "evidence": evidence,
        "review_mentions": rev_aff,
        "negated_mentions": negated,
        "filter_eligible": top in ("google_type", "declared", "directory"),
        "detected_at": date.today().isoformat(),
    }


# ---- setting --------------------------------------------------------------
# Only types whose setting is genuinely unambiguous. Everything else -> unknown.
# \b matters: without it `market` matches "Supermarket" and `park` matches "Parking".
OUTDOOR = re.compile(
    r"\b(beach|market|viewpoint|view point|park|marina|pier|harbou?r|garden|"
    r"waterfall|zoo|farm|campground|island|bay|cape|forest)\b|"
    r"ตลาด|หาด|สวน|จุดชมวิว|ท่าเรือ|น้ำตก|เกาะ|อ่าว|แหลม|ฟาร์ม", re.I)
INDOOR = re.compile(
    r"\b(shopping mall|mall|museum|gallery|cinema|theater|theatre|spa|massage|"
    r"hotel|resort|supermarket|store|clinic|gym|pharmacy)\b|"
    r"ห้างสรรพสินค้า|พิพิธภัณฑ์|โรงภาพยนตร์|สปา|นวด|โรงแรม|ซูเปอร์มาร์เก็ต|คลินิก", re.I)


# Categories we assert as indoor without needing per-place evidence. Measured over a
# 200-place sample: Massage & Wellness came back 96% rain-OK (20 indoor / 7 mixed /
# 1 outdoor), Souvenir 100%. Every other category is a coin-flip or worse and must be
# decided per place — notably Seafood, which reviews put at 19 outdoor vs 2 indoor.
INDOOR_CATEGORIES = {"Massage & Wellness", "Souvenir & Local Product"}


def review_verdict(votes: Counter) -> tuple[str | None, int]:
    """Aggregate per-review setting votes. "mixed" DOMINATES a bare majority.

    A reviewer saying "indoor" is reporting where they sat — not claiming the venue has
    no terrace. Only "mixed" is a claim about the whole place, so it carries strictly
    more information and must not be outvoted. Likewise indoor+outdoor votes together
    are themselves evidence of both, not a contradiction to be resolved by counting.

    Ground truth for this: Dou Brew (indoor x3, mixed x2) — a reviewer wrote "seating
    inside under the ac ... or outside"; and Wanlamun (indoor x2, outdoor x1) where the
    outvoted review said "this large open air dessert shop" and the majority said
    "a simple dining room". Both are true. Both places are mixed.
    """
    if not votes:
        return None, 0
    if votes.get("mixed") or ("indoor" in votes and "outdoor" in votes):
        return "mixed", sum(votes.values())
    return votes.most_common(1)[0]


def detect_setting(row: dict[str, Any], review_src: dict[str, Any] | None = None) -> tuple[str, str]:
    """(setting, source). Precedence:
    reviews -> indoor-category -> unambiguous type -> photo -> unknown.

    Photo sits second-to-last on purpose: measured at 86% exact / 89% rain-OK but ONLY
    when it commits to indoor/outdoor (its "mixed" verdicts scored 16% — noise, and
    photo_setting.py refuses to store them). Reviews and types are better evidence, so
    the photo only ever fills silence.
    """
    ptype = row["data"].get("primaryType") or ""
    cat = row.get("category") or ""
    ra = (review_src or {}).get(row["id"]) or row["data"].get("review_analysis") or {}
    votes = Counter(
        (p.get("signals") or {}).get("setting")
        for p in ra.get("per_review") or []
        if (p.get("signals") or {}).get("setting")
    )

    v, n = review_verdict(votes)
    if v:
        if cat in INDOOR_CATEGORIES:
            # the category default is strong, so only a clear multi-review signal beats
            # it — a beachside sala massage is real, one passing mention is not enough
            if n >= 2 and v != "indoor":
                return v, f"reviews(x{n})_override_category"
            return "indoor", f"category:{cat}"
        if n >= 2 or len(votes) == 1:
            return v, f"reviews(x{n})"

    if cat in INDOOR_CATEGORIES:
        return "indoor", f"category:{cat}"

    # INDOOR first: "Supermarket"/"Store" are retail even though they read market-ish
    if INDOOR.search(ptype):
        return "indoor", f"type:{ptype}"
    if OUTDOOR.search(ptype):
        return "outdoor", f"type:{ptype}"

    ps = row["data"].get("photo_setting") or {}
    if ps.get("accepted"):
        return ps["verdict"], f"photo:{ps.get('confidence','?')}"

    # Restaurant / Cafe / Coffee Shop cannot be resolved from a type token — a Phuket
    # kitchen is as likely open-air as air-conditioned. Nothing spoke, so: unknown.
    return "unknown", "no_evidence"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--review-json", help="read review_analysis from an analyze_reviews "
                                          "--out dump instead of the DB (for dry runs)")
    args = ap.parse_args()

    review_src = {}
    if args.review_json:
        with open(args.review_json, encoding="utf-8") as fh:
            review_src = json.load(fh)
        print(f"using review labels from {args.review_json} ({len(review_src)} places)\n")

    with get_conn() as conn:
        rows = conn.execute(
            f"SELECT id, name, category, data FROM {PROVIDER_TABLE} ORDER BY id").fetchall()

    halal_found: dict[str, dict[str, Any]] = {}
    setting_new: dict[str, tuple[str, str]] = {}
    changed_setting = 0
    for r in rows:
        h = detect_halal(r)
        if h:
            halal_found[r["id"]] = h
        s, src = detect_setting(r, review_src)
        setting_new[r["id"]] = (s, src)
        if s != (r["data"].get("setting") or "unknown"):
            changed_setting += 1

    # ---- report ----
    print(f"scanned {len(rows)} providers\n")
    print("=== HALAL ===")
    tiers = Counter(h["tier"] for h in halal_found.values())
    print(f"  detected on {len(halal_found)} providers (was 11 tagged)")
    for t, n in tiers.most_common():
        gate = "filter-eligible" if t in ("google_type", "declared", "directory") else "QUEUE ONLY (weak)"
        print(f"    {t:16} {n:3}   {gate}")
    elig = sum(1 for h in halal_found.values() if h["filter_eligible"])
    print(f"  -> {elig} promote to p.dietary; {len(halal_found)-elig} go to the verification queue")
    neg = sum(h["negated_mentions"] for h in halal_found.values())
    print(f"  negated keyword hits ignored: {neg}")
    print("  sample:")
    for pid, h in list(halal_found.items())[:6]:
        print(f"    {pid:10} {h['tier']:14} {h['evidence'][0][:56]}")

    print("\n=== SETTING ===")
    old = Counter((r["data"].get("setting") or "(absent)") for r in rows)
    new = Counter(s for s, _ in setting_new.values())
    print(f"  before: {dict(old)}")
    print(f"  after : {dict(new)}")
    print(f"  changed: {changed_setting}")
    src = Counter(s.split(":")[0].split(" ")[0] for _, s in setting_new.values())
    print(f"  by source: {dict(src)}")

    if args.dry_run:
        print("\n(dry run — nothing written)")
        return

    with get_conn() as conn:
        for pid, h in halal_found.items():
            conn.execute(
                f"UPDATE {PROVIDER_TABLE} SET data = jsonb_set(data, '{{dietary_detected}}', %s::jsonb) "
                f"WHERE id = %s", (json.dumps({"halal": h}, ensure_ascii=False), pid))
            if h["filter_eligible"]:
                conn.execute(
                    f"""UPDATE {PROVIDER_TABLE}
                        SET data = jsonb_set(data, '{{dietary}}',
                            COALESCE(data->'dietary','[]'::jsonb) || '["halal"]'::jsonb)
                        WHERE id = %s AND NOT COALESCE(data->'dietary','[]'::jsonb) ? 'halal'""",
                    (pid,))
        for pid, (s, src_) in setting_new.items():
            conn.execute(
                f"UPDATE {PROVIDER_TABLE} SET data = jsonb_set("
                f"  jsonb_set(data, '{{setting}}', %s::jsonb), '{{setting_source}}', %s::jsonb), "
                f"  updated_at = now() WHERE id = %s",
                (json.dumps(s), json.dumps(src_), pid))
    print(f"\nwrote: {len(halal_found)} dietary_detected, {len(setting_new)} setting")


if __name__ == "__main__":
    main()
