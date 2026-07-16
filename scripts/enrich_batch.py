#!/usr/bin/env python3
"""Batch-1 ENRICHMENT (PAID — Google Places API New).

For each candidate in batch1_candidates.json:
  Text Search (ID-only, cheap) -> place_id
  Place Details (Atmosphere: reviews, photo, links, veg, accessibility) -> fields
  -> build a provider record in our schema (+ setting/dietary/links, honest unknowns)
  -> download first photo to enriched_batch1_images/

Checkpoints to batch1_enriched.json (resume-safe: re-run skips done ids).
Usage:  python scripts/enrich_batch.py [--limit N] [--no-photos]
"""
import json, os, re, sys, time, urllib.request, urllib.parse, urllib.error
from difflib import SequenceMatcher

ROOT = "C:/Projects/phuket"
CANDS = f"{ROOT}/batch1_candidates.json"
OUT = f"{ROOT}/batch1_enriched.json"
IMGDIR = f"{ROOT}/enriched_batch1_images"
LIMIT = None
PHOTOS = True
for i, a in enumerate(sys.argv):
    if a == "--limit": LIMIT = int(sys.argv[i + 1])
    if a == "--no-photos": PHOTOS = False

# ---- API key from .env ----
KEY = None
for line in open(f"{ROOT}/.env", encoding="utf-8"):
    m = re.match(r"\s*PLACES_API_KEY\s*=\s*(.+)", line)
    if m: KEY = m.group(1).strip().strip('"').strip("'")
if not KEY:
    sys.exit("PLACES_API_KEY not found in .env")

SEARCH = "https://places.googleapis.com/v1/places:searchText"
DETAIL_MASK = ",".join([
    "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount",
    "priceLevel", "currentOpeningHours.openNow", "regularOpeningHours.weekdayDescriptions",
    "nationalPhoneNumber", "websiteUri", "googleMapsUri", "googleMapsLinks",
    "businessStatus", "primaryType", "primaryTypeDisplayName", "editorialSummary",
    "photos", "reviews", "servesVegetarianFood", "accessibilityOptions",
])

CAT_EMO = {"Local Food": "🍜", "Café & Dessert": "☕", "Massage & Wellness": "💆",
           "Souvenir & Local Product": "🎁", "Community Experience": "🛶", "Boat / Sea": "⛵"}
CAT_DUR = {"Local Food": (45, 75), "Café & Dessert": (40, 70), "Massage & Wellness": (60, 120),
           "Souvenir & Local Product": (20, 45), "Community Experience": (90, 180), "Boat / Sea": (180, 360)}
AREAS = {  # rough centroids for nearest-area assignment
    "Patong": (7.896, 98.297), "Kata": (7.820, 98.298), "Karon": (7.846, 98.294),
    "Rawai": (7.779, 98.325), "Chalong": (7.846, 98.339), "Old Town": (7.884, 98.388),
    "Phuket Town": (7.888, 98.398), "Kathu": (7.911, 98.336), "Kamala": (7.955, 98.283),
    "Bang Tao": (7.994, 98.297), "Cherng Talay": (8.006, 98.307), "Thalang": (8.033, 98.339),
    "Mai Khao": (8.130, 98.303), "Cape Panwa": (7.808, 98.407), "Pa Khlok": (8.023, 98.395),
}

def nearest_area(la, lo):
    return min(AREAS, key=lambda a: (AREAS[a][0] - la) ** 2 + (AREAS[a][1] - lo) ** 2)

def setting_from_type(pt):
    t = (pt or "").lower()
    if re.search(r"beach|market|viewpoint|park|marina|pier|tourist_attraction|natural", t): return "outdoor"
    if re.search(r"cafe|coffee|bakery|spa|massage|store|shop|mall|museum|gallery|restaurant|food", t): return "indoor"
    return "unknown"

PRICE = {"PRICE_LEVEL_INEXPENSIVE": "budget", "PRICE_LEVEL_MODERATE": "moderate",
         "PRICE_LEVEL_EXPENSIVE": "premium", "PRICE_LEVEL_VERY_EXPENSIVE": "premium"}
PRICE_TXT = {"budget": "฿", "moderate": "฿฿", "premium": "฿฿฿", "unknown": "฿฿"}

def post(url, body, mask):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": mask})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def get(url, mask):
    req = urllib.request.Request(url, headers={"X-Goog-Api-Key": KEY, "X-Goog-FieldMask": mask})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def match_place(c):
    """Resolve a candidate to a Google place_id.

    Uses locationRestriction (a HARD boundary), not locationBias (a soft preference).
    With bias, Text Search happily returned same-named shops in Chiang Mai / Samui /
    Hat Yai — 12 bad matches in batch 1. A restriction makes that impossible.
    """
    q = (c.get("name_en") or c["name"]) + " Phuket"
    d_lat, d_lng = 0.006, 0.006  # ~660m box around the candidate
    body = {
        "textQuery": q,
        "maxResultCount": 1,
        "locationRestriction": {"rectangle": {
            "low": {"latitude": c["lat"] - d_lat, "longitude": c["lng"] - d_lng},
            "high": {"latitude": c["lat"] + d_lat, "longitude": c["lng"] + d_lng},
        }},
    }
    d = post(SEARCH, body, "places.id")  # ID-only tier (cheap)
    places = d.get("places") or []
    return places[0]["id"] if places else None

def photo_download(name, pid):
    if not PHOTOS or not name: return None
    os.makedirs(IMGDIR, exist_ok=True)
    existing = f"{IMGDIR}/{pid}.jpg"
    if os.path.exists(existing) and os.path.getsize(existing) > 1000:
        return f"/providers/{pid}.jpg"  # already downloaded — skip the paid photo fetch
    url = f"https://places.googleapis.com/v1/{name}/media?maxWidthPx=800&key={KEY}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        path = f"{IMGDIR}/{pid}.jpg"
        open(path, "wb").write(data)
        return f"/providers/{pid}.jpg"  # GCS-style path; rehost step uploads it
    except Exception:
        return None

