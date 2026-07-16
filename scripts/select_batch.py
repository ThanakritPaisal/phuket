#!/usr/bin/env python3
"""Batch-1 SELECTION (free — no Google calls).

Builds the candidate list for the first 1,000-business pull:
  OSM pool + TAT directory  ->  dedupe (within/across sources + vs. existing)
  ->  canonical category + source_type + setting/dietary hints
  ->  Phuket bbox filter  ->  select 1,000  ->  coverage QA + pre-flight cost.

Outputs batch1_candidates.json. The paid Google enrichment is a separate step.
"""
import json, re, sys
from collections import Counter, defaultdict
import openpyxl

ROOT = "C:/Projects/phuket"
OSM = f"{ROOT}/osm_phuket_candidates.json"
EXISTING = f"{ROOT}/loma-app/src/data/providers.json"
OUT = f"{ROOT}/batch1_candidates.json"
TAT = [
    (f"{ROOT}/Phuket_Restaurants_TTD.xlsx", "restaurant"),
    (f"{ROOT}/Phuket_Spas.xlsx", "spa"),
    (f"{ROOT}/Phuket_Stores.xlsx", "store"),
]
TARGET = 1000
# Phuket province bbox (drops stray/mis-tagged points outside the island group).
BBOX = (7.72, 8.22, 98.22, 98.46)  # latmin, latmax, lngmin, lngmax

# ---- canonical taxonomy (mirrors loma-app/src/categories.ts) ----------------
def tag_to_category(t):
    a, s, tou, cr, le = (t.get("amenity"), t.get("shop"), t.get("tourism"),
                         t.get("craft"), t.get("leisure"))
    if a in ("cafe", "ice_cream") or s in ("bakery", "pastry", "confectionery", "coffee", "tea", "chocolate"):
        return "Café & Dessert"
    if s == "massage" or le == "spa" or s == "cosmetics":
        return "Massage & Wellness"
    if s in ("craft", "gift", "art", "souvenir", "farm", "greengrocer") or cr or a == "marketplace":
        return "Souvenir & Local Product"
    if tou:
        return "Community Experience"
    if a in ("restaurant", "fast_food", "food_court") or s in ("seafood", "deli"):
        return "Local Food"
    if a == "bar":
        return None  # bars are out of scope for LOMA
    return "Local Food"

def norm(s):
    return re.sub(r"[^a-z0-9฀-๿]", "", (s or "").lower())

def in_bbox(la, lo):
    return la is not None and lo is not None and BBOX[0] <= la <= BBOX[1] and BBOX[2] <= lo <= BBOX[3]

def district(la, lo):
    if la >= 7.98: return "Thalang (north)"
    if lo <= 98.33: return "Kathu (west)"
    return "Mueang Phuket (south/east)"

VEG_RE = re.compile(r"vegetarian|มังสวิรัติ|เจ\b|vegan", re.I)
HALAL_RE = re.compile(r"halal|ฮาลาล|มุสลิม|muslim|อิสลาม", re.I)

# ---- load existing (dedup exclusion) ----------------------------------------
existing = json.load(open(EXISTING, encoding="utf-8"))
seen = set()
for p in existing:
    seen.add((norm(p.get("name")), round(p.get("lat") or 0, 3), round(p.get("lng") or 0, 3)))
print(f"existing providers (excluded): {len(existing)}", file=sys.stderr)

cands = []
def add(rec):
    la, lo = rec["lat"], rec["lng"]
    if not in_bbox(la, lo):
        rec["_drop"] = "outside_bbox"; return
    key = (norm(rec["name"]), round(la, 3), round(lo, 3))
    if key in seen:
        rec["_drop"] = "dup"; return
    seen.add(key)
    cands.append(rec)

# ---- OSM ----
osm = json.load(open(OSM, encoding="utf-8"))
OLD2NEW = {
    "Local Food": "Local Food", "Café & Dessert": "Café & Dessert",
    "Massage & Spa / Wellness": "Massage & Wellness",
    "Souvenirs & Crafts": "Souvenir & Local Product",
    "Local Product / Market": "Souvenir & Local Product",
    "Attraction / Experience": "Community Experience",
    "Bar / Nightlife": None,
}
for e in osm:
    cat = tag_to_category(e.get("raw_tags", {})) or OLD2NEW.get(e.get("category"))
    if not cat:
        continue
    completeness = sum(bool(e.get(f)) for f in ("name_en", "opening_hours", "phone", "website", "addr", "cuisine"))
    add({
        "name": e["name"], "name_en": e.get("name_en"), "lat": e.get("lat"), "lng": e.get("lon"),
        "category": cat, "source": "osm", "source_type": "ai_discovered",
        "osm_id": e.get("osm_id"), "phone": e.get("phone"), "website": e.get("website"),
        "cuisine": e.get("cuisine"), "opening_hours_raw": e.get("opening_hours"),
        "dietary_hint": [], "completeness": completeness,
    })

