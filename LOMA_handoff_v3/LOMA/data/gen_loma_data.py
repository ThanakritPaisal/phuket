#!/usr/bin/env python3
"""LOMA mock data generator — Phuket Local Operator Matching Assistant.
Produces 5 referentially-consistent JSON files matching the prototype schema.
Deterministic (seeded) so re-runs are stable.
"""
import json, random, os, math
from datetime import datetime, timedelta

random.seed(42)
OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- reference data
AREAS = [
    # (area, map x%, y%)  -- stylised Phuket map coordinates
    ("Patong", 38, 50), ("Kata", 44, 66), ("Karon", 42, 60), ("Kamala", 36, 40),
    ("Surin", 35, 34), ("Bang Tao", 36, 28), ("Phuket Old Town", 62, 46),
    ("Rawai", 52, 82), ("Nai Harn", 46, 84), ("Chalong", 56, 70),
    ("Kathu", 46, 52), ("Nai Yang", 40, 18), ("Mai Khao", 42, 10),
    ("Cape Panwa", 70, 78), ("Thalang", 50, 26),
]

# category -> (emoji, name templates, price tier weights, best-for pool)
CATEGORIES = {
    "Local Food":            ("🍜", ["Baan {x} Kitchen","{x} Seafood House","Krua {x}","{x} Noodle Bar","Roti {x}","{x} Curry Shack"]),
    "Café":                  ("☕", ["{x} Coffee Roasters","Kopi {x}","{x} Dessert Café","Café {x}","{x} Tea House"]),
    "Massage & Wellness":    ("💆", ["{x} Herbal Massage","{x} Thai Spa","{x} Wellness House","Baan {x} Spa","{x} Healing"]),
    "Souvenir & Local Product": ("🎁", ["{x} Craft House","{x} Batik Studio","{x} Pearl Gallery","{x} Artisan Shop","{x} Ceramics"]),
    "Community Experience":   ("🛶", ["{x} Fisherfolk Experience","{x} Village Walk","{x} Coconut Workshop","{x} Rice Farm Visit","{x} Heritage Tour"]),
    "Local Guide":           ("🧭", ["{x} Local Guides","Walk with {x}","{x} Story Tours","{x} Foot Tours"]),
    "Boat / Sea":            ("⛵", ["{x} Longtail Trips","{x} Island Hopping","{x} Sea Kayak","{x} Fishing Charter"]),
    "Local Market":          ("🧺", ["{x} Morning Market","{x} Night Market Walk","{x} Fresh Market","{x} Walking Street"]),
    "Cooking Class":         ("🍳", ["{x} Cooking School","Cook with {x}","{x} Thai Kitchen Class"]),
    "Bar & Live Music":      ("🎶", ["{x} Reggae Bar","{x} Jazz Corner","{x} Rooftop","{x} Beach Bar"]),
}

# Thai-flavoured name fillers
FILLERS = ["Talay","Suan","Rim","Phuket","Andaman","Lay","Nok","Khao","Mali","Sai","Chan","Ploen",
    "Lumphun","Sri","Thep","Bua","Rak","Dao","Mek","Tara","Kram","Yaowarat","Sino","Lipa","Naka",
    "Panya","Som","Maprao","Lamai","Kanom","Krabok","Hua","Lung","Pa","Ta","Yai","Nong","Baan Suan"]

NATIONALITIES = [
    ("Chinese",0.14),("Russian",0.12),("Australian",0.09),("German",0.08),("British",0.08),
    ("Indian",0.07),("French",0.06),("American",0.06),("South Korean",0.05),("Malaysian",0.05),
    ("Israeli",0.04),("Scandinavian",0.04),("Singaporean",0.03),("Italian",0.03),("Thai (domestic)",0.06),
]
PARTY_TYPES = ["solo","couple","family","friends group"]
LANGS = ["Thai · English menu","Thai · English","Thai · English · basic Russian",
    "Thai · English · Chinese","Thai · basic English","Thai · English · LINE translate"]
