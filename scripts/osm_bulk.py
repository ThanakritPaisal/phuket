#!/usr/bin/env python3
"""Bulk-add GOOD local businesses from OSM to the catalog (target ~200 shown).
Quality bar: matched real Google listing, rating>=4.0, 15<=reviews<=2500, not a chain."""
import os, json, re, math, urllib.request, urllib.error

KEY = os.environ["GMAPS_KEY"]
APP = "C:/Projects/phuket/loma-app/"
CAND = "C:/Projects/phuket/osm_phuket_candidates.json"
KEEP_TARGET = 100
TRY_MAX = 300

# quality bar for "good business"
MIN_RATING = 4.0
MIN_REV, MAX_REV = 15, 2500

KEEP = {"Local Food", "Café & Dessert", "Souvenirs & Crafts", "Massage & Spa / Wellness", "Local Product / Market"}
CAT_MAP = {
 "Local Food": ("Local Food", "🍜", "business"),
 "Café & Dessert": ("Local Food", "☕", "business"),
 "Souvenirs & Crafts": ("Souvenir & Local Product", "🎁", "business"),
 "Massage & Spa / Wellness": ("Massage & Wellness", "💆", "business"),
 "Local Product / Market": ("Souvenir & Local Product", "🧺", "business"),
}
PRICE = {"PRICE_LEVEL_FREE": "Free", "PRICE_LEVEL_INEXPENSIVE": "฿", "PRICE_LEVEL_MODERATE": "฿฿",
         "PRICE_LEVEL_EXPENSIVE": "฿฿฿", "PRICE_LEVEL_VERY_EXPENSIVE": "฿฿฿฿"}
CHAIN = re.compile(r"kfc|starbucks|mcdonald|7[\-\s]?eleven|pizza|subway|burger|café ?amazon|คาเฟ่ ?อเมซอน|"
                   r"tesco|makro|big c|lotus|family mart|watsons|boots|swensen|dairy queen|"
                   r"the coffee club|black canyon|inthanin|true coffee|wine connection|after you|dunkin", re.I)
PHK = dict(la0=7.35, la1=8.35, ln0=98.15, ln1=98.60)
# community centroids for optional linkage
COMM = {"kathu": (7.911, 98.332, "ชุมชนกะทู้"), "koh-maprao": (7.925, 98.443, "ชุมชนเกาะมะพร้าว"),
        "kamala": (7.955, 98.283, "ชุมชนกมลา"), "ban-kian": (8.028, 98.343, "ชุมชนบ้านเคียน"),
        "tha-chatchai": (8.185, 98.303, "ชุมชนบ้านท่าฉัตรชัย"), "bang-tao": (7.998, 98.296, "ชุมชนบ้านบางเทา"),
        "bang-rong": (8.020, 98.420, "ชุมชนบ้านบางโรง"), "ban-sakhu": (8.098, 98.312, "ชุมชนบ้านสาคู"),
        "old-town": (7.884, 98.388, "ชุมชนย่านเมืองเก่าภูเก็ต"), "cape-panwa": (7.807, 98.403, "ชุมชนบ้านแหลมพันวา")}
thai = lambda s: bool(re.search(r"[ก-๙]", s or ""))
def norm(s): return re.sub(r"[^a-z0-9ก-๙]", "", (s or "").lower())
def hsh(s):
    h = 0
    for ch in s: h = (h * 131 + ord(ch)) & 0x7fffffff
    return h
def hav(a, b, c, d):
    R = 6371; p = math.pi/180
    x = math.sin((c-a)*p/2)**2 + math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 2*R*math.asin(math.sqrt(x))
def nearest_comm(lat, lon):
    best, bd = None, 999
    for slug, (cl, cn, th) in COMM.items():
        d = hav(lat, lon, cl, cn)
        if d < bd: best, bd = (slug, th), d
    return best if bd <= 3.5 else (None, None)

providers = json.load(open(APP+"src/data/providers.json", encoding="utf-8"))
exist_name = {norm(p.get("seedName") or "") for p in providers} | {norm(p.get("name") or "") for p in providers}
exist_pid = {p.get("placeId") for p in providers if p.get("placeId")}
cands = json.load(open(CAND, encoding="utf-8"))

pool = [c for c in cands if c["category"] in KEEP and c["lat"] and not CHAIN.search(c["name"] or "")
        and norm(c["name"]) not in exist_name]
