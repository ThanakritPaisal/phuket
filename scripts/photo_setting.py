#!/usr/bin/env python3
"""Read indoor/outdoor off the provider photo — for places where reviews said nothing.

WHY THIS IS NARROW. Measured against 202 places whose setting we know from agreeing
reviews, Gemini judging the photo alone scores:

    photo says      n      exact    rain-OK
    indoor         67        85%        90%
    outdoor        18        89%        89%
    mixed          97        16%        55%     <-- noise

All the error is in "mixed": the model sees a terrace through a window and hedges,
while reporting "high" confidence regardless — so confidence is NOT a usable filter,
but the verdict itself is. We therefore accept ONLY indoor/outdoor and throw "mixed"
away. Definite-only scores 86% exact / 89% rain-OK, which beats the category proxy
these places already fall back to (Local Food 71%, Cafe 83%). That is the bar — not
"better than nothing".

Scope: setting ONLY. The spec bans photo inference for price (updated_instructions.md
:1193), accessibility (:1342) and halal (attributes.ts:11) — all cases where a wrong
answer harms someone. Getting rained on is a lesser harm; those stay banned.

This script does NOT write `setting` — detect_attributes.py is its single writer. This
only records evidence under `photo_setting`, which that script consumes.

Flow:
    python scripts/detect_attributes.py      # setting -> some unknown
    python scripts/photo_setting.py          # probe those unknowns
    python scripts/detect_attributes.py      # re-resolve, now with photo evidence
"""
from __future__ import annotations

import argparse
import base64
import collections
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

MODEL = "gemini-2.5-flash"
KEY = os.environ.get("GEMINI_API_KEY", "")
EP = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
BUCKET = os.environ.get("VITE_ASSET_BASE",
                        "https://storage.googleapis.com/gradient-digital-group-loma-assets")
SCHEMA_VERSION = 1
ACCEPTED = ("indoor", "outdoor")     # "mixed" is measured noise — never stored as truth

PROMPT = """Look at this photo of a business in Phuket, Thailand. Judge ONLY the physical setting.

Reply with ONLY JSON:
{"setting": "indoor"|"outdoor"|"mixed"|"cannot_tell",
 "confidence": "high"|"medium"|"low",
 "reason": "at most 12 words describing what you actually see"}

Definitions:
- "indoor": enclosed seating, walls and a solid ceiling, typically air-conditioned
- "outdoor": seating open to the sky or street, no roof over the seating
- "mixed": roofed but open-sided (open-air), OR clearly has both indoor and outdoor seating

RULES:
- Do NOT guess. If the photo shows only food, a drink, a logo, a menu, a person's face,
  or does not show the seating area, answer "cannot_tell".
- Judge only what is visible. Do not infer from the type of business.
- Do NOT comment on price, accessibility, wheelchairs, or dietary/halal.
"""


def judge(pid: str) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(f"{BUCKET}/providers/{pid}.jpg", timeout=30) as r:
            img = base64.b64encode(r.read()).decode()
    except Exception as e:  # noqa: BLE001
        return {"verdict": "error", "accepted": False, "reason": f"photo fetch: {str(e)[:60]}"}

    body = {
        "contents": [{"parts": [{"text": PROMPT},
                                {"inline_data": {"mime_type": "image/jpeg", "data": img}}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512,
                             "responseMimeType": "application/json",
                             "thinkingConfig": {"thinkingBudget": 0}},
    }
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(f"{EP}?key={KEY}", data=json.dumps(body).encode(),
                                         headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
            cand = d["candidates"][0]
            if cand.get("finishReason") not in (None, "STOP"):
                raise ValueError(f"finishReason={cand.get('finishReason')}")
            raw = cand["content"]["parts"][0]["text"].strip()
            o = json.loads(re.sub(r"^```(json)?|```$", "", raw, flags=re.I | re.M).strip())
            s = o.get("setting")
            return {
                "verdict": s if s in ("indoor", "outdoor", "mixed", "cannot_tell") else "error",
                # "mixed" scored 16% exact in validation -> recorded, never trusted
                "accepted": s in ACCEPTED,
                "confidence": o.get("confidence"),
                "reason": (o.get("reason") or "")[:120],
                "model": MODEL, "schema_version": SCHEMA_VERSION,
                "analyzed_at": date.today().isoformat(),
            }
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 503):
                time.sleep(2 ** attempt * 2)
                continue
            break
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1 + attempt)
    return {"verdict": "error", "accepted": False, "reason": str(last)[:80],
            "model": MODEL, "analyzed_at": date.today().isoformat()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--workers", type=int, default=14)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not KEY:
        sys.exit("GEMINI_API_KEY is not set (repo-root .env)")

    resume = "" if args.force else "AND NOT (data ? 'photo_setting')"
    with get_conn() as conn:
        rows = conn.execute(f"""
            SELECT id, name, category FROM {PROVIDER_TABLE}
            WHERE COALESCE(data->>'setting','unknown') = 'unknown'
              AND COALESCE(data->>'photo','') <> ''
              AND COALESCE(data->>'business_status','OPERATIONAL')
                  NOT IN ('CLOSED_PERMANENTLY','CLOSED_TEMPORARILY')
              {resume}
            ORDER BY id
        """).fetchall()
    rows = rows[:args.limit] if args.limit else rows
    print(f"probing {len(rows)} photos of setting-unknown providers"
          f"{' (dry run)' if args.dry_run else ''}\n")

    out: list[tuple[str, dict[str, Any]]] = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(judge, r["id"]): r for r in rows}
        for n, f in enumerate(as_completed(futs), 1):
            rec = f.result()
            out.append((futs[f]["id"], rec))
            if n % 50 == 0 or n == len(rows):
                print(f"  [{n}/{len(rows)}]", flush=True)

    dt = time.time() - t0
    v = collections.Counter(r["verdict"] for _, r in out)
    acc = sum(1 for _, r in out if r["accepted"])
    print(f"\ndone in {dt:.1f}s ({dt/max(1,len(rows)):.2f}s/photo)")
    print(f"  verdicts: {dict(v)}")
    print(f"  ACCEPTED (indoor/outdoor): {acc}/{len(out)} ({100*acc/max(1,len(out)):.0f}%)")
    print(f"  discarded as noise (mixed): {v['mixed']}   honest cannot_tell: {v['cannot_tell']}"
          f"   errors: {v['error']}")

    if args.dry_run:
        print("\n(dry run — nothing written)")
        return
    with get_conn() as conn:
        for pid, rec in out:
            conn.execute(
                f"UPDATE {PROVIDER_TABLE} SET data = jsonb_set(data, '{{photo_setting}}', %s::jsonb) "
                f"WHERE id = %s", (json.dumps(rec, ensure_ascii=False), pid))
    print(f"\nwrote photo_setting for {len(out)} providers "
          f"(re-run detect_attributes.py to fold {acc} into `setting`)")


if __name__ == "__main__":
    main()