PRICE_TIERS = [("฿","฿60–150"),("฿฿","฿150–350 / person"),("฿฿","฿300–600 / hour"),
    ("฿฿฿","฿600–1,500 / person")]
BOOKINGS = ["Walk-in welcome","Walk-in welcome · booking for groups 6+","Booking recommended",
    "Booking required","Book ahead on LINE"]
CONTACTS = ["Phone · WhatsApp","Phone · LINE","Phone · LINE · WhatsApp","LINE","Phone"]
BESTFOR = ["families","couples","solo travelers","local food","rainy day","groups","budget","foodies"]
VETTING = ["verified","verified","verified","verified","pending","needs review"]  # weighted toward verified
PARTNER_TYPES = ["Hotel front desk","Hostel","Guesthouse","Villa manager","Motorbike rental",
    "Car rental","Dive shop","Tour desk"]
STAFF_ROLES = ["Front-desk","Concierge","Guest relations","Rental staff","Tour desk","Owner / manager"]
THAI_FIRST = ["Somchai","Nok","Aor","Ploy","Beam","Pim","Kai","Mai","Tan","Fern","Aon","Boss",
    "Nan","Praew","Win","Gift","Mint","Earth","Bank","Tee","Ja","Bow","Net","June","Tom"]
THAI_LAST = ["S.","T.","P.","K.","W.","R.","C.","N.","L.","M."]
IMG_POOL = [
    "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=70",
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=70",
    "https://images.unsplash.com/photo-1545579133-99bb5ab189bd?w=800&q=70",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=70",
    "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=70",
    "https://images.unsplash.com/photo-1457530378978-8bac673b8062?w=800&q=70",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=70",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=70",
]

def wpick(weighted):
    r = random.random(); c = 0
    for v, w in weighted:
        c += w
        if r <= c: return v
    return weighted[-1][0]

def slug(n):
    return "".join(ch for ch in n.upper() if ch.isalnum())[:3]

# ---------------------------------------------------------------- operators
operators = []
used_ids = set()
N_OPERATORS = 200
cat_names = list(CATEGORIES.keys())
for i in range(N_OPERATORS):
    cat = random.choice(cat_names)
    emo, templates = CATEGORIES[cat]
    name = random.choice(templates).format(x=random.choice(FILLERS))
    # unique id
    base = slug(name) or "OPX"; sid = base; k = 1
    while sid in used_ids:
        sid = base[:2] + str(k); k += 1
    used_ids.add(sid)
    area, mx, my = random.choice(AREAS)
    price, priceText = random.choice(PRICE_TIERS)
    vstatus = random.choice(VETTING)
    verified = vstatus == "verified"
    quality  = random.randint(70, 97)
    locality = random.randint(78, 99)
    readiness= random.randint(68, 96)
    safety   = random.randint(74, 98)
    rating   = round(random.uniform(4.0, 4.9), 1)
    reviews  = random.randint(12, 680)
    leads    = random.randint(3, 130)
    opens    = int(leads * random.uniform(0.6, 0.85))
    visits   = int(opens * random.uniform(0.30, 0.55))
    operators.append({
        "id": sid,
        "name": name,
        "cat": cat,
        "emo": emo,
        "area": area,
        "mapX": mx + random.randint(-4, 4),
        "mapY": my + random.randint(-4, 4),
        "dist": f"{random.randint(4,28)} min by car",
        "price": price,
        "priceText": priceText,
        "open": random.random() > 0.25,
        "hours": random.choice(["08:00 – 17:00","10:00 – 21:00 daily","11:00 – 22:00 daily",
                                 "09:00 – 16:00 · book ahead","Morning & sunset slots","17:00 – 00:00"]),
        "local": True,
        "verified": verified,
        "vettingStatus": vstatus,
        "quality": quality, "locality": locality, "readiness": readiness, "safety": safety,
        "loma_score": round((quality + locality + readiness + safety) / 4, 1),
        "rating": rating,
        "reviews": reviews,
        "branches": 1 if random.random() > 0.12 else random.randint(2,3),
        "lang": random.choice(LANGS),
        "booking": random.choice(BOOKINGS),
        "contact": random.choice(CONTACTS),
        "pick": random.random() < 0.18,
        "bestFor": random.sample(BESTFOR, k=random.randint(2,3)),
        "img": random.choice(IMG_POOL),
        "reason": f"Locally owned {cat.lower()} in {area}, {rating}★ across {reviews} reviews — a genuine local pick.",
        "whyLocal": "Family- or community-run; income stays in the neighbourhood and sourcing is local.",
        "note": random.choice(["Cash preferred.","Card accepted.","Booking recommended on weekends.",
                               "English support is limited — use LINE translate.","Gets busy after 19:00."]),
        "sum": "Consistently praised by travellers for authenticity, fair prices and friendly owners.",
        "leads": leads, "opens": opens, "visits": visits,
        "onboardedDate": (datetime(2025,1,1) + timedelta(days=random.randint(0,520))).strftime("%Y-%m-%d"),
    })

