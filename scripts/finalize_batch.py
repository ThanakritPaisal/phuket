#!/usr/bin/env python3
"""Finalize batch-1: recategorize into the 8-category taxonomy, normalize to the
provider shape, and merge into loma-app/src/data/providers.json.

- Splits "Local Food" -> Local Food / Seafood / Street Food & Noodles (batch + existing).
- Strips bulky reviews_text from the CLIENT providers.json (kept in batch1_enriched.json
  for the DB / rainy-day mining); keeps setting, dietary, links, price_range, etc.
"""
import json, re

ROOT = "C:/Projects/phuket"
BATCH = f"{ROOT}/batch1_enriched.json"
PROV = f"{ROOT}/loma-app/src/data/providers.json"

CAT_EMO = {"Local Food": "🍜", "Seafood": "🦐", "Street Food & Noodles": "🍲",
           "Café & Dessert": "☕", "Massage & Wellness": "💆",
           "Souvenir & Local Product": "🎁", "Community Experience": "🛶", "Boat / Sea": "⛵"}

SEAFOOD = re.compile(r"seafood|อาหารทะเล|ทะเล|กุ้ง|ปู|หอย|oyster|crab|lobster|prawn|ปลาเผา", re.I)
STREET = re.compile(r"noodle|ก๋วยเตี๋ยว|ก๋วยจั๊บ|hawker|food ?court|street food|โจ๊ก|ข้าวต้ม|"
                    r"ข้าวมันไก่|ส้มตำ|somtam|fast food|ข้าวแกง|โรตี|ก๋วยจับ|หมูสะเต๊ะ", re.I)

def recat(rec):
    if rec.get("category") != "Local Food":
        return rec.get("category")
    hay = " ".join(str(rec.get(k, "")) for k in ("primaryType", "name", "seedName", "cuisine", "summary"))
    pt = str(rec.get("primaryType", "")).lower()
    if "seafood" in pt or SEAFOOD.search(hay):
        return "Seafood"
    if STREET.search(hay) or re.search(r"noodle|fast food|food court|hawker", pt):
        return "Street Food & Noodles"
    return "Local Food"

# ---- recategorize existing 255 (in place) ----
existing = json.load(open(PROV, encoding="utf-8"))
moved_ex = 0
for p in existing:
    nc = recat(p)
    if nc != p.get("category"):
        p["category"] = nc; p["emo"] = CAT_EMO.get(nc, p.get("emo", "📍")); moved_ex += 1

# ---- normalize + recategorize the batch, strip bulky fields for the client bundle ----
batch = json.load(open(BATCH, encoding="utf-8"))
DROP = {"reviews_text", "matched_name", "business_status"}
out_batch = []
for b in batch:
    b = dict(b)
    b["category"] = recat(b)
    b["emo"] = CAT_EMO.get(b["category"], "📍")
    # minimal contact_method from what we have
    if b.get("phone"):
        b["contact_method"] = {"type": "phone", "value": str(b["phone"])}
    elif b.get("website"):
        b["contact_method"] = {"type": "website", "value": str(b["website"])}
    for k in DROP:
        b.pop(k, None)
    out_batch.append(b)

merged = existing + out_batch
json.dump(merged, open(PROV, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
from collections import Counter
print(f"existing recategorized (moved out of Local Food): {moved_ex}")
print(f"merged total: {len(merged)}  (existing {len(existing)} + batch {len(out_batch)})")
print("\nFINAL category distribution:")
for k, v in Counter(p["category"] for p in merged).most_common():
    print(f"  {v:>4}  {k}")
diet = Counter()
for p in merged:
    for d in (p.get("dietary") or []): diet[d] += 1
print(f"\ndietary: {dict(diet)}  |  with photo: {sum(1 for p in merged if p.get('photo'))}"
      f"  |  with setting: {sum(1 for p in merged if p.get('setting') and p['setting']!='unknown')}")
print(f"saved: {PROV}")
