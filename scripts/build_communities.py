#!/usr/bin/env python3
"""Build real communities from communities.txt, link them to member providers via
the seed `community` column, and stamp `community`/`communitySlug` onto providers.json."""
import openpyxl, json, os

APP = "C:/Projects/phuket/loma-app/"

# --- 1. provider_id -> seed community name (the join key) ---
wb = openpyxl.load_workbook("C:/Projects/phuket/LOMA_provider_seed_CBT.xlsx", read_only=True, data_only=True)
ws = wb["Provider Seed"]; rows = list(ws.iter_rows(values_only=True)); hdr = rows[0]
pi, ci = hdr.index("provider_id"), hdr.index("community")
seed_comm = {r[pi]: (r[ci] or "") for r in rows[1:] if r and r[pi]}

# --- 2. the 10 communities from communities.txt (bilingual + area + emoji + seed link) ---
# activities = the real Thai highlight bullets; about = concise English gloss.
C = [
 dict(slug="kathu", th="ชุมชนกะทู้", en="Kathu Community", area="Kathu", emo="⛏️", seed=None,
   about="Phuket's old tin-mining heart — heritage houses, an old town, deep-rooted culture and traditional rituals set against green hills.",
   acts=["ของเก่า บ้านเก่า เมืองเก่า","ธรรมชาติดี","วัฒนธรรมเก่าแก่","พิธีกรรมเก่าๆ"]),
 dict(slug="koh-maprao", th="ชุมชนเกาะมะพร้าว", en="Koh Maprao (Coconut Island) Community", area="Koh Maprao", emo="🥥",
   seed="ชุมชนท่องเที่ยวบ้านเกาะมะพร้าว",
   about="The island closest to Phuket — 5 minutes by longtail. 2,800 rai of nature incl. 600 rai of pristine mangrove, fully organic, with a way of life kept whole. It makes 'having nothing like the city' the whole point.",
   acts=["ใกล้ภูเก็ตที่สุด — เรือหางยาวจากฝั่งไม่เกิน 5 นาที","ป่าโกงกาง 600 ไร่ ธรรมชาติ 2,800 ไร่","ทั้งเกาะออร์แกนิก","อาหารทะเลสด แปรรูปอาหารทะเล ผลิตภัณฑ์จากมะพร้าว","ไม้กวาด พวงกุญแจ งานฝีมือ","กรีดยาง ชายหาดสงบ วิถีชุมชน"]),
 dict(slug="kamala", th="ชุมชนกมลา", en="Kamala Community", area="Kamala", emo="🎨",
   seed="ชุมชนท่องเที่ยวบ้านกมลา",
   about="Batik and tie-dye crafts, natural products and local sweets, framed by waterfalls, mountains, beaches and headlands.",
   acts=["งานบาติก มัดย้อม","ผลิตภัณฑ์ธรรมชาติ ขนมพื้นถิ่น","ส้มควาย","น้ำตก ภูเขา ชายหาด แหลม ภูผา"]),
 dict(slug="ban-kian", th="ชุมชนบ้านเคียน", en="Ban Kian Community", area="Thalang", emo="🏛️",
   seed="วิสาหกิจชุมชนท่องเที่ยวบ้านเคียน",
   about="A Thalang heritage village — Wat Phra Nang Sang, the Nine Heroes memorial, and the historic Ya Chan / Ya Muk houses.",
   acts=["วัดพระนางสร้าง","อนุสรณ์สถาน 9 วีรชน","บ้านย่าจัน ย่ามุก"]),
 dict(slug="tha-chatchai", th="ชุมชนบ้านท่าฉัตรชัย", en="Ban Tha Chatchai Community", area="Mai Khao (Thalang)", emo="🌉",
   seed="ชุมชนท่องเที่ยวบ้านท่าฉัตรไชย",
   about="The northern gateway by the Sarasin Bridge — mangrove forest, local fishing, and the Crystal Sand (Sai Kaew) beach.",
   acts=["สะพานสารสิน","ป่าชายเลน","ประมงพื้นบ้าน","หาดทรายแก้ว"]),
 dict(slug="bang-tao", th="ชุมชนบ้านบางเทา", en="Ban Bang Thao Community", area="Bang Tao / Cherng Talay", emo="🏖️",
   seed="ชุมชนท่องเที่ยวบ้านบางเทา",
   about="A quiet white-sand west coast, 25 min from the airport — seafront local operators for 10 km, fresh seafood and everyday village life.",
   acts=["หาดทรายขาว เงียบสงบ","ผู้ประกอบการตั้งหน้าหาด 10 กิโล","อาหารทะเลสด","วิถีชีวิตชุมชน"]),
 dict(slug="bang-rong", th="ชุมชนบ้านบางโรง", en="Ban Bang Rong Community", area="Pa Khlok", emo="🛶",
   seed="วิสาหกิจชุมชนท่องเที่ยวบ้านบางโรง",
   about="A Muslim fishing village in the east-coast mangroves — batik craft and fresh seafood, with hands-on pineapple picking (→ jam) and rubber tapping (→ rubber sheets) alongside the farmers.",
   acts=["งานคราฟ ปาเต๊ะ","อาหารทะเลสด","กิจกรรมเก็บสับปะรดไปทำแยม","กิจกรรมกรีดยางไปทำยางแผ่น ร่วมกับชาวบ้าน"]),
 dict(slug="ban-sakhu", th="ชุมชนบ้านสาคู", en="Ban Sakhu Community", area="Thalang", emo="🐟", seed=None,
   about="A community near the airport — som khwai, local fishing, organic farming and a lively fish-tossing market.",
   acts=["ใกล้สนามบิน","ส้มควาย","ประมง","เกษตรอินทรีย์","ตลาดชิงปลา"]),
 dict(slug="old-town", th="ชุมชนย่านเมืองเก่าภูเก็ต", en="Phuket Old Town Community", area="Old Town", emo="🏘️",
   seed="วิสาหกิจชุมชนท่องเที่ยวย่านเมืองเก่าภูเก็ต",
   about="From tin mines to a Sino-European town — heritage shophouses, Phuket local food and dress, and the Sunday walking street (16:00–22:00).",
   acts=["อาคารเก่า ชิโน-ยูโรเปียน","อาหารพื้นเมือง","อาภรณ์พื้นเมืองภูเก็ต","ถนนคนเดิน วันอาทิตย์ 16.00–22.00"]),
 dict(slug="cape-panwa", th="ชุมชนบ้านแหลมพันวา", en="Ban Laem Phanwa Community", area="Cape Panwa", emo="🏹",
   seed="ชุมชนท่องเที่ยวบ้านแหลมพันวา",
   about="Just 9 km from town — a five-star coastline meets a fishing community with khao yam, community-grown vegetables and archery.",
   acts=["ห่างจากในเมืองแค่ 9 กิโล","ข้าวยำ ผักในชุมชน","กิจกรรมยิงธนู"]),
]