# ---------------------------------------------------------------- staff (demand side)
staff = []
N_STAFF = 50
venue_names = []
for _ in range(N_STAFF):
    venue_names.append(random.choice(["Sea Breeze","Kata","Rawai","Old Town","Bang Tao","Chalong",
        "Andaman","Surin","Patong","Nai Harn","Kamala","Karon"]) + " " +
        random.choice(["Boutique Hotel","Backpackers Hostel","Guesthouse","Villa Mgmt",
        "Scooter Rental","Car Hire","Dive Centre","Tour Desk","Beach Resort","Residence"]))
for i in range(N_STAFF):
    area, _, _ = random.choice(AREAS)
    recs = random.randint(8, 180)
    opens = int(recs * random.uniform(0.62, 0.88))
    visits = int(opens * random.uniform(0.28, 0.5))
    staff.append({
        "id": f"ST{i+1:03d}",
        "name": f"{random.choice(THAI_FIRST)} {random.choice(THAI_LAST)}",
        "role": random.choice(STAFF_ROLES),
        "venue": venue_names[i],
        "venueType": random.choice(PARTNER_TYPES),
        "area": area,
        "languages": random.sample(["Thai","English","Chinese","Russian","German","French"], k=random.randint(2,3)),
        "active": random.random() > 0.15,
        "recs": recs, "opens": opens, "visits": visits,
        "conversionRate": round(visits / recs, 3) if recs else 0,
        "commissionTHB": visits * random.randint(20, 60),
        "joinedDate": (datetime(2025,1,1) + timedelta(days=random.randint(0,520))).strftime("%Y-%m-%d"),
    })

# ---------------------------------------------------------------- tourists
tourists = []
N_TOURISTS = 600
for i in range(N_TOURISTS):
    party = random.choice(PARTY_TYPES)
    size = {"solo":1,"couple":2,"family":random.randint(3,5),"friends group":random.randint(3,6)}[party]
    tourists.append({
        "id": f"TR{i+1:04d}",
        "nationality": wpick(NATIONALITIES),
        "partyType": party,
        "partySize": size,
        "stayArea": random.choice(AREAS)[0],
        "lengthOfStayDays": random.choice([2,3,3,4,5,5,7,7,10,14]),
        "budgetTier": random.choice(["฿","฿฿","฿฿","฿฿฿"]),
        "interests": random.sample(BESTFOR + ["beaches","nightlife","culture","wellness"], k=random.randint(2,4)),
        "firstSeen": (datetime(2026,1,1) + timedelta(days=random.randint(0,170))).strftime("%Y-%m-%d"),
    })

