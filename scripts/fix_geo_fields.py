#!/usr/bin/env python3
"""Geo cleanup + proper admin fields (free — no API calls).

1. Drops records whose coords fall outside the Phuket province bbox (bad Google
   matches from locationBias; e.g. same-named shops in Chiang Mai / Samui).
2. Adds `district` (amphoe) + `tambon` (subdistrict) parsed from the Google address,
   mapped to Phuket's official 3 districts / 17 tambon.

Writes loma-app/src/data/providers.json and prints the removed ids (for DB deletion).
"""
import json, sys

PROV = "C:/Projects/phuket/loma-app/src/data/providers.json"
BBOX = (7.72, 8.22, 98.22, 98.46)  # latmin, latmax, lngmin, lngmax

# ORDER MATTERS: "Kathu" is both a district AND a tambon, so the specific tambon
# (Patong, Kamala) must be tested before it, else "Patong, Kathu District" -> Kathu.
TAMBON = [
    ("Patong", "Kathu", ["ป่าตอง", "patong"]),
    ("Kamala", "Kathu", ["กมลา", "kamala"]),
    ("Karon", "Mueang Phuket", ["กะรน", "karon"]),
    ("Rawai", "Mueang Phuket", ["ราไวย์", "rawai"]),
    ("Chalong", "Mueang Phuket", ["ฉลอง", "chalong"]),
    ("Talat Yai", "Mueang Phuket", ["ตลาดใหญ่", "talat yai", "talad yai"]),
    ("Talat Nuea", "Mueang Phuket", ["ตลาดเหนือ", "talat nuea", "talad nua", "talad neua"]),
    ("Ko Kaeo", "Mueang Phuket", ["เกาะแก้ว", "ko kaeo", "koh kaew", "ko kaew"]),
    ("Ratsada", "Mueang Phuket", ["รัษฎา", "ratsada", "rassada"]),
    ("Wichit", "Mueang Phuket", ["วิชิต", "wichit", "vichit"]),
    ("Choeng Thale", "Thalang", ["เชิงทะเล", "choeng thale", "cherng talay", "cherngtalay"]),
    ("Si Sunthon", "Thalang", ["ศรีสุนทร", "si sunthon", "srisoonthorn", "sri soonthorn"]),
    ("Thep Krasattri", "Thalang", ["เทพกระษัตรี", "thep krasattri", "thepkrasattri", "thep krasatti"]),
    ("Pa Khlok", "Thalang", ["ป่าคลอก", "pa khlok", "paklok"]),
    ("Mai Khao", "Thalang", ["ไม้ขาว", "mai khao", "maikhao"]),
    ("Sakhu", "Thalang", ["สาคู", "sakhu", "sakoo", "sa khu", "sa-khu"]),
    ("Kathu", "Kathu", ["กะทู้", "kathu"]),  # last — district-name collision
]
# District fallback when no tambon matches but the amphoe is in the address.
DISTRICT_ONLY = [
    ("Mueang Phuket", ["อำเภอเมืองภูเก็ต", "เมืองภูเก็ต", "mueang phuket", "muang phuket"]),
    ("Thalang", ["อำเภอถลาง", "ถลาง", "thalang"]),
    ("Kathu", ["อำเภอกะทู้", "kathu district"]),
]


def outside_phuket(p):
    """True only for records that HAVE coords which fall outside Phuket (bad matches).
    Records with no coords are incomplete, not wrong — keep them."""
    la, lo = p.get("lat"), p.get("lng")
    if not (isinstance(la, (int, float)) and isinstance(lo, (int, float))):
        return False
    return not (BBOX[0] <= la <= BBOX[1] and BBOX[2] <= lo <= BBOX[3])


def parse_admin(addr):
    a = (addr or "").lower()
    for en, d, variants in TAMBON:
        if any(v.lower() in a for v in variants):
            return d, en
    for d, variants in DISTRICT_ONLY:
        if any(v.lower() in a for v in variants):
            return d, None
    return None, None


# Source of truth = the DB (pristine 1,255). Strip the bulky full-only fields that
# belong in the DB but not the client bundle.
sys.path.insert(0, "C:/Projects/phuket/loma-app/logging-api")
from db import get_conn, PROVIDER_TABLE  # noqa: E402

DROP_FIELDS = {"reviews_text", "matched_name", "business_status"}
with get_conn() as conn:
    rows = [r["data"] for r in conn.execute(f"SELECT data FROM {PROVIDER_TABLE}").fetchall()]
for p in rows:
    for k in DROP_FIELDS:
        p.pop(k, None)
print(f"loaded {len(rows)} from the DB")

dropped = [p for p in rows if outside_phuket(p)]
kept = [p for p in rows if not outside_phuket(p)]

tagged = 0
for p in kept:
    d, t = parse_admin(p.get("address"))
    if d:
        p["district"] = d
        tagged += 1
    if t:
        p["tambon"] = t

json.dump(kept, open(PROV, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

from collections import Counter
print(f"dropped (outside Phuket bbox): {len(dropped)}")
for p in dropped:
    print(f"   - {p['id']}  {p['name'][:32]}  ({p.get('lat')},{p.get('lng')})")
print(f"\nkept: {len(kept)} | district tagged: {tagged} | tambon tagged: {sum(1 for p in kept if p.get('tambon'))}")
print("\ndistrict distribution:", dict(Counter(p.get("district") for p in kept if p.get("district"))))
print("tambon coverage:", len({p['tambon'] for p in kept if p.get('tambon')}), "/ 17")
# emit removed ids for the DB delete step
open("C:/Projects/phuket/removed_ids.json", "w").write(json.dumps([p["id"] for p in dropped]))
print("\nremoved ids -> removed_ids.json")
