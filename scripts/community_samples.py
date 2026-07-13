#!/usr/bin/env python3
"""Sample places per community: OSM POIs near each community centroid → Places
enrichment → append as scored member providers (source=osm_sample)."""
import os, json, re, math, urllib.request, urllib.error

KEY = os.environ["GMAPS_KEY"]
APP = "C:/Projects/phuket/loma-app/"
CAND = "C:/Projects/phuket/osm_phuket_candidates.json"
R_KM = 3.5
PER = 3   # samples to keep per community

# community slug -> (approx centroid lat, lng, area string, thai community name)
COMM = {
 "kathu":        (7.911, 98.332, "Kathu", "ชุมชนกะทู้"),
 "koh-maprao":   (7.925, 98.443, "Koh Maprao", "ชุมชนเกาะมะพร้าว"),
 "kamala":       (7.955, 98.283, "Kamala", "ชุมชนกมลา"),
 "ban-kian":     (8.028, 98.343, "Thalang", "ชุมชนบ้านเคียน"),
 "tha-chatchai": (8.185, 98.303, "Mai Khao (Thalang)", "ชุมชนบ้านท่าฉัตรชัย"),
 "bang-tao":     (7.998, 98.296, "Bang Tao / Cherng Talay", "ชุมชนบ้านบางเทา"),
 "bang-rong":    (8.020, 98.420, "Pa Khlok", "ชุมชนบ้านบางโรง"),
 "ban-sakhu":    (8.098, 98.312, "Thalang", "ชุมชนบ้านสาคู"),
 "old-town":     (7.884, 98.388, "Old Town", "ชุมชนย่านเมืองเก่าภูเก็ต"),
 "cape-panwa":   (7.807, 98.403, "Cape Panwa", "ชุมชนบ้านแหลมพันวา"),
}
KEEP = {"Local Food", "Café & Dessert", "Souvenirs & Crafts",
        "Massage & Spa / Wellness", "Local Product / Market", "Attraction / Experience"}
CAT_MAP = {  # OSM LOMA cat -> (app category, emoji, itemType)
 "Local Food": ("Local Food", "🍜", "business"),
 "Café & Dessert": ("Local Food", "☕", "business"),
 "Souvenirs & Crafts": ("Souvenir & Local Product", "🎁", "business"),
 "Massage & Spa / Wellness": ("Massage & Wellness", "💆", "business"),
 "Local Product / Market": ("Souvenir & Local Product", "🧺", "business"),
 "Attraction / Experience": ("Community Experience", "📍", "attraction"),
}
PRICE = {"PRICE_LEVEL_FREE": "Free", "PRICE_LEVEL_INEXPENSIVE": "฿",
         "PRICE_LEVEL_MODERATE": "฿฿", "PRICE_LEVEL_EXPENSIVE": "฿฿฿", "PRICE_LEVEL_VERY_EXPENSIVE": "฿฿฿฿"}
CHAIN = re.compile(r"kfc|starbucks|mcdonald|7[\-\s]?eleven|pizza|subway|burger|amazon|tesco|makro|big c|lotus|family mart|watsons|boots", re.I)
PHK = dict(la0=7.35, la1=8.35, ln0=98.15, ln1=98.60)
thai = lambda s: bool(re.search(r"[ก-๙]", s or ""))
def norm(s): return re.sub(r"[^a-z0-9ก-๙]", "", (s or "").lower())
def hav(a, b, c, d):
    R = 6371; p = math.pi/180
    x = math.sin((c-a)*p/2)**2 + math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 2*R*math.asin(math.sqrt(x))

providers = json.load(open(APP+"src/data/providers.json", encoding="utf-8"))
exist = {norm(p.get("seedName") or "") for p in providers} | {norm(p.get("name") or "") for p in providers}
cands = json.load(open(CAND, encoding="utf-8"))

