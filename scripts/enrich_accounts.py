#!/usr/bin/env python3
"""Resolve the 3 LOMA partner accounts to REAL Phuket places via Places API (New).
Keeps mock credentials; replaces name/geo/address/rating/photo with real data.
"""
import os, json, urllib.request, urllib.error, shutil

KEY = os.environ["GMAPS_KEY"]
APP = "C:/Projects/phuket/loma-app/"
PHK = dict(lat_lo=7.35, lat_hi=8.35, lng_lo=98.15, lng_hi=98.60)

FIELDS = ",".join("places." + f for f in [
    "id", "displayName", "formattedAddress", "location", "rating",
    "userRatingCount", "photos", "primaryTypeDisplayName", "googleMapsUri",
    "websiteUri", "nationalPhoneNumber",
])

# archetype -> search query (keep the account's identity/creds, swap the place)
ARCHETYPES = [
    dict(id="seabreeze", query="boutique hotel Patong Beach Phuket",
         type="Hotel", area="Patong", user="seabreeze", pass_="breeze2026",
         staff="Jirawan D.", staffInit="JD", staffCount=3, inviteCode="SEABREEZE24"),
    dict(id="kata", query="hostel Kata Beach Phuket",
         type="Hostel", area="Kata", user="katahostel", pass_="kata2026",
         staff="Nattapong S.", staffInit="NS", staffCount=2, inviteCode="KATA24"),
    dict(id="rawai", query="motorbike scooter rental Rawai Phuket",
         type="Motorbike rental", area="Rawai", user="rawairental", pass_="rawai2026",
         staff="Somchai P.", staffInit="SP", staffCount=1, inviteCode="RAWAI24"),
]


def post(url, body, mask):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY,
                 "X-Goog-FieldMask": mask}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"_error": e.read().decode("utf-8", "replace")}


def in_phuket(loc):
    la, ln = loc.get("latitude"), loc.get("longitude")
    return la and PHK["lat_lo"] <= la <= PHK["lat_hi"] and PHK["lng_lo"] <= ln <= PHK["lng_hi"]


def photo_uri(name, px=1200):
    url = f"https://places.googleapis.com/v1/{name}/media?maxHeightPx={px}&skipHttpRedirect=true&key={KEY}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r).get("photoUri")
    except Exception:
        return None


os.makedirs(APP + "public/accounts", exist_ok=True)
out = []
for a in ARCHETYPES:
    res = post("https://places.googleapis.com/v1/places:searchText",
               {"textQuery": a["query"], "languageCode": "en", "maxResultCount": 8,
                "locationBias": {"circle": {"center": {"latitude": 7.9, "longitude": 98.35},
                                            "radius": 40000.0}}}, FIELDS)
    if "_error" in res:
        print("!! error", a["id"], res["_error"][:200]); continue
    cands = [c for c in res.get("places", []) if in_phuket(c.get("location", {}))]
    # prefer well-reviewed, well-rated
    cands = [c for c in cands if (c.get("userRatingCount") or 0) >= 20] or cands
    cands.sort(key=lambda c: ((c.get("rating") or 0), (c.get("userRatingCount") or 0)), reverse=True)
    if not cands:
        print("!! no candidate for", a["id"]); continue
    c = cands[0]
    loc = c["location"]
    photo = None
    if c.get("photos"):
        uri = photo_uri(c["photos"][0]["name"])
        if uri:
            fp = APP + f"public/accounts/{a['id']}.jpg"
            try:
                urllib.request.urlretrieve(uri, fp)
                photo = f"/accounts/{a['id']}.jpg"
            except Exception as e:
                print("  photo dl failed:", e)
    acc = {
        "id": a["id"],
        "name": c["displayName"]["text"],          # REAL place name
        "type": a["type"], "area": a["area"],
        "user": a["user"], "pass": a["pass_"],      # mock creds, unchanged
        "staff": a["staff"], "staffInit": a["staffInit"], "staffCount": a["staffCount"],
        "status": "approved", "level": "verified", "kind": "org",
        "inviteCode": a["inviteCode"],
        # real geo + google data
        "placeId": c["id"],
        "lat": loc["latitude"], "lng": loc["longitude"],
        "address": c.get("formattedAddress", ""),
        "rating": c.get("rating"), "reviews": c.get("userRatingCount"),
        "primaryType": (c.get("primaryTypeDisplayName") or {}).get("text", ""),
        "mapsUrl": c.get("googleMapsUri", ""),
        "website": c.get("websiteUri", ""),
        "phone": c.get("nationalPhoneNumber", ""),
        "photo": photo,
        "housePicks": [],   # filled by the housePicks generator
    }
    out.append(acc)
    print(f"{a['id']:10s} -> {acc['name']}  ({acc['rating']}* x{acc['reviews']})  @{acc['lat']:.5f},{acc['lng']:.5f}")

with open(APP + "src/data/accounts.real.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("\nwrote src/data/accounts.real.json —", len(out), "accounts")