def enrich(c, idx):
    pid = match_place(c)
    rec = {"id": f"b1_{idx:04d}", "name": c["name"], "seedName": c["name"],
           "category": c["category"], "emo": CAT_EMO.get(c["category"], "📍"),
           "itemType": "place", "area": nearest_area(c["lat"], c["lng"]),
           "lat": c["lat"], "lng": c["lng"], "source": c["source"],
           "source_type": c["source_type"], "phone": c.get("phone"), "website": c.get("website"),
           "verification_status": "unverified", "confidence": "NONE"}
    dur = CAT_DUR.get(c["category"], (45, 75))
    rec["estimated_visit_duration_min"], rec["estimated_visit_duration_max"] = dur
    diet = list(c.get("dietary_hint") or [])

    if pid:
        d = get(f"https://places.googleapis.com/v1/places/{pid}", DETAIL_MASK)
        loc = d.get("location") or {}
        disp = (d.get("displayName") or {}).get("text", "")
        sim = SequenceMatcher(None, (c.get("name_en") or c["name"]).lower(), disp.lower()).ratio()
        pr = PRICE.get(d.get("priceLevel"), "unknown")
        acc = d.get("accessibilityOptions") or {}
        wheel = "unknown"
        if acc.get("wheelchairAccessibleEntrance"):
            wheel = "full" if acc.get("wheelchairAccessibleRestroom") and acc.get("wheelchairAccessibleSeating") else "partial"
        if d.get("servesVegetarianFood") is True and "vegetarian" not in diet:
            diet.append("vegetarian")
        gml = d.get("googleMapsLinks") or {}
        rec.update({
            "placeId": pid, "matched_name": disp, "confidence": f"{sim:.2f}",
            "name": disp or c["name"],
            "rating": d.get("rating", 0), "reviews": d.get("userRatingCount", 0),
            "price": PRICE_TXT[pr], "price_range": pr,
            "openNow": (d.get("currentOpeningHours") or {}).get("openNow"),
            "hours": (d.get("regularOpeningHours") or {}).get("weekdayDescriptions", []),
            "address": d.get("formattedAddress", ""),
            "phone": d.get("nationalPhoneNumber") or c.get("phone"),
            "website": d.get("websiteUri") or c.get("website"),
            "mapsUrl": d.get("googleMapsUri", ""),
            "primaryType": (d.get("primaryTypeDisplayName") or {}).get("text", d.get("primaryType", "")),
            "summary": (d.get("editorialSummary") or {}).get("text", ""),
            "setting": setting_from_type(d.get("primaryType")),
            "wheelchair_accessibility": wheel,
            "elderly_suitability": "unknown",
            "reviews_text": [{"text": (rv.get("text") or {}).get("text", ""), "rating": rv.get("rating"),
                              "author": (rv.get("authorAttribution") or {}).get("displayName", ""),
                              "time": rv.get("publishTime", "")} for rv in (d.get("reviews") or [])],
            "links": {"website": d.get("websiteUri"), "google_maps": d.get("googleMapsUri"),
                      "directions": gml.get("directionsUri"), "reviews": gml.get("reviewsUri"),
                      "write_review": gml.get("writeAReviewUri"), "photos": gml.get("photosUri")},
            "business_status": d.get("businessStatus", ""),
        })
        if loc:
            rec["lat"], rec["lng"] = loc.get("latitude", c["lat"]), loc.get("longitude", c["lng"])
        photos = d.get("photos") or []
        rec["photo"] = photo_download(photos[0]["name"], rec["id"]) if photos else ""
    else:
        rec.update({"placeId": None, "rating": 0, "reviews": 0, "price": "฿฿",
                    "price_range": "unknown", "openNow": None, "hours": [], "address": "",
                    "mapsUrl": "", "primaryType": "", "summary": "", "photo": "",
                    "setting": "unknown", "wheelchair_accessibility": "unknown",
                    "elderly_suitability": "unknown", "reviews_text": [], "links": {}})
    rec["dietary"] = diet
    return rec

# ---- run (resume-safe) ----
cands = json.load(open(CANDS, encoding="utf-8"))
if LIMIT: cands = cands[:LIMIT]
done = {}
if os.path.exists(OUT):
    done = {r["id"]: r for r in json.load(open(OUT, encoding="utf-8"))}
out = list(done.values())
matched = sum(1 for r in out if r.get("placeId"))
for idx, c in enumerate(cands):
    rid = f"b1_{idx:04d}"
    if rid in done:
        continue
    try:
        rec = enrich(c, idx)
        out.append(rec)
        if rec.get("placeId"): matched += 1
        tag = f"✓ {rec.get('rating')}★x{rec.get('reviews')}" if rec.get("placeId") else "✗ no match"
        print(f"[{idx+1}/{len(cands)}] {c['name'][:34]:<34} {tag}", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"[{idx+1}/{len(cands)}] {c['name'][:34]:<34} HTTP {e.code}: {e.read()[:120]}", file=sys.stderr)
        if e.code in (401, 403, 429):  # auth/quota — stop, don't burn calls
            print("!! stopping on auth/quota error", file=sys.stderr); break
    except Exception as e:
        print(f"[{idx+1}/{len(cands)}] {c['name'][:34]:<34} ERR {e}", file=sys.stderr)
    if (idx + 1) % 25 == 0:  # checkpoint
        json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    time.sleep(0.06)

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\nDONE. enriched {len(out)} | matched {matched} | unmatched {len(out)-matched} | saved {OUT}", file=sys.stderr)
