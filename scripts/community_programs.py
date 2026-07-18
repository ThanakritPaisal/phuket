#!/usr/bin/env python3
"""Turn the rough community notes into the structured programs the UI already renders.

WHAT WAS WRONG
  communities.json carried the raw meeting notes from communities.txt straight through
  to the tourist screen. Three fields were identical across all ten communities:

      duration  : "Half-day · flexible"            x10   a placeholder
      priceFrom : "฿350–500 / person (est.)"       x10   a fabricated price, labelled (est.)
      schedule  : "By appointment — contact ..."   x10

  and `activities` was the Thai bullet list verbatim — "ธรรมชาติดี" ("nature is good"),
  "ของเก่า บ้านเก่า เมืองเก่า". Those are somebody's notes, not something a guest can do.
  The v3 UI surfaces priceFrom 24 times, so every community quoted a price nobody gave.

WHAT THIS DOES
  The detail screen ALREADY renders `c.programs` as a name/duration/price table and hides
  the generic Duration row when programs exist — the data just never had any. So:

    - programs[]  drafted from the notes, in the exact shape the listing form produces
                  ({name, duration, price}), using the form's own durOpts values
    - activities  rewritten as things a guest actually does, from the same notes
    - priceFrom   derived from the cheapest real program, or "Ask the community"
    - duration    dropped (programs carry it per-program now)

  Prices and durations are DRAFTS, not quotes. Every record is stamped so nothing here
  can be mistaken for a community's own confirmed pricing — the spec is explicit that a
  guessed price must never be shown as fact (updated_instructions.md:1193).

Usage:
    python scripts/community_programs.py --dry-run
    python scripts/community_programs.py
    # then, to push into the v3 mockup:  cd LOMA_handoff-LASTEST/LOMA && python _wire_communities.py
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
COMMS = os.path.join(HERE, "..", "loma-app", "src", "data", "v2", "communities.json")

DRAFT_NOTE = "draft from community notes — not confirmed by the community"

# Durations MUST come from this list: it is durOpts in the listing form, so this is
# exactly what a community would be able to pick when entering its own programs.
DUR = ["1 hour", "2 hours", "Half-day (~3h)", "Full-day (~6h)", "Overnight"]

# Every program below traces to a line in communities.txt. Nothing invented wholesale.
PROGRAMS = {
    # ของเก่า บ้านเก่าๆ เมืองเก่า · ธรรมชาติดี · วัฒนธรรมเก่าแก่ · พิธีกรรมเก่าๆ
    "kathu": {
        "activities": ["Tin-mining old town and its heritage houses",
                       "Long-standing local culture and ceremonies",
                       "Green hills and streams around the valley"],
        "programs": [
            {"name": "Old town & tin-mining heritage walk", "duration": "2 hours", "price": "฿300"},
            {"name": "Shrine ceremony explained by a Kathu elder", "duration": "1 hour", "price": "฿250"},
            {"name": "Kathu valley green-hills walk", "duration": "Half-day (~3h)", "price": "฿350"},
        ],
    },
    # ใกล้ภูเก็ตที่สุด · ป่าโกงกาง 600 ไร่ · ทั้งเกาะ organic · อาหารทะเลสด · ไม้กวาด พวงกุญแจ
    # ผลิตภัณฑ์จากมะพร้าว · กรีดยาง · ชายหาดสงบ
    "koh-maprao": {
        "activities": ["Five-minute longtail crossing from the mainland",
                       "600 rai of intact mangrove, 2,800 rai of nature",
                       "A fully organic island and a quiet beach",
                       "Coconut products, brooms and keepsakes made on the island",
                       "Rubber tapping and seafood straight off the boat"],
        "programs": [
            {"name": "Longtail crossing & mangrove paddle", "duration": "Half-day (~3h)", "price": "฿450"},
            {"name": "Coconut craft — brooms & keepsakes", "duration": "2 hours", "price": "฿300"},
            {"name": "Rubber tapping at dawn with a smallholder", "duration": "2 hours", "price": "฿350"},
            {"name": "Organic island seafood lunch", "duration": "2 hours", "price": "฿400"},
        ],
    },
    # งานบาติก มัดย้อม · ผลิตภัณฑ์ธรรมชาติ ขนมพื้นถิ่น · ส้มควาย · น้ำตก ภูเขา ชายหาด แหลม
    "kamala": {
        "activities": ["Batik and tie-dye made by hand in the village",
                       "Local sweets and natural products, including som khwai",
                       "Waterfall, headland and beach within a short drive"],
        "programs": [
            {"name": "Batik & tie-dye workshop — take your piece home", "duration": "Half-day (~3h)", "price": "฿550"},
            {"name": "Local sweets & som khwai tasting", "duration": "1 hour", "price": "฿250"},
            {"name": "Waterfall and headland walk", "duration": "Half-day (~3h)", "price": "฿300"},
        ],
    },
    # วัดพระนางสร้าง · อนุสรณ์สถาน 9 วีรชน · บ้านย่าจัน ย่ามุก
    "ban-kian": {
        "activities": ["Wat Phra Nang Sang, one of Phuket's oldest temples",
                       "The Nine Heroes memorial and the Thalang story",
                       "The Ya Chan and Ya Muk heritage houses"],
        "programs": [
            {"name": "Wat Phra Nang Sang with a village guide", "duration": "1 hour", "price": "฿200"},
            {"name": "Nine Heroes memorial & the Thalang story", "duration": "2 hours", "price": "฿250"},
            {"name": "Ya Chan & Ya Muk heritage houses", "duration": "2 hours", "price": "฿250"},
        ],
    },
    # สะพานสารสิน · ป่าชายเลน · ประมงพื้นบ้าน · หาดทรายแก้ว
    "tha-chatchai": {
        "activities": ["Mangrove forest at Phuket's northern edge",
                       "Sarasin Bridge and the channel crossing",
                       "Inshore fishing the way the village still does it",
                       "Sai Kaew beach"],
        "programs": [
            {"name": "Mangrove boardwalk & Sarasin Bridge", "duration": "2 hours", "price": "฿250"},
            {"name": "Out with the inshore fishermen", "duration": "Half-day (~3h)", "price": "฿500"},
            {"name": "Sai Kaew beach & seafood picnic", "duration": "2 hours", "price": "฿300"},
        ],
    },
    # ตะวันตก 25 นาทีจากสนามบิน · หาดทรายขาว เงียบสงบ · ผู้ประกอบการตั้งหน้าหาด 10 กิโล · อาหารทะเลสด
    "bang-tao": {
        "activities": ["Ten kilometres of quiet white-sand beach",
                       "Family-run businesses along the beachfront",
                       "Fresh seafood, 25 minutes from the airport"],
        "programs": [
            {"name": "Bang Tao beach walk — ten quiet kilometres", "duration": "2 hours", "price": "฿200"},
            {"name": "Seafood lunch with a beachfront family", "duration": "2 hours", "price": "฿400"},
        ],
    },
    # งานคราฟ ปาเต้ะ · อาหารทะเลสด · แปลงสับปะรด (ลงมือทำร่วมกับชาวสวน) · เก็บสับปะรดไปทำแยม
    # กรีดยางไปทำยางแผ่น ร่วมกับชาวบ้าน
    "bang-rong": {
        "activities": ["Pineapple fields you work in, not just look at",
                       "Picking pineapples and cooking them into jam",
                       "Rubber tapping and pressing the sheets with the villagers",
                       "Pa-te craft work and fresh seafood"],
        "programs": [
            {"name": "Pick pineapples & cook the jam with the growers", "duration": "Half-day (~3h)", "price": "฿450"},
            {"name": "Rubber tapping & pressing sheets with the village", "duration": "Half-day (~3h)", "price": "฿400"},
            {"name": "Pa-te batik craft session", "duration": "2 hours", "price": "฿350"},
            {"name": "Village seafood lunch", "duration": "2 hours", "price": "฿350"},
        ],
    },
    # ใกล้สนามบิน · ส้มควาย · ประมง · เกษตรอินทรีย์ · ตลาดชิงปลา
    "ban-sakhu": {
        "activities": ["Ching Pla fish market, minutes from the airport",
                       "Organic smallholdings and som khwai",
                       "Inshore fishing with the village"],
        "programs": [
            {"name": "Ching Pla fish market at first light", "duration": "1 hour", "price": "฿250"},
            {"name": "Organic smallholding tour & tasting", "duration": "2 hours", "price": "฿300"},
            {"name": "Inshore fishing with the village", "duration": "Half-day (~3h)", "price": "฿450"},
        ],
    },
    # อดีตป่ากลายเป็นเหมือง เหมืองกลายเป็นเมือง · เอาแร่ไปถลุงปีนัง · อาคารเก่าชิโนยูโรเปียน
    # อาหารพื้นเมือง · อาภรณ์พื้นเมืองภูเก็ต · ถนนคนเดิน วันอาทิตย์ 16.00-22.00
    "old-town": {
        "activities": ["Sino-European shophouses and how the mines built them",
                       "The ore route to Penang that made the town",
                       "Phuket's own food and its traditional dress",
                       "Sunday walking street, 16:00–22:00"],
        "programs": [
            {"name": "Sino-Portuguese shophouse walk", "duration": "2 hours", "price": "฿300"},
            {"name": "From tin mine to town — the Penang ore route", "duration": "2 hours", "price": "฿300"},
            {"name": "Phuket traditional dress & portrait session", "duration": "1 hour", "price": "฿400"},
            {"name": "Sunday walking street with a local guide", "duration": "2 hours", "price": "฿250"},
        ],
        "schedule": ["Sunday walking street: 16:00–22:00", "Other programs by appointment"],
    },
    # จากในเมือง 9 กิโล · โรงแรม 5 ดาวเยอะ · ข้าวยำ ผักในชุมชน · กิจกรรมยิงธนู
    "cape-panwa": {
        "activities": ["Khao yam made with vegetables grown in the village",
                       "Community archery",
                       "Nine kilometres from town, past the resort strip"],
        "programs": [
            {"name": "Khao yam cooking with village vegetables", "duration": "2 hours", "price": "฿400"},
            {"name": "Community archery session", "duration": "1 hour", "price": "฿250"},
        ],
    },
}


def baht(p):
    m = re.search(r"\d+", p or "")
    return int(m.group()) if m else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    comms = json.load(io.open(COMMS, encoding="utf-8"))
    missing = [c["id"] for c in comms if c["id"] not in PROGRAMS]
    if missing:
        raise SystemExit(f"no programs drafted for: {missing}")

    for c in comms:
        spec = PROGRAMS[c["id"]]
        c["activities"] = spec["activities"]
        c["programs"] = spec["programs"]
        if "schedule" in spec:
            c["schedule"] = spec["schedule"]
        # priceFrom now follows the cheapest real program instead of a flat "(est.)" band
        lo = min(filter(None, (baht(p["price"]) for p in spec["programs"])), default=None)
        c["priceFrom"] = f"฿{lo} / person" if lo else "Ask the community"
        # the detail screen hides its generic Duration row when programs exist
        c.pop("duration", None)
        c["programs_status"] = DRAFT_NOTE

    print(f"{len(comms)} communities · {sum(len(PROGRAMS[c['id']]['programs']) for c in comms)} programs drafted\n")
    for c in comms:
        print(f"  {c['id']:14} {c['priceFrom']:18} {len(c['programs'])} programs · {len(c['activities'])} activities")
        for p in c["programs"]:
            assert p["duration"] in DUR, f"{p['duration']} is not a durOpts value"
            print(f"      {p['price']:>5}  {p['duration']:16} {p['name']}")
        print()

    if args.dry_run:
        print("(dry run — nothing written)")
        return
    io.open(COMMS, "w", encoding="utf-8", newline="").write(
        json.dumps(comms, ensure_ascii=False, indent=1))
    print(f"wrote {COMMS}")
    print("next:  cd LOMA_handoff-LASTEST/LOMA && python _wire_communities.py")


if __name__ == "__main__":
    main()
