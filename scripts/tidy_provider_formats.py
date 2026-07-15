#!/usr/bin/env python3
"""Tidy provider field formats to match the spec:
  - price_range: enum budget/moderate/premium/unknown  (from the ฿ price)
  - contact_method: {type, value}                       (from phone / website)
  - opening_hours: {open_time, close_time, closed_days} (parsed from the hours strings)
The raw fields (price, phone, hours[]) are kept for display; these add structured forms.
"""
import json, re

APP = "C:/Projects/phuket/loma-app/"
PRICE_RANGE = {"": "unknown", "Free": "budget", "฿": "budget", "฿฿": "moderate", "฿฿฿": "premium", "฿฿฿฿": "premium"}
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DAY_TH = {"จันทร์": "monday", "อังคาร": "tuesday", "พุธ": "wednesday", "พฤหัส": "thursday",
          "ศุกร์": "friday", "เสาร์": "saturday", "อาทิตย์": "sunday"}
TIME = re.compile(r"(\d{1,2})[:.](\d{2})")


def parse_hours(hours):
    """Best-effort: earliest open, latest close, and days marked closed."""
    opens, closes, closed = [], [], []
    for line in hours or []:
        low = line.lower()
        day = next((en for th, en in DAY_TH.items() if th in line), None) or \
              next((d for d in DAYS if d in low), None)
        if re.search(r"closed|ปิด", low) and not TIME.search(line):
            if day:
                closed.append(day)
            continue
        times = TIME.findall(line)
        if len(times) >= 2:
            opens.append(int(times[0][0]) * 60 + int(times[0][1]))
            closes.append(int(times[-1][0]) * 60 + int(times[-1][1]))
    fmt = lambda m: f"{m // 60:02d}:{m % 60:02d}"
    return {
        "open_time": fmt(min(opens)) if opens else None,
        "close_time": fmt(max(closes)) if closes else None,
        "closed_days": sorted(set(closed), key=DAYS.index),
    }


providers = json.load(open(APP + "src/data/providers.json", encoding="utf-8"))
for p in providers:
    p["price_range"] = PRICE_RANGE.get(p.get("price", ""), "unknown")
    if p.get("phone"):
        p["contact_method"] = {"type": "phone", "value": p["phone"]}
    elif p.get("website"):
        p["contact_method"] = {"type": "website", "value": p["website"]}
    else:
        p["contact_method"] = {"type": "none", "value": ""}
    p["opening_hours"] = parse_hours(p.get("hours"))

json.dump(providers, open(APP + "src/data/providers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
from collections import Counter
print("updated", len(providers))
print("price_range:", dict(Counter(p["price_range"] for p in providers)))
print("contact types:", dict(Counter(p["contact_method"]["type"] for p in providers)))
print("with parsed close_time:", sum(1 for p in providers if p["opening_hours"]["close_time"]))
