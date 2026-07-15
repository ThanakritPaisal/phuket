#!/usr/bin/env python3
"""Backfill the spec's missing provider fields onto providers.json:
  estimated_visit_duration_min/max, wheelchair_accessibility, elderly_suitability,
  verification_status.

Rule from the spec: "Unknown != No != Yes." We NEVER guess accessibility from photos
or reviews. Duration is a category benchmark (allowed for demo). Accessibility/elderly
are DEMO SEED values (deterministic per id) so the accessibility matching scenario has
data to work with — a good chunk stays `unknown`, which is the honest default. All
records are `verification_status = unverified` until a human/partner confirms.
"""
import json

APP = "C:/Projects/phuket/loma-app/"

# category benchmark durations (minutes), min/max — from the spec table
DUR = {
    "Local Food": (60, 90),
    "Souvenir & Local Product": (20, 45),
    "Massage & Wellness": (60, 120),
    "Community Experience": (180, 480),
    "Boat / Sea": (180, 480),
}
GROUND = {"Local Food", "Souvenir & Local Product", "Massage & Wellness"}  # walk-in shops


def h(s: str) -> int:
    x = 2166136261
    for ch in s:
        x ^= ord(ch)
        x = (x * 16777619) & 0xFFFFFFFF
    return x


providers = json.load(open(APP + "src/data/providers.json", encoding="utf-8"))
counts = {"wheelchair": {}, "elderly": {}}
for p in providers:
    cat = p.get("category", "Local Food")
    emo = p.get("emo", "")
    # duration (café ☕ is quicker than a sit-down meal)
    dmin, dmax = (30, 60) if emo == "☕" else DUR.get(cat, (45, 75))
    p["estimated_visit_duration_min"] = dmin
    p["estimated_visit_duration_max"] = dmax

    hw = h("wheel|" + p["id"]) % 10
    he = h("eld|" + p["id"]) % 10
    if cat in GROUND:
        wheel = "full" if hw < 4 else "partial" if hw < 6 else "unknown"
        eld = "suitable" if he < 5 else "conditional" if he < 7 else "unknown"
    else:  # community experience / boat — outdoor, walking, boats
        wheel = "not_accessible" if hw < 3 else "unknown" if hw < 7 else "partial"
        eld = "not_suitable" if he < 3 else "conditional" if he < 6 else "unknown"
    p["wheelchair_accessibility"] = wheel
    p["elderly_suitability"] = eld
    p["verification_status"] = "unverified"  # honest baseline — nothing human-confirmed yet
    counts["wheelchair"][wheel] = counts["wheelchair"].get(wheel, 0) + 1
    counts["elderly"][eld] = counts["elderly"].get(eld, 0) + 1

json.dump(providers, open(APP + "src/data/providers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("updated", len(providers), "providers")
print("wheelchair:", counts["wheelchair"])
print("elderly:", counts["elderly"])