FIELDS = ",".join("places."+f for f in ["id","displayName","formattedAddress","location","rating",
    "userRatingCount","priceLevel","regularOpeningHours.weekdayDescriptions","currentOpeningHours.openNow",
    "nationalPhoneNumber","websiteUri","photos","primaryTypeDisplayName","editorialSummary"])

def enrich(name, lat, lon):
    body = {"textQuery": f"{name} Phuket", "languageCode": "th", "maxResultCount": 3,
            "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": 400.0}}}
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.read()
    except urllib.error.HTTPError as e:
        print("  ! err", e.read().decode()[:120]); return None

def photo_uri(name):
    url = f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=1000&skipHttpRedirect=true&key={KEY}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r: return json.load(r).get("photoUri")
    except Exception: return None

def in_phk(loc):
    la, ln = loc.get("latitude"), loc.get("longitude")
    return la and PHK["la0"] <= la <= PHK["la1"] and PHK["ln0"] <= ln <= PHK["ln1"]

new_providers, comm_new = [], {}
for slug, (clat, clon, area, thname) in COMM.items():
    near = [c for c in cands if c["category"] in KEEP and c["lat"] and not CHAIN.search(c["name"] or "")
            and norm(c["name"]) not in exist and hav(clat, clon, c["lat"], c["lon"]) <= R_KM]
    near.sort(key=lambda c: (0 if thai(c["name"]) else 1, hav(clat, clon, c["lat"], c["lon"])))
    kept, i = [], 0
    for c in near:
        if len(kept) >= PER: break
        raw = enrich(c["name"], c["lat"], c["lon"])
        if not raw: continue
        res = [p for p in json.loads(raw).get("places", []) if in_phk(p.get("location", {}))]
        g = next((p for p in res if p.get("rating") and 5 <= (p.get("userRatingCount") or 0) <= 4000), None)
        if not g: continue
        exist.add(norm(c["name"])); i += 1
        appcat, emo, itype = CAT_MAP[c["category"]]
        pid = f"OSM-{slug.upper().replace('-','')}-{i:02d}"
        oh = g.get("regularOpeningHours", {})
        ph = photo_uri(g["photos"][0]["name"]) if g.get("photos") else None
        rec = {"id": pid, "name": g["displayName"]["text"], "seedName": c["name"], "category": appcat,
               "emo": emo, "itemType": itype, "area": area, "rating": g.get("rating"),
               "reviews": g.get("userRatingCount"), "price": PRICE.get(g.get("priceLevel"), ""),
               "openNow": g.get("currentOpeningHours", {}).get("openNow"),
               "hours": oh.get("weekdayDescriptions", []),
               "lat": g["location"]["latitude"], "lng": g["location"]["longitude"],
               "address": g.get("formattedAddress", ""), "phone": g.get("nationalPhoneNumber", ""),
               "website": g.get("websiteUri", ""), "mapsUrl": "",
               "primaryType": g.get("primaryTypeDisplayName", {}).get("text", ""),
               "summary": g.get("editorialSummary", {}).get("text", ""), "photo": ph,
               "placeId": g["id"], "confidence": "HIGH", "community": thname,
               "communitySlug": slug, "source": "osm_sample"}
        kept.append(rec); new_providers.append(rec)
    comm_new[slug] = [r["id"] for r in kept]
    print(f"{slug:<13} +{len(kept)}  {', '.join(r['name'][:20] for r in kept)}")

# append to providers.json
providers.extend(new_providers)
json.dump(providers, open(APP+"src/data/providers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# add ids to communities.json memberIds (samples first)
comms = json.load(open(APP+"src/data/v2/communities.json", encoding="utf-8"))
for c in comms:
    c["memberIds"] = comm_new.get(c["id"], []) + c["memberIds"]
    if not c.get("img"):
        ph = next((r["photo"] for r in new_providers if r["communitySlug"] == c["id"] and r["photo"]), None)
        if ph: c["img"] = ph
json.dump(comms, open(APP+"src/data/v2/communities.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\nadded {len(new_providers)} sample providers across {sum(1 for v in comm_new.values() if v)} communities")