# ---- TAT (read by header name) ----
def col(hdr, *names):
    for n in names:
        for i, h in enumerate(hdr):
            if h and n.lower() in str(h).lower():
                return i
    return None

for path, kind in TAT:
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hdr = rows[0]
    ci = {k: col(hdr, *v) for k, v in {
        "th": ("Name (TH)",), "en": ("Name (EN)",), "lat": ("Latitude",), "lng": ("Longitude",),
        "tel": ("Telephone", "Mobile"), "web": ("Website",), "fb": ("Facebook",),
        "hrs": ("Opening Hours",), "rating": ("Rating",), "food": ("Food Types",),
        "prod": ("Product Categories",),
    }.items()}
    cat = {"restaurant": "Local Food", "spa": "Massage & Wellness", "store": "Souvenir & Local Product"}[kind]
    for r in rows[1:]:
        name = r[ci["en"]] or r[ci["th"]] if ci["en"] is not None else r[ci["th"]]
        if not name:
            continue
        try:
            la = float(r[ci["lat"]]); lo = float(r[ci["lng"]])
        except (TypeError, ValueError):
            continue
        food = str(r[ci["food"]] or "") if ci["food"] is not None else ""
        c = cat
        if kind == "restaurant" and re.search(r"coffee|cafe|café|dessert|bakery|เบเกอ|กาแฟ|ขนม", food, re.I):
            c = "Café & Dessert"
        diet = []
        if VEG_RE.search(food) or VEG_RE.search(str(name)): diet.append("vegetarian")
        if HALAL_RE.search(food) or HALAL_RE.search(str(name)): diet.append("halal")
        add({
            "name": str(name), "name_en": str(r[ci["en"]]) if ci["en"] is not None and r[ci["en"]] else None,
            "lat": la, "lng": lo, "category": c, "source": f"tat_{kind}s", "source_type": "directory_listed",
            "phone": r[ci["tel"]] if ci["tel"] is not None else None,
            "website": r[ci["web"]] if ci["web"] is not None else None,
            "dietary_hint": diet, "completeness": 6,  # TAT rows are field-rich
        })

# ---- select 1000: all TAT (official) first, then OSM by completeness ----
tat = [c for c in cands if c["source"].startswith("tat")]
osm_c = sorted([c for c in cands if c["source"] == "osm"], key=lambda x: -x["completeness"])
selected = (tat + osm_c)[:TARGET]

json.dump(selected, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
def dist_of(c): return district(c["lat"], c["lng"])
print("=" * 64)
print(f"CANDIDATE POOL (deduped, in-bbox): {len(cands)}   |   SELECTED: {len(selected)}")
print(f"  from TAT (official): {sum(1 for c in selected if c['source'].startswith('tat'))}"
      f"   from OSM: {sum(1 for c in selected if c['source']=='osm')}")
print("\nby CATEGORY:")
for k, v in Counter(c["category"] for c in selected).most_common():
    print(f"  {v:>4}  {k}")
print("\nby DISTRICT (coverage QA):")
for k, v in Counter(dist_of(c) for c in selected).most_common():
    print(f"  {v:>4}  {k}")
print("\nby SOURCE:")
for k, v in Counter(c["source"] for c in selected).most_common():
    print(f"  {v:>4}  {k}")
diet = sum(1 for c in selected if c["dietary_hint"])
print(f"\ndietary hints found (pre-enrichment): {diet}")
print("\n" + "=" * 64)
print("PRE-FLIGHT (paid Google enrichment):")
print(f"  {len(selected)} businesses x 1 Place Details (reviews+photo+links, Atmosphere SKU)")
print(f"  + up to {len(selected)} Text Search matches (ID-only tier, mostly free)")
print(f"  Est. billable ~ {len(selected)} Details calls @ ~$25/1000 = ~${len(selected)*25/1000:.2f} gross")
print(f"  (minus monthly free tier; net likely lower)")
print(f"\nsaved: {OUT}")
