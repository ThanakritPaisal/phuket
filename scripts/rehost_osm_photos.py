#!/usr/bin/env python3
"""Download OSM-sample provider photos (googleusercontent URLs) and stage them for
upload to the GCS bucket; rewrite providers.json + communities.json to bucket paths."""
import json, os, urllib.request

APP = "C:/Users/fin_t/AppData/Local/Temp/claude/c--Projects-phuket/21557e49-9274-4641-b0a9-0635cff58a35/scratchpad/"
PROV = "C:/Projects/phuket/loma-app/src/data/providers.json"
COMMS = "C:/Projects/phuket/loma-app/src/data/v2/communities.json"
STAGE = APP + "osm_photos/"
os.makedirs(STAGE, exist_ok=True)

providers = json.load(open(PROV, encoding="utf-8"))
ok, fail = 0, 0
for p in providers:
    if p.get("source") in ("osm_bulk", "osm_sample") and str(p.get("photo") or "").startswith("http"):
        dest = STAGE + p["id"] + ".jpg"
        try:
            req = urllib.request.Request(p["photo"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=40) as r, open(dest, "wb") as f:
                f.write(r.read())
            p["photo"] = f"/providers/{p['id']}.jpg"   # bucket-relative, resolved by assetUrl
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 5: print("  ! dl fail", p["id"], str(e)[:80])
json.dump(providers, open(PROV, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# fix community hero images that pointed at googleusercontent -> first member's new path
photo_by_id = {p["id"]: p.get("photo") for p in providers}
comms = json.load(open(COMMS, encoding="utf-8"))
fixed = 0
for c in comms:
    if str(c.get("img") or "").startswith("http") and "googleusercontent" in c["img"]:
        rel = next((photo_by_id[m] for m in c["memberIds"] if photo_by_id.get(m, "").startswith("/providers/")), None)
        if rel:
            c["img"] = rel; fixed += 1
json.dump(comms, open(COMMS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"downloaded {ok} photos (failed {fail}); community imgs fixed {fixed}")
print("staged at:", STAGE)
