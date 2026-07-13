#!/usr/bin/env python3
"""OSM discovery prototype: pull LOMA-relevant POIs across Phuket province (TH-83)
from the Overpass API, dedupe, categorize, and report coverage + field completeness."""
import json, urllib.request, urllib.parse, re, sys
from collections import Counter

OUT = "C:/Projects/phuket/osm_phuket_candidates.json"
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# LOMA-relevant POIs: food, cafe/dessert, massage/spa, crafts/souvenirs, local produce, attractions
QUERY = r"""
[out:json][timeout:180];
area["ISO3166-2"="TH-83"]->.a;
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|food_court|marketplace|ice_cream)$"](area.a);
  nwr["shop"~"^(bakery|pastry|confectionery|craft|gift|art|souvenir|deli|seafood|farm|greengrocer|tea|coffee|chocolate|massage|cosmetics)$"](area.a);
  nwr["tourism"~"^(attraction|museum|gallery|artwork|viewpoint)$"](area.a);
  nwr["craft"](area.a);
  nwr["leisure"="spa"](area.a);
);
out center tags;
"""

def fetch():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    for ep in ENDPOINTS:
        try:
            print("querying", ep, "...", file=sys.stderr)
            req = urllib.request.Request(ep, data=data, headers={"User-Agent": "LOMA-discovery-prototype/1.0"})
            with urllib.request.urlopen(req, timeout=200) as r:
                return json.load(r)
        except Exception as e:
            print("  failed:", e, file=sys.stderr)
    raise SystemExit("all Overpass endpoints failed")

def loma_cat(t):
    a, s, tou, cr = t.get("amenity"), t.get("shop"), t.get("tourism"), t.get("craft")
    if a in ("restaurant", "fast_food", "food_court") or s in ("seafood", "deli"): return "Local Food"
    if a in ("cafe", "ice_cream") or s in ("bakery", "pastry", "confectionery", "coffee", "tea", "chocolate"): return "Café & Dessert"
    if s == "massage" or t.get("leisure") == "spa" or s == "cosmetics": return "Massage & Spa / Wellness"
    if s in ("craft", "gift", "art", "souvenir") or cr: return "Souvenirs & Crafts"
    if a == "marketplace" or s in ("farm", "greengrocer"): return "Local Product / Market"
    if tou: return "Attraction / Experience"
    if a == "bar": return "Bar / Nightlife"
    return "Other"

def norm(s): return re.sub(r"[^a-z0-9ก-๙]", "", (s or "").lower())

raw = fetch()
els = raw.get("elements", [])
print(f"raw OSM elements: {len(els)}", file=sys.stderr)

cands, seen = [], set()
unnamed = 0
for e in els:
    t = e.get("tags", {})
    name = t.get("name") or t.get("name:th") or t.get("name:en")
    if not name:
        unnamed += 1
        continue
    lat = e.get("lat") or (e.get("center") or {}).get("lat")
    lon = e.get("lon") or (e.get("center") or {}).get("lon")
    # dedupe: same normalized name within ~50m (rounded 3 decimals ~ 110m)
    key = (norm(name), round(lat, 3) if lat else 0, round(lon, 3) if lon else 0)
    if key in seen: continue
    seen.add(key)
    cands.append({
        "osm_id": f"{e['type']}/{e['id']}",
        "name": name,
        "name_en": t.get("name:en"),
        "category": loma_cat(t),
        "lat": lat, "lon": lon,
        "cuisine": t.get("cuisine"),
        "opening_hours": t.get("opening_hours"),
        "phone": t.get("phone") or t.get("contact:phone"),
        "website": t.get("website") or t.get("contact:website") or t.get("contact:facebook"),
        "addr": " ".join(filter(None, [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:subdistrict"), t.get("addr:city")])) or None,
        "raw_tags": {k: v for k, v in t.items() if k in ("amenity", "shop", "tourism", "craft", "leisure")},
    })

json.dump(cands, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
has = lambda f: sum(1 for c in cands if c[f])
print("=" * 60)
print(f"CANDIDATES (named, deduped): {len(cands)}   (dropped {unnamed} unnamed, {len(els)-len(cands)-unnamed} dup)")
print("\nby LOMA category:")
for cat, n in Counter(c["category"] for c in cands).most_common():
    print(f"  {n:>4}  {cat}")
print("\nfield completeness:")
for f in ("name_en", "opening_hours", "phone", "website", "addr", "cuisine"):
    print(f"  {has(f):>4}/{len(cands)}  have {f}  ({round(100*has(f)/max(1,len(cands)))}%)")
print("\nsample (Local Food):")
for c in [c for c in cands if c["category"] == "Local Food"][:6]:
    print(f"  • {c['name'][:34]:<34} {(c['name_en'] or '')[:22]:<22} hrs={'Y' if c['opening_hours'] else '-'} ph={'Y' if c['phone'] else '-'}")
print(f"\nsaved: {OUT}")