# --- 3. members per community (providers whose seed community == the mapped seed name) ---
providers = json.load(open(APP + "src/data/providers.json", encoding="utf-8"))
seed_to_slug = {c["seed"]: c["slug"] for c in C if c["seed"]}
by_seed = {}
for p in providers:
    sc = seed_comm.get(p["id"], "")
    p["community"] = sc or None                       # real Thai seed community name
    p["communitySlug"] = seed_to_slug.get(sc)         # slug if it's one of the 10, else None
    if p["communitySlug"]:
        by_seed.setdefault(p["communitySlug"], []).append(p)

# --- 4. assemble communities.json ---
out = []
for c in C:
    members = by_seed.get(c["slug"], [])
    # prefer catalog-ready members (HIGH/MED + photo) up front
    members.sort(key=lambda p: (0 if (p.get("photo") and p.get("rating")) else 1, -(p.get("rating") or 0)))
    hero = next((m["photo"] for m in members if m.get("photo")), None)
    out.append({
        "id": c["slug"],
        "name": c["th"],            # Thai (primary)
        "nameEn": c["en"],          # English gloss
        "area": c["area"],
        "emo": c["emo"],
        "img": hero,                # a real member photo (relative /providers/*.jpg) or null
        "about": c["about"],
        "activities": c["acts"],
        "memberIds": [m["id"] for m in members],
        # fields communities.txt doesn't provide — labelled mock:
        "priceFrom": "฿350–500 / person (est.)",
        "duration": "Half-day · flexible",
        "schedule": ["By appointment — contact the community"],
        "phone": "Arrange via LOMA",
    })

json.dump(providers, open(APP + "src/data/providers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(out, open(APP + "src/data/v2/communities.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("communities written:", len(out))
for c in out:
    print(f"  {c['id']:<13} {c['nameEn']:<38} members={len(c['memberIds']):>2}  area={c['area']}")
linked = sum(1 for p in providers if p["communitySlug"])
print(f"\nproviders linked to a community: {linked}/{len(providers)}")
print("unlinked seed communities (not in communities.txt):")
from collections import Counter
un = Counter(seed_comm.get(p['id'],'') for p in providers if not p['communitySlug'] and seed_comm.get(p['id']))
for name, n in un.most_common(): print(f"  {n:>3}  {name}")
