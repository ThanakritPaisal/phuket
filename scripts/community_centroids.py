#!/usr/bin/env python3
"""Compute each community's location as the MEDIAN lat/lng of its member providers
(after dropping any point outside the Phuket bounding box). Median + bbox filter is
robust to a single mis-matched member coordinate that would skew a plain average."""
import json

APP = "C:/Projects/phuket/loma-app/"
# Phuket bounding box — anything outside is a bad match, excluded before averaging.
LA0, LA1, LN0, LN1 = 7.35, 8.35, 98.15, 98.60

def median(xs):
    xs = sorted(xs); n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2

providers = {p["id"]: p for p in json.load(open(APP + "src/data/providers.json", encoding="utf-8"))}
comms = json.load(open(APP + "src/data/v2/communities.json", encoding="utf-8"))

for c in comms:
    pts = [(providers[m]["lat"], providers[m]["lng"]) for m in c["memberIds"]
           if m in providers and providers[m].get("lat") and providers[m].get("lng")
           and LA0 <= providers[m]["lat"] <= LA1 and LN0 <= providers[m]["lng"] <= LN1]
    if pts:
        c["lat"] = round(median([p[0] for p in pts]), 6)
        c["lng"] = round(median([p[1] for p in pts]), 6)
        src = f"median of {len(pts)} member businesses"
    else:
        c["lat"], c["lng"] = None, None
        src = "no located members"
    print(f"{c['id']:<13} {str(c['lat']):<11},{str(c['lng']):<11}  ({src})")

json.dump(comms, open(APP + "src/data/v2/communities.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\nwrote lat/lng to communities.json")