# prefer Thai-named (local); spread deterministically to avoid clustering
pool.sort(key=lambda c: (0 if thai(c["name"]) else 1, hsh(c["name"])))
print(f"pool: {len(pool)}", flush=True)

FIELDS = ",".join("places."+f for f in ["id","displayName","formattedAddress","location","rating",
    "userRatingCount","priceLevel","regularOpeningHours.weekdayDescriptions","currentOpeningHours.openNow",
    "nationalPhoneNumber","websiteUri","photos","primaryTypeDisplayName","editorialSummary"])

def enrich(name, lat, lon):
    body = {"textQuery": f"{name} Phuket", "languageCode": "th", "maxResultCount": 2,
            "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": 350.0}}}
    req = urllib.request.Request("https://places.googleapis.com/v1/places:searchText", data=json.dumps(body).encode(),
        method="POST", headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": FIELDS})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return json.load(r).get("places", [])
    except Exception: return []

def photo_uri(name):
    try:
        with urllib.request.urlopen(f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=1000&skipHttpRedirect=true&key={KEY}", timeout=30) as r:
            return json.load(r).get("photoUri")
    except Exception: return None

def in_phk(loc):
    la, ln = loc.get("latitude"), loc.get("longitude")
    return la and PHK["la0"] <= la <= PHK["la1"] and PHK["ln0"] <= ln <= PHK["ln1"]

new, tried, ci = [], 0, {}
for c in pool:
    if len(new) >= KEEP_TARGET or tried >= TRY_MAX: break
    tried += 1
    res = enrich(c["name"], c["lat"], c["lon"])
    g = None
    for p in res:
        if not in_phk(p.get("location", {})): continue
        r, n = p.get("rating"), p.get("userRatingCount") or 0
        if r and r >= MIN_RATING and MIN_REV <= n <= MAX_REV and p["id"] not in exist_pid and p.get("photos"):
            g = p; break
    if not g: continue
    exist_pid.add(g["id"]); exist_name.add(norm(c["name"]))
    slug, thname = nearest_comm(g["location"]["latitude"], g["location"]["longitude"])
    appcat, emo, itype = CAT_MAP[c["category"]]
    seq = ci.get(slug or "x", 0) + 1; ci[slug or "x"] = seq
    pid = f"OSM-{(slug or 'phk').upper().replace('-','')}-{100+len(new)}"
    oh = g.get("regularOpeningHours", {})
    ph = photo_uri(g["photos"][0]["name"])
    new.append({"id": pid, "name": g["displayName"]["text"], "seedName": c["name"], "category": appcat,
        "emo": emo, "itemType": itype, "area": (thname and COMM[slug][0]) or "Phuket",
        "rating": g.get("rating"), "reviews": g.get("userRatingCount"), "price": PRICE.get(g.get("priceLevel"), ""),
        "openNow": g.get("currentOpeningHours", {}).get("openNow"), "hours": oh.get("weekdayDescriptions", []),
        "lat": g["location"]["latitude"], "lng": g["location"]["longitude"], "address": g.get("formattedAddress", ""),
        "phone": g.get("nationalPhoneNumber", ""), "website": g.get("websiteUri", ""), "mapsUrl": "",
        "primaryType": g.get("primaryTypeDisplayName", {}).get("text", ""),
        "summary": g.get("editorialSummary", {}).get("text", ""), "photo": ph, "placeId": g["id"],
        "confidence": "HIGH", "community": thname, "communitySlug": slug, "source": "osm_bulk"})
    if len(new) % 20 == 0: print(f"  kept {len(new)} / tried {tried}", flush=True)

# link community members
comm_new = {}
for r in new:
    if r["communitySlug"]: comm_new.setdefault(r["communitySlug"], []).append(r["id"])
providers.extend(new)
json.dump(providers, open(APP+"src/data/providers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
comms = json.load(open(APP+"src/data/v2/communities.json", encoding="utf-8"))
for c in comms:
    c["memberIds"] = c["memberIds"] + comm_new.get(c["id"], [])
json.dump(comms, open(APP+"src/data/v2/communities.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\nADDED {len(new)} good OSM businesses (tried {tried}). community-linked: {sum(len(v) for v in comm_new.values())}", flush=True)
from collections import Counter
print("by app category:", dict(Counter(r["category"] for r in new)))