# ---------------------------------------------------------------- recommendations (the core funnel)
recommendations = []
N_RECS = 2200
FUNNEL = ["shared","opened","directions","visited","spent"]
start = datetime(2026,1,1)
for i in range(N_RECS):
    op = random.choice(operators)
    st = random.choice(staff)
    tr = random.choice(tourists)
    # funnel progression with realistic drop-off
    stage_idx = 0
    if random.random() < 0.78: stage_idx = 1            # opened
    if stage_idx == 1 and random.random() < 0.73: stage_idx = 2  # got directions
    if stage_idx == 2 and random.random() < 0.55: stage_idx = 3  # visited (confirmed)
    if stage_idx == 3 and random.random() < 0.72: stage_idx = 4  # logged spend
    ts = start + timedelta(days=random.randint(0,173), hours=random.randint(7,22), minutes=random.randint(0,59))
    recommendations.append({
        "id": f"RC{i+1:05d}",
        "operatorId": op["id"],
        "staffId": st["id"],
        "touristId": tr["id"],
        "category": op["cat"],
        "area": op["area"],
        "channel": random.choice(["QR card","LINE share","WhatsApp","printed card","verbal + QR"]),
        "stage": FUNNEL[stage_idx],
        "opened": stage_idx >= 1,
        "gotDirections": stage_idx >= 2,
        "confirmedVisit": stage_idx >= 3,
        "loggedSpend": stage_idx >= 4,
        "rating": (random.choice([4,5,5,5,3]) if stage_idx >= 3 else None),
        "createdAt": ts.strftime("%Y-%m-%d %H:%M"),
    })

# ---------------------------------------------------------------- transactions (confirmed + spend)
transactions = []
tx_i = 0
SPEND_BY_TIER = {"฿":(80,300),"฿฿":(300,900),"฿฿฿":(900,3500)}
for r in recommendations:
    if not r["loggedSpend"]:
        continue
    tx_i += 1
    op = next(o for o in operators if o["id"] == r["operatorId"])
    lo, hi = SPEND_BY_TIER.get(op["price"], (200, 800))
    spend = random.randint(lo, hi)
    commission = int(spend * random.uniform(0.05, 0.12))
    transactions.append({
        "id": f"TX{tx_i:05d}",
        "recommendationId": r["id"],
        "operatorId": op["id"],
        "staffId": r["staffId"],
        "touristId": r["touristId"],
        "spendTHB": spend,
        "currency": "THB",
        "commissionTHB": commission,
        "localEconomicImpactTHB": spend,  # 100% stays local by LOMA design
        "paymentMethod": random.choice(["cash","cash","QR PromptPay","card"]),
        "confirmedAt": r["createdAt"],
    })

# ---------------------------------------------------------------- write
def dump(name, obj):
    p = os.path.join(OUT, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    return len(obj)

areas = [{"area": a, "x": x, "y": y} for (a, x, y) in AREAS]

counts = {
    "operators.json": dump("operators.json", operators),
    "staff.json": dump("staff.json", staff),
    "tourists.json": dump("tourists.json", tourists),
    "recommendations.json": dump("recommendations.json", recommendations),
    "transactions.json": dump("transactions.json", transactions),
    "areas.json": dump("areas.json", areas),
}

# JS wrapper so the prototype works under file:// (fetch() of local JSON is blocked there)
bundle = {"operators": operators, "staff": staff, "tourists": tourists,
          "recommendations": recommendations, "transactions": transactions, "areas": areas}
with open(os.path.join(OUT, "loma-data.js"), "w", encoding="utf-8") as f:
    f.write("/* LOMA mock data bundle — auto-generated. Loaded by LOMA-prototype.html */\n")
    f.write("window.LOMA_DATA = ")
    json.dump(bundle, f, ensure_ascii=False)
    f.write(";\n")

print(json.dumps(counts, indent=2))
print("total recs by stage:", {s: sum(1 for r in recommendations if r["stage"]==s) for s in FUNNEL})
print("total local impact THB:", sum(t["localEconomicImpactTHB"] for t in transactions))
print("total commission THB:", sum(t["commissionTHB"] for t in transactions))
