#!/usr/bin/env python3
"""OSM → pre-filter → Google Places enrichment for a promising sample.
Feeds osm_sample_enriched.json into the real scoring engine (next step)."""
import os, json, re, urllib.request, urllib.error

KEY = os.environ["GMAPS_KEY"]
CAND = "C:/Projects/phuket/osm_phuket_candidates.json"
OUT = "C:/Projects/phuket/osm_sample_enriched.json"
N = 30

# obvious chains / franchises to drop before spending on enrichment
CHAIN = re.compile(r"kfc|starbucks|mcdonald|7[\-\s]?eleven|pizza (hut|company)|subway|burger king|"
                   r"dairy queen|swensen|black canyon|amazon|mk (restaurant|gold)|sizzler|domino|"
                   r"texas chicken|auntie anne|baskin|dunkin|coffee club|wine connection|after you|"
                   r"bar b q plaza|chester|s&p|fuji|yayoi|true coffee|inthanin|tesco|makro|big c|"
                   r"lotus|villa market|family mart|cp |watsons|boots", re.I)
KEEP = {"Local Food", "Café & Dessert", "Souvenirs & Crafts", "Massage & Spa / Wellness",
        "Local Product / Market", "Attraction / Experience"}
PHK = dict(la0=7.35, la1=8.35, ln0=98.15, ln1=98.60)
has_thai = lambda s: bool(re.search(r"[ก-๙]", s or ""))

def norm(s): return re.sub(r"[^a-z0-9ก-๙]", "", (s or "").lower())

# existing providers to dedupe against
existing = json.load(open("C:/Projects/phuket/loma-app/src/data/providers.json", encoding="utf-8"))
exist_names = {norm(p.get("seedName") or "") for p in existing} | {norm(p.get("name") or "") for p in existing}

cands = json.load(open(CAND, encoding="utf-8"))
pool = [c for c in cands
        if c["category"] in KEEP
        and not CHAIN.search(c["name"] or "")
        and norm(c["name"]) not in exist_names
        and c["lat"] and c["lon"]]

# prefer locally-named (Thai) places; take a spread across categories
pool.sort(key=lambda c: (c["category"], 0 if has_thai(c["name"]) else 1, c["name"]))
sample, per = [], {}
for c in pool:                       # round-robin cap ~6 per category for diversity
    if per.get(c["category"], 0) < 6:
        sample.append(c); per[c["category"]] = per.get(c["category"], 0) + 1
    if len(sample) >= N: break
print(f"pool after filter: {len(pool)}  |  sample: {len(sample)}")
print("sample by category:", {k: per[k] for k in per})

FIELDS = ",".join("places." + f for f in [
    "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount",
    "priceLevel", "regularOpeningHours.weekdayDescriptions", "currentOpeningHours.openNow",
    "nationalPhoneNumber", "websiteUri", "photos", "primaryTypeDisplayName", "businessStatus"])

def search(name, lat, lon):
    body = {"textQuery": f"{name} Phuket", "languageCode": "th", "maxResultCount": 3,
            "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": 500.0}}}
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r).get("places", [])
    except urllib.error.HTTPError as e:
        print("  ! err", e.read().decode()[:160]); return []

def in_phk(loc):
    la, ln = loc.get("latitude"), loc.get("longitude")
    return la and PHK["la0"] <= la <= PHK["la1"] and PHK["ln0"] <= ln <= PHK["ln1"]

out = []
matched = 0
for i, c in enumerate(sample, 1):
    res = [p for p in search(c["name"], c["lat"], c["lon"]) if in_phk(p.get("location", {}))]
    g = res[0] if res else None
    rec = {"osm_id": c["osm_id"], "osm_name": c["name"], "category": c["category"],
           "lat": c["lat"], "lon": c["lon"], "google_matched": bool(g)}
    if g:
        matched += 1
        oh = g.get("regularOpeningHours", {})
        rec.update(
            place_id=g["id"],
            name=g.get("displayName", {}).get("text", c["name"]),
            address=g.get("formattedAddress", ""),
            rating=g.get("rating"), reviews=g.get("userRatingCount"),
            price_level=g.get("priceLevel"),
            hours=" | ".join(oh.get("weekdayDescriptions", [])),
            phone=g.get("nationalPhoneNumber", ""),
            website=g.get("websiteUri", ""),
            primary_type=g.get("primaryTypeDisplayName", {}).get("text", ""),
            has_photo=bool(g.get("photos")),
            business_status=g.get("businessStatus", ""))
    else:
        rec.update(name=c["name"], rating=None, reviews=None)
    out.append(rec)
    print(f"[{i}/{len(sample)}] {c['name'][:30]:<30} -> {'✓ '+str(rec.get('rating'))+'★ x'+str(rec.get('reviews')) if g else '✗ no Google match'}")

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\nGoogle-matched: {matched}/{len(sample)}  |  saved: {OUT}")
