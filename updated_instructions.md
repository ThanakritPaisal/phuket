### 1. “Localness” ไม่ควรเป็นงานข้อที่ 5 แยกออกมา

มันซ้ำกับ `Locality Score` อยู่แล้ว ควรรวมเป็นส่วนหนึ่งของขั้น `Score`

โครงงาน AI ที่ถูกกว่าคือ:

1. **Discover** — ค้นหาร้านใหม่จากหลายแหล่ง
2. **Resolve** — ตรวจว่าข้อมูลหลายแหล่งเป็นร้านเดียวกันหรือไม่
3. **Enrich** — ดึง category, location, hours, price, reviews และข้อมูล readiness
4. **Score** — ประเมิน Locality, Quality, Visibility Gap, Readiness และ Risk
5. **Verify** — ส่งเฉพาะร้านที่น่าสนใจให้คนหรือ partner ตรวจ
6. **Publish & Refresh** — นำขึ้นระบบ ติดตาม และอัปเดตเมื่อข้อมูลเปลี่ยน

`Resolve` สำคัญมาก เพราะร้านเดียวกันอาจปรากฏใน Google Maps, TikTok และ Facebook ด้วยชื่อไม่เหมือนกัน ถ้าไม่มีขั้นนี้ ระบบจะมีร้านซ้ำและคะแนนผิด

---

### 2. AI ห้ามใช้รีวิวตัดสินว่า “เป็นร้าน local จริง” เพียงอย่างเดียว

ข้อความรีวิว เช่น:

- authentic
- local food
- family-run
- hidden place
- where locals eat

เป็นเพียง **weak evidence** ไม่ใช่ข้อพิสูจน์ ownership

นักท่องเที่ยวอาจเรียกร้าน chain ว่า local เพราะขายอาหารไทย หรือร้านอาจเขียนการตลาดให้ดู local ทั้งที่ทุนใหญ่ถือครองอยู่

ควรแบ่งหลักฐานเป็น 3 ระดับ:

| Evidence level | ตัวอย่าง | น้ำหนัก |
| --- | --- | --- |
| **Strong** | ข้อมูลเจ้าของที่ยืนยันแล้ว, community ownership, provider verification, สมาคมหรือโรงแรมยืนยัน | สูง |
| **Medium** | มีสาขาเดียว, family-run claim จาก official page, ใช้วัตถุดิบหรือฝีมือท้องถิ่น | กลาง |
| **Weak** | คำว่า local/authentic จากรีวิวหรือ TikTok caption | ต่ำ |

AI สามารถสรุปได้ว่า:

> **Likely Local — requires verification**
> 

แต่ห้ามเปลี่ยนเป็น:

> **Verified Local**
> 

จนกว่าจะมีหลักฐานหรือมนุษย์ยืนยัน

---

### 3. สูตร `overall_loma_score` ในข้อความเดิมผิด

ในข้อความปัจจุบันเครื่องหมายบวกถูกเปลี่ยนเป็นลบหลายจุด จึงกลายเป็นเหมือนหัก Quality, Visibility และ Readiness ออกจากคะแนน

สูตรที่ตั้งใจควรเป็น:

```
base_score =
(locality_score × 0.25)
+ (quality_score × 0.25)
+ (visibility_gap_score × 0.20)
+ (tourist_readiness_score × 0.20)
```

แต่ผมไม่แนะนำให้เพียงหัก `risk_score × 0.30` แล้วจบ เพราะร้านเสี่ยงอาจยังได้คะแนนรวมสูงจากด้านอื่น

ควรใช้ **Risk เป็น gate** ก่อนคำนวณ ไม่ใช่แค่คะแนนลบ

```
If risk_score >= 76:
    reject_or_suspend

Else if risk_score >= 51:
    needs_human_review

Else:
    calculate base_score
```

ร้านที่มี safety risk สูงไม่ควรถูกชดเชยด้วย locality หรือรีวิวดี

---

# จุดที่ขาดมากที่สุด: ต้องแยก AI เป็น 2 ระบบ

ตอนนี้ spec กำลังเอาสองคำถามมาปนกัน:

1. ร้านนี้ควรอยู่ใน LOMA หรือไม่
2. ร้านนี้เหมาะกับนักท่องเที่ยวคนนี้หรือไม่

สองคำถามนี้ไม่เหมือนกัน

## Layer A — AI Supply Curation Engine

ตอบว่า:

> ร้านนี้ local ไหม มีคุณภาพไหม under-discovered ไหม พร้อมรับนักท่องเที่ยวหรือยัง และมีความเสี่ยงหรือไม่
> 

Output:

- Hidden Gem Candidate
- Verified Local
- Tourist Ready
- Needs Human Review
- Information Only
- Suspended

## Layer B — Contextual Matching Engine

ตอบว่า:

> จากความต้องการของนักท่องเที่ยวคนนี้ ตอนนี้ ร้านใดเหมาะที่สุด
> 

ตัวอย่างคำถาม:

> “มากับคุณแม่ที่ใช้รถเข็น อยากกินอาหาร local ราคาไม่แพง มีเวลาไม่เกิน 2 ชั่วโมง”
> 

แม้ร้านหนึ่งจะมี Hidden Gem Score สูงมาก แต่ถ้า:

- รถเข็นเข้าไม่ได้
- ร้านปิด
- อยู่ไกล
- ใช้เวลาเกินสองชั่วโมง

ร้านนั้นต้องถูกตัดออก

ดังนั้น:

> **Hidden Gem Score determines whether the provider deserves visibility. Context Match Score determines whether it fits this tourist now.**
> 

นี่ควรเป็น architecture หลักของ LOMA

---

# Scoring Model ที่ควรแก้

## 1. Locality Score

วัดความเชื่อมโยงกับท้องถิ่น ไม่ใช่ความนิยม

### Inputs

- verified ownership type
- branch count
- franchise status
- community ownership
- local sourcing
- local employment
- cultural uniqueness
- hotel/community nomination
- review-based local signals

### Required outputs

```
locality_score: 0–100
locality_confidence: 0–1
locality_status:
- verified_local
- likely_local
- unclear
- not_local
locality_evidence[]
```

ตัวอย่าง:

```
{
  "locality_score":82,
  "locality_confidence":0.68,
  "locality_status":"likely_local",
  "locality_evidence": [
    {
      "signal":"Single-location family-run business",
      "source":"official_facebook_page",
      "strength":"medium"
    },
    {
      "signal":"Repeatedly described as a local family restaurant",
      "source":"public_reviews",
      "strength":"weak"
    }
  ]
}
```

คะแนนสูงแต่ confidence ต่ำต้องยังไม่ถือว่า verified

---

## 2. Quality Signal Score

ห้ามใช้ดาวเฉลี่ยอย่างเดียว

ควรดู:

- sentiment
- recency
- consistency
- cross-platform agreement
- complaint severity
- review authenticity
- evidence volume

ร้าน 5 ดาวจากรีวิว 3 ราย ไม่ควรเท่ากับร้าน 4.7 ดาวจากรีวิว 150 ราย

แต่ร้านใหญ่ก็ไม่ควรชนะเพราะมี review เยอะเสมอไป จึงควรมี `quality_confidence` แยกจาก `quality_score`

```
quality_score: 0–100
quality_confidence: 0–1
quality_evidence_count
quality_trend:
- improving
- stable
- declining
```

---

## 3. Visibility Gap Score

นี่เป็นแกนที่ยากที่สุด และต้องปรับตามบริบท

ห้ามใช้จำนวนรีวิวแบบ absolute เช่น:

> รีวิวต่ำกว่า 100 = hidden
> 

เพราะร้านที่เปิดมา 2 เดือนกับร้านที่เปิดมา 10 ปีเทียบกันไม่ได้ และร้านใน Patong กับร้านในชุมชนห่างไกลก็เทียบตรงๆ ไม่ได้

ควรวัด exposure แบบ relative ภายใน:

- category เดียวกัน
- area เดียวกัน
- business age ใกล้เคียงกัน
- season ใกล้เคียงกัน

ตัวอย่าง:

```
visibility_gap_score =
100 - exposure_percentile_within_category_and_area
```

Signals:

- search ranking
- review count percentile
- social mentions
- influencer concentration
- ad signals
- tourist-platform presence
- organic local mentions

คะแนนสูงหมายถึง:

> คุณภาพมีสัญญาณดี แต่ exposure ต่ำเมื่อเทียบกับร้านประเภทเดียวกันในพื้นที่เดียวกัน
> 

---

## 4. Tourist Readiness Score

Readiness ไม่ควรเป็นแค่คะแนน เพราะบาง field เป็น requirement ขั้นต่ำ

### Hard-required fields

- valid location
- opening hours
- at least one contact method
- clear product/service
- provider status not closed
- no critical safety issue

### Optional fields ที่เพิ่มคะแนน

- price range
- English support
- photos
- walk-in instruction
- estimated duration
- accessibility
- booking instruction
- recent verification

ร้านที่ไม่มี contact หรือเวลาเปิดปิด ไม่ควรได้สถานะ Tourist Ready แม้ overall score สูง

```
If location missing OR contact missing OR opening hours missing:
    tourist_ready = false
```

---

## 5. Risk Filter

Risk ต้องแยกตาม category

ร้านอาหารกับเรือท่องเที่ยวใช้ threshold เดียวกันไม่ได้

### Low-risk category

- café
- souvenir
- craft
- simple restaurant

### Medium-risk category

- massage
- spa
- guide
- community activity

### High-risk category

- boat
- diving
- adventure
- transport
- medical/wellness claims

High-risk category ต้องมี verification เพิ่ม เช่น:

- licensing
- safety documentation
- insurance
- cancellation process
- contact person
- complaint handling

---

# เพิ่ม Evidence Confidence เป็นแกนที่ 6 ภายในระบบ

ไม่จำเป็นต้องเป็น “Hidden Gem Dimension” ที่โชว์บนสไลด์ แต่ต้องอยู่ใน backend

ร้านอาจมีคะแนน:

- Locality 85
- Quality 80
- Visibility Gap 75
- Readiness 70
- Risk 10

แต่ถ้าหลักฐานมีเพียง TikTok สองคลิป คะแนนเหล่านี้ไม่ควรได้รับความเชื่อมั่นเท่ากับร้านที่มีหลายแหล่งข้อมูล

จึงควรมี:

```
evidence_confidence: 0–1
evidence_coverage: 0–100
source_count
last_scored_at
scoring_model_version
```

ตัวอย่าง:

```
adjusted_score = base_score × evidence_confidence
```

แต่สำหรับ demo อาจแสดงแค่:

- High confidence
- Medium confidence
- Low confidence

---

# Logic ที่แนะนำใหม่

```
Step 1: Eligibility Gate

If provider is closed or suspended:
    status = not_recommendable

If risk_score >= 76:
    status = rejected_or_suspended

If risk_score >= 51:
    status = needs_human_review

If critical readiness fields are missing:
    status = information_only
```

จากนั้นจึงคำนวณ:

```
base_hidden_gem_score =
(locality_score × 0.30)
+ (quality_score × 0.30)
+ (visibility_gap_score × 0.25)
+ (tourist_readiness_score × 0.15)
```

แล้วปรับด้วยความมั่นใจ:

```
adjusted_hidden_gem_score =
base_hidden_gem_score × evidence_confidence
```

สถานะ:

```
If eligible
and locality_score >= 70
and quality_score >= 70
and visibility_gap_score >= 60
and tourist_readiness_score >= 60
and evidence_confidence >= 0.60:
    hidden_gem_status = hidden_gem_candidate

Else if eligible
and locality_score >= 60
and quality_score >= 60
and tourist_readiness_score >= 60:
    hidden_gem_status = local_provider_candidate

Else:
    hidden_gem_status = information_only
```

มนุษย์หรือ partner ยืนยันแล้วจึงเปลี่ยนจาก:

> Hidden Gem Candidate
> 

เป็น:

> Verified Hidden Gem
> 

---

# Contextual Matching หลังจากคัดร้านแล้ว

เมื่อผู้ใช้ถาม ระบบต้องเริ่มจาก provider ที่ผ่าน eligibility ก่อน แล้วใช้ข้อมูลบริบทจัดอันดับ

```
match_score =
(context_fit × 0.35)
+ (quality_score × 0.15)
+ (locality_score × 0.15)
+ (tourist_readiness_score × 0.15)
+ (visibility_gap_score × 0.10)
+ (distance_fit × 0.10)
- risk_penalty
```

แต่ต้อง filter hard constraints ก่อน เช่น:

- wheelchair accessibility
- open now
- max travel time
- budget
- dietary restrictions
- required reservation

LLM ทำหน้าที่เข้าใจคำถามและอธิบายผล

Rule engine และ structured data ทำหน้าที่ตัดสิน eligibility

---

# Pipeline เวอร์ชันที่ควรส่งทีม

```
AI CURATION PIPELINE

1. DISCOVER
Collect candidate providers from:
- Google Maps
- TikTok
- public datasets
- official pages
- hotel nominations
- community nominations
- self-registration

2. ENTITY RESOLUTION
Determine whether records from different sources refer to the same provider.
Match by:
- normalized name
- phone number
- location
- social URLs
- address similarity

3. ENRICH
Extract:
- category
- location
- contact
- opening hours
- price
- local signals
- review sentiment
- visibility signals
- readiness data
- risk signals

4. SCORE
Calculate:
- Locality Score
- Quality Signal Score
- Visibility Gap Score
- Tourist Readiness Score
- Risk Score
- Evidence Confidence

5. GATE
Reject, suspend, send to review, or mark information-only based on risk and data completeness.

6. HUMAN VERIFICATION
Human reviewers only inspect:
- high-potential candidates
- low-confidence candidates
- high-risk providers
- disputed providers

7. PUBLISH
Publish as:
- Verified Local
- Hidden Gem Candidate
- Verified Hidden Gem
- Tourist Ready
- Contact Before Visiting

8. MONITOR AND REFRESH
Detect:
- new reviews
- changed opening hours
- closure
- complaint spikes
- declining quality
- new contact information
- new providers
```

---

# UI ต้องแก้อีกเล็กน้อย

Admin ควรเห็นเพิ่มจากเดิม:

```
Provider: [Name]

Hidden Gem Score: 74
Evidence Confidence: Medium
Recommendation Eligibility: Needs Human Review

Dimensions:
Locality: 82
Quality: 76
Visibility Gap: 71
Readiness: 64
Risk: 18

Evidence:
- 4 public sources
- 72 recent reviews analyzed
- Hotel nomination received
- Ownership not yet verified

AI Explanation:
“Strong local and quality signals with moderate visibility.
Ownership and wheelchair accessibility still require verification.”
```

Admin actions:

- Approve as Verified Local
- Verify Hidden Gem
- Request Provider Claim
- Request More Information
- Send for Field Verification
- Reject
- Suspend

---

# Demo Scope ที่ควรทำจริง

อย่าให้ทีมสร้าง pipeline scraping และ AI เต็มระบบก่อน Demo Day

สำหรับ demo ทำแค่นี้:

1. เตรียม 10–20 provider records
2. เก็บ review samples และ public signals บางส่วน
3. ให้ AI หรือ rule-based system generate คะแนน 5 แกน
4. แสดง evidence และ confidence
5. ให้ admin approve provider หนึ่งราย
6. นำร้านนั้นไปแสดงใน AI matching
7. ใช้ tourist request เพื่อแนะนำ 3 ร้าน
8. Generate QR

สิ่งที่ควรโชว์:

> **AI discovers and pre-scores at scale. Humans verify only the candidates that matter.**
> 

## ข้อสรุป

Specification เดิมใช้เป็นฐานได้ แต่ต้องแก้ 5 เรื่อง:

1. เพิ่ม **Entity Resolution** และ **Human Verification** ใน pipeline
2. รีวิวใช้เป็นเพียงสัญญาณ local ไม่ใช่หลักฐานว่า local จริง
3. ใช้ Risk และ Readiness เป็น gate ไม่ใช่คะแนนเฉลี่ยอย่างเดียว
4. เพิ่ม Evidence Confidence และแหล่งที่มาของทุกคะแนน
5. แยก **Hidden Gem Curation** ออกจาก **Contextual Tourist Matching**

ถ้าไม่แยกข้อ 5 ระบบจะเกิดข้อผิดพลาดสำคัญ:

> ร้านอาจเป็น Hidden Gem ที่ดีมาก แต่ไม่ใช่คำตอบที่เหมาะกับนักท่องเที่ยวคนนี้ในสถานการณ์นี้
> 

ช่วยอธิบายสรุปเลยได้ไหมว่าโปรแกรมเมอร์ผมต้องทำระบบ AI คัดร้านเข้า LOMA อย่างไรดี 
เพราะถ้าอธิบายแบบนี้มันอ่านแล้วงง 
เอาเวอชั่นที่แก้ไขให้ดีขึ้นแล้ว ไปเลย

เป้าหมายคือให้ทีมโปรแกรมเมอร์สร้าง **AI Curation Engine** ที่ค้นหา คัดกรอง และอัปเดตร้านสำหรับเข้า LOMA โดยไม่ต้องให้คนตรวจร้านทุกแห่งด้วยมือ

ประเด็นสำคัญที่สุดคือ:

> **AI ไม่ควรมีอำนาจตัดสินว่าร้าน “Verified Local” โดยลำพัง**
> 
> 
> AI ทำหน้าที่ค้นหา วิเคราะห์ และจัดลำดับร้านที่น่าสนใจ ส่วนมนุษย์ตรวจเฉพาะร้านที่ผ่าน shortlist
> 

ด้านล่างคือเวอร์ชันที่สามารถส่งให้ทีมพัฒนาได้เลย

---

# LOMA AI Provider Curation System

## 1. ระบบนี้ต้องทำอะไร

ระบบต้องรับข้อมูลร้านจากหลายแหล่ง แล้วตอบคำถาม 3 ข้อ:

1. ร้านนี้เป็นธุรกิจจริงและอยู่ในภูเก็ตหรือไม่
2. ร้านนี้มีศักยภาพเป็น Local Provider หรือ Hidden Gem หรือไม่
3. ร้านนี้มีข้อมูลและความพร้อมเพียงพอที่จะให้นักท่องเที่ยวใช้งานหรือไม่

ผลลัพธ์สุดท้ายของระบบต้องไม่ใช่แค่คะแนน แต่ต้องระบุสถานะของร้าน เช่น:

- `Information Only`
- `Needs More Information`
- `Needs Human Review`
- `Local Provider Candidate`
- `Hidden Gem Candidate`
- `Verified Local`
- `Verified Hidden Gem`
- `Rejected`
- `Suspended`

---

# 2. ภาพรวมการทำงาน

ระบบควรมี 8 ขั้นตอน

```
Discover
→ Deduplicate
→ Extract Information
→ Score
→ Apply Safety & Readiness Gates
→ Human Review
→ Publish
→ Monitor & Refresh
```

---

# 3. ขั้นที่ 1: Discover — หาร้านใหม่

ระบบรับ Candidate Provider จาก 5 แหล่ง

## แหล่งข้อมูล

1. TikTok / Social Media Scraping
2. Google Maps หรือข้อมูลแผนที่สาธารณะ
3. Open Data / ข้อมูลจาก BDI / OTOP / ชุมชน
4. โรงแรมหรือพนักงานเสนอร้าน
5. ร้านหรือชุมชนสมัครเข้ามาเอง

ทุก Candidate ต้องเก็บ `source_type`

```
tiktok_scrape
google_maps
public_dataset
hotel_nomination
community_nomination
self_registration
admin_added
```

ใน Demo Day ไม่จำเป็นต้องเชื่อม API ทุกแหล่งจริง สามารถ import CSV หรือ JSON ที่ scrape มาแล้วได้

---

# 4. ขั้นที่ 2: Deduplicate — ตรวจร้านซ้ำ

ร้านเดียวกันอาจปรากฏในหลายแหล่ง เช่น:

- Google Maps ใช้ชื่อภาษาอังกฤษ
- TikTok ใช้ชื่อเล่น
- Facebook ใช้ชื่อภาษาไทย
- โรงแรมเสนอชื่อร้านด้วยการสะกดอีกแบบหนึ่ง

ระบบต้องพยายามรวมข้อมูลเหล่านี้เป็นร้านเดียวกัน

## ใช้ข้อมูลเปรียบเทียบ

- ชื่อร้านที่ normalize แล้ว
- เบอร์โทรศัพท์
- พิกัด
- ที่อยู่
- Google Maps URL
- Facebook / TikTok / Instagram
- ระยะห่างระหว่างพิกัด

## Logic เบื้องต้น

```
ถ้าเบอร์โทรตรงกัน → ถือว่าเป็นร้านเดียวกัน

ถ้าพิกัดห่างกันไม่เกิน 50 เมตร
และชื่อคล้ายกันมาก → อาจเป็นร้านเดียวกัน

ถ้าระบบไม่มั่นใจ → ส่งเข้า Duplicate Review Queue
```

ห้ามรวมร้านอัตโนมัติหาก confidence ต่ำ เพราะอาจเป็นคนละสาขา

---

# 5. ขั้นที่ 3: Extract Information — AI อ่านข้อมูลร้าน

AI อ่านข้อมูลจาก:

- Bio
- Caption
- Review
- Website
- Google Maps description
- Facebook page
- Hotel nomination note

แล้วแปลงเป็นข้อมูลแบบ Structured Data

## ข้อมูลที่ AI ควรดึง

```
provider_name
category
description
location
contact
opening_hours
price_range
branch_count
franchise_signal
family_run_signal
community_signal
local_product_signal
quality_signals
complaint_signals
tourist_readiness_signals
```

## ตัวอย่าง

ข้อความต้นทาง:

> “ร้านเล็กของครอบครัว เปิดมานานกว่า 20 ปี อยู่ในเมืองเก่าภูเก็ต หมี่ฮกเกี้ยนรสชาติดั้งเดิม ราคาคนท้องถิ่น”
> 

AI แปลงเป็น:

```
{
  "category":"local_food",
  "family_run_signal":true,
  "single_location_signal":true,
  "local_culture_signal":true,
  "affordable_signal":true,
  "locality_keywords": ["family-run","traditional Phuket food","local pricing"
  ]
}
```

ข้อมูลเหล่านี้ยังเป็น **AI inference** ไม่ใช่ข้อเท็จจริงที่ยืนยันแล้ว

---

# 6. AI กับ Rule Engine ต้องแบ่งงานกัน

อย่าให้ LLM คำนวณและตัดสินทุกอย่างเอง

## AI / LLM ทำหน้าที่

- อ่านภาษาไทยและอังกฤษ
- จัดหมวดธุรกิจ
- วิเคราะห์ sentiment
- ดึง local signals
- ดึง complaint signals
- เขียนคำอธิบายว่าทำไมร้านน่าสนใจ
- สรุปหลักฐานที่พบ

## Rule Engine ทำหน้าที่

- คำนวณคะแนน
- ตรวจ field ที่ขาด
- ตรวจ threshold
- ป้องกันร้านเสี่ยง
- กำหนดสถานะ
- กำหนดว่าร้านใดต้องผ่าน Human Review
- ห้ามร้านปิดหรือร้านเสี่ยงถูกแนะนำ

หลักคือ:

> **AI reads and explains. Rules calculate and decide eligibility.**
> 

---

เป้าหมายคือกำหนดความหมายของ **12 fields สำหรับ Demo LOMA** ให้ทีมโปรแกรมเมอร์เก็บข้อมูลตรงกัน และให้ AI ใช้ข้อมูลโดยไม่เดาหรืออ้างเกินจริง

หลักสำคัญก่อนเริ่ม:

> **Unknown ไม่เท่ากับ No และไม่เท่ากับ Yes**
> 

ตัวอย่างเช่น หากยังไม่มีข้อมูลเรื่องรถเข็น ต้องบันทึกเป็น `unknown` ไม่ใช่ `no` และ AI ห้ามพูดว่าร้านรองรับรถเข็นจนกว่าจะมีการยืนยัน

---

# 1. Provider Name

### ชื่อ field

```
provider_name
```

### Data type

```
String
```

### ความหมาย

ชื่อธุรกิจ ร้านค้า หรือกิจกรรมที่นักท่องเที่ยวจะเห็นบนหน้า recommendation

ตัวอย่าง:

```
One Chun Café & Restaurant
A-Pong Mae Sunee
Ban Bang Rong Community Experience
```

### ใช้ทำอะไร

- แสดงบน provider card
- ใช้ค้นหาร้านในฝั่งพนักงาน
- ใช้สร้าง recommendation list
- ใช้เชื่อมกับ Google Maps หรือข้อมูลภายนอก
- ใช้ป้องกันการนำร้านเดียวกันเข้าระบบซ้ำ

### กติกา

- ใช้ชื่อร้านจริง ไม่ใช้ชื่อโฆษณาที่ยาวเกินไป
- ถ้ามีชื่อไทยและอังกฤษ ควรเก็บแยกในอนาคต
- สำหรับ Demo อาจใช้ field เดียวก่อน แต่ควรแสดงชื่อที่นักท่องเที่ยวอ่านได้
- ชื่อร้านซ้ำกันได้ หากคนละสาขา แต่ต้องแยกด้วยพื้นที่หรือ branch

### ตัวอย่าง

```json
{
  "provider_name": "Baan Local Kitchen"
}
```

---

# 2. Category

### ชื่อ field

```
category
```

### Data type

```
Enum
```

### ความหมาย

หมวดธุรกิจหลักของ provider ใช้สำหรับค้นหา กรอง และตีความความต้องการของนักท่องเที่ยว

### ค่าแนะนำสำหรับ Demo

```
local_food
cafe_dessert
massage_spa
souvenir_craft
local_product
community_experience
wellness
```

### ใช้ทำอะไร

ถ้านักท่องเที่ยวถามว่า:

> “อยากกินอาหารพื้นเมือง”
> 

ระบบจะแปลงคำถามเป็น:

```
category = local_food
```

แล้วตัดร้านหมวดอื่นออกก่อนจัดอันดับ

### กติกา

- สำหรับ Demo ให้หนึ่งร้านมี `primary category` เดียวก่อน
- อย่าใช้ category กว้างเกินไป เช่น `shopping` หรือ `activity`
- Community tour ต้องเป็นคนละ category กับร้านใกล้โรงแรม เพราะวิธีใช้งานต่างกัน

### ตัวอย่าง

```json
{
  "category": "local_food"
}
```

---

# 3. Short Description

### ชื่อ field

```
short_description
```

### Data type

```
String หรือ Text
```

### ความหมาย

คำอธิบายสั้นๆ ว่าร้านนี้คืออะไร ขายอะไร และมีจุดเด่นอะไร

### ความยาวแนะนำ

ประมาณ 20–50 คำ หรือ 1–2 ประโยค

### ควรตอบให้ได้ 3 เรื่อง

1. ร้านนี้คืออะไร
2. นักท่องเที่ยวไปทำหรือซื้ออะไร
3. จุดเด่นที่เกี่ยวกับความเป็น local คืออะไร

### ตัวอย่างที่ดี

> “A family-run Phuket restaurant serving traditional Hokkien noodles and local southern dishes at affordable prices.”
> 

### ตัวอย่างที่ไม่ดี

> “The best and most amazing restaurant in Phuket.”
> 

เพราะเป็นข้อความโฆษณา ไม่มีข้อมูลที่ใช้ matching

### AI ใช้ทำอะไร

- เข้าใจลักษณะของ provider
- สกัด keyword เช่น local food, handmade, family-run
- สร้างเหตุผลในการแนะนำ
- ใช้ตอบคำถามนักท่องเที่ยวเป็นภาษาธรรมชาติ

### ตัวอย่าง

```json
{
  "short_description": "A family-run restaurant serving affordable traditional Phuket dishes in a casual setting."
}
```

---

# 4. Latitude / Longitude

### ชื่อ field

```
latitude
longitude
```

### Data type

```
Decimal
```

### ความหมาย

พิกัดตำแหน่งจริงของร้านหรือชุมชน

### ตัวอย่าง

```json
{
  "latitude": 7.8841,
  "longitude": 98.3892
}
```

### ใช้ทำอะไร

- คำนวณระยะทางจากโรงแรม
- หา provider ใกล้ที่สุด
- แสดงบนแผนที่
- ใช้ประเมินว่าเดินทางทันภายในเวลาที่นักท่องเที่ยวมีหรือไม่
- สร้างปุ่ม Get Directions

### กติกา

- อย่าใช้แค่ชื่อเขตหรือที่อยู่ข้อความ
- พิกัดต้องเป็นจุดหน้าร้านหรือจุดนัดหมายจริง
- Community experience ต้องใช้จุดพบหรือจุดติดต่อ ไม่ใช่จุดกลางหมู่บ้านแบบคร่าวๆ

### ข้อควรระวัง

ระยะเส้นตรงไม่เท่ากับเวลาเดินทางจริง

สำหรับ Demo อาจคำนวณระยะทางแบบง่ายก่อน แต่ถ้าจะใช้จริง ควรเชื่อม map routing เพื่อคำนวณตามถนน

---

# 5. Opening Hours

### ชื่อ field

```
opening_hours
```

### Data type

```
Structured JSON
```

### ความหมาย

เวลาเปิดและปิดของร้านแยกตามวัน

### ตัวอย่าง

```json
{
  "monday": {
    "open": "10:00",
    "close": "20:00"
  },
  "tuesday": {
    "open": "10:00",
    "close": "20:00"
  },
  "wednesday": null
}
```

`null` หมายถึงปิดวันนั้น

### ใช้ทำอะไร

- ตรวจว่าเปิดอยู่ตอนนี้หรือไม่
- ตรวจว่าจะปิดก่อนนักท่องเที่ยวเดินทางถึงหรือไม่
- ไม่แนะนำร้านที่ปิด
- แสดงข้อความ `Open now` หรือ `Closed`

### กติกา

อย่าเก็บเป็นข้อความอย่างเดียว เช่น:

```
Open every day
```

เพราะระบบนำไปคำนวณไม่ได้

### สำหรับ Demo

หากต้องการลดงาน ใช้รูปแบบง่าย:

```json
{
  "open_time": "10:00",
  "close_time": "20:00",
  "closed_days": ["wednesday"]
}
```

แต่ทีมควรเตรียมโครงสร้างไว้รองรับเวลาเปิดหลายช่วง เช่น ร้านปิดกลางวัน

---

# 6. Price Range

### ชื่อ field

```
price_range
```

### Data type

```
Enum
```

### ค่าแนะนำสำหรับ Demo

```
budget
moderate
premium
unknown
```

### ความหมาย

ระดับค่าใช้จ่ายโดยประมาณต่อคน

### Mapping เบื้องต้นสำหรับร้านอาหาร

| ค่า | ราคาประมาณต่อคน |
| --- | --- |
| `budget` | ต่ำกว่า 400 บาท |
| `moderate` | 400–1,000 บาท |
| `premium` | มากกว่า 1,000 บาท |
| `unknown` | ยังไม่มีข้อมูล |

สำหรับ community experience อาจต้องใช้เกณฑ์ราคาคนละชุด

### ใช้ทำอะไร

ถ้าผู้ใช้บอกว่า:

> “ราคาไม่แพง”
> 

ระบบจะ prioritize ร้าน `budget` และอาจยอมรับ `moderate` เป็นตัวเลือกสำรอง

### ข้อควรระวัง

อย่าให้ AI เดาราคาจากภาพร้านหรือบรรยากาศ

ถ้าราคาไม่ทราบ ให้ใช้:

```
unknown
```

และแสดง:

> “Price has not been verified.”
> 

---

# 7. Estimated Visit Duration

### ชื่อ field

```
estimated_visit_duration_min
estimated_visit_duration_max
```

### Data type

```
Integer — หน่วยเป็นนาที
```

### ความหมาย

เวลาที่นักท่องเที่ยวควรเผื่อสำหรับใช้บริการ ณ ร้านหรือสถานที่นั้น โดยยังไม่รวมเวลาเดินทาง

### ตัวอย่าง

```json
{
  "estimated_visit_duration_min": 60,
  "estimated_visit_duration_max": 90
}
```

### ใช้ทำอะไร

กรณีนักท่องเที่ยวมีเวลา 2 ชั่วโมง ระบบต้องคำนวณ:

```
เวลาเดินทางไป
+ เวลาใช้บริการ
+ เวลาเดินทางกลับ
+ buffer
```

ตัวอย่าง:

```
เดินทางไป 15 นาที
รับประทานอาหาร 60–75 นาที
เดินทางกลับ 15 นาที
buffer 15 นาที
รวม 105–120 นาที
```

จึงยังเหมาะกับผู้ใช้ที่มีเวลาไม่เกิน 2 ชั่วโมง

### วิธีประมาณสำหรับ Demo

| Category | Duration โดยประมาณ |
| --- | --- |
| Café / dessert | 30–60 นาที |
| Local restaurant | 60–90 นาที |
| Massage | 60–120 นาที |
| Souvenir shop | 20–45 นาที |
| Community experience | 180–480 นาที |

### ข้อควรระวัง

ต้องแยกเวลาใช้บริการจากเวลาเดินทาง ไม่เช่นนั้น AI จะให้ผลลัพธ์ผิด

---

# 8. Wheelchair Accessibility

### ชื่อ field

```
wheelchair_accessibility
```

### Data type

```
Enum
```

### ค่าแนะนำ

```
full
partial
not_accessible
unknown
```

### ความหมาย

ระดับที่ผู้ใช้รถเข็นสามารถเข้าถึงและใช้บริการได้

### นิยาม

#### `full`

- เข้าร้านได้โดยไม่มีขั้นที่เป็นอุปสรรค
- มีพื้นที่เคลื่อนตัวได้
- เข้าถึงพื้นที่บริการหลักได้

#### `partial`

- เข้าบางพื้นที่ได้
- มีข้อจำกัด เช่น ทางแคบ ห้องน้ำไม่รองรับ หรือมีหนึ่งขั้น

#### `not_accessible`

- ต้องขึ้นบันได
- ไม่มีทางลาด
- พื้นที่หลักไม่สามารถเข้าถึงด้วยรถเข็นได้

#### `unknown`

- ยังไม่มีข้อมูลหรือยังไม่ตรวจสอบ

### Hard rule

ถ้าผู้ใช้บอกว่า:

> “แม่ใช้รถเข็น”
> 

ระบบควรเลือกเฉพาะ `full` ก่อน

`partial` แสดงได้เป็นตัวเลือกสำรองพร้อมคำเตือน

`unknown` ห้ามแสดงว่า accessible

`not_accessible` ต้องถูกตัดออก

### ข้อควรระวังสำคัญ

AI ห้ามเดาข้อมูลนี้จากรูปหรือรีวิวแบบไม่ยืนยัน เพราะเป็นเรื่อง accessibility และความปลอดภัย

---

# 9. Elderly Suitability

### ชื่อ field

```
elderly_suitability
```

### Data type

```
Enum
```

### ค่าแนะนำ

```
suitable
conditional
not_suitable
unknown
```

### ความหมาย

ระดับความเหมาะสมสำหรับนักท่องเที่ยวสูงอายุ

### ปัจจัยที่ควรพิจารณา

- ต้องเดินไกลหรือไม่
- มีบันไดหรือไม่
- มีที่นั่งหรือไม่
- มีห้องแอร์หรือไม่
- เสียงดังมากหรือไม่
- มีจุดรับส่งใกล้ทางเข้าหรือไม่
- ใช้เวลานานเกินไปหรือไม่
- ห้องน้ำเข้าถึงง่ายหรือไม่

### นิยาม

#### `suitable`

ไม่มีอุปสรรคสำคัญสำหรับผู้สูงอายุทั่วไป

#### `conditional`

ไปได้ แต่มีเงื่อนไข เช่น:

- ต้องมีรถรับส่ง
- มีทางเดินบางช่วง
- ไม่มีห้องน้ำ accessible
- ควรหลีกเลี่ยงช่วงคนเยอะ

#### `not_suitable`

มีกิจกรรมหรือสภาพแวดล้อมที่ไม่เหมาะ เช่น เดินขึ้นเขา บันไดจำนวนมาก หรือกิจกรรมใช้แรง

#### `unknown`

ยังไม่มีข้อมูล

### ข้อควรระวัง

`elderly_suitability` ไม่ควรเป็นการตัดสินตามอายุเพียงอย่างเดียว ต้องอิงสภาพแวดล้อมและข้อจำกัดทางกายภาพ

---

# 10. Contact Method

### ชื่อ field

```
contact_method
```

### Data type

สำหรับ Demo ใช้เป็น Object

```json
{
  "type": "phone",
  "value": "0812345678"
}
```

### ประเภทที่แนะนำ

```
phone
line
whatsapp
facebook
website
```

### ความหมาย

ช่องทางหลักที่นักท่องเที่ยวใช้ติดต่อร้านหรือชุมชน

### ใช้ทำอะไร

- สร้างปุ่ม Contact
- ใช้สำหรับร้านที่ต้องจองล่วงหน้า
- วัดจำนวน contact clicks
- ส่ง lead ไปยัง provider
- ใช้กับ community experience ที่ LOMA ไม่ได้เป็น booking engine

### กติกา

- ต้องมีอย่างน้อยหนึ่งช่องทางที่ใช้งานได้จริง
- เลือกช่องทางหลักเพียงหนึ่งช่องใน Demo เพื่อลดความซับซ้อน
- สำหรับนักท่องเที่ยวต่างชาติ WhatsApp หรือ phone อาจ practical กว่า LINE
- Community ควรมีผู้รับผิดชอบชัดเจน ไม่ใช่เพียง Facebook page ที่ไม่มีคนตอบ

### ตัวอย่าง

```json
{
  "contact_method": {
    "type": "whatsapp",
    "value": "+66812345678"
  }
}
```

---

# 11. Locality Score

### ชื่อ field

```
locality_score
```

### Data type

```
Integer 0–100
```

### ความหมาย

คะแนนที่บอกว่าร้านนี้มีความเป็นธุรกิจท้องถิ่นมากเพียงใด

ไม่ได้หมายถึงคุณภาพร้าน และไม่ใช่คะแนนความนิยม

### ปัจจัยเบื้องต้น

- เป็นธุรกิจอิสระหรือไม่
- เป็นเจ้าของโดยคนพื้นที่หรือชุมชนหรือไม่
- เป็น chain หรือ franchise หรือไม่
- ใช้สินค้า วัตถุดิบ หรือองค์ความรู้ท้องถิ่นหรือไม่
- มีอัตลักษณ์ภูเก็ตหรือไม่
- มีความเชื่อมโยงกับชุมชนหรือไม่

### แนวทางตีความ

| คะแนน | ความหมาย |
| --- | --- |
| 80–100 | มีความเป็น local ชัดเจน |
| 60–79 | เป็น SME ท้องถิ่น แต่เอกลักษณ์ไม่ชัดมาก |
| 40–59 | อยู่ในภูเก็ต แต่ ownership/local value ยังไม่ชัด |
| 0–39 | chain, franchise หรือ weak local signal |

### สำหรับ Demo

ไม่ต้องสร้าง AI scoring สมบูรณ์ ให้ทีมกำหนดคะแนน manually จากข้อมูลตัวอย่างก่อน

แต่ควรมีคำอธิบายประกอบ เช่น:

```json
{
  "locality_score": 88,
  "locality_reason": "Family-owned single-location restaurant serving traditional Phuket dishes."
}
```

ถึงแม้ `locality_reason` ไม่อยู่ใน 12 fields หลัก แต่ควรเก็บสำหรับอธิบาย recommendation

---

# 12. Verification Status

### ชื่อ field

```
verification_status
```

### Data type

```
Enum
```

### ค่าแนะนำ

```
unverified
provider_declared
hotel_verified
loma_verified
```

### ความหมาย

บอกว่าข้อมูลร้านได้รับการยืนยันจากใครและในระดับใด

### นิยาม

#### `unverified`

ข้อมูลมาจาก public data, scraping หรือ AI inference แต่ยังไม่มีคนยืนยัน

#### `provider_declared`

ร้านเป็นผู้กรอกหรือยืนยันข้อมูลเอง

#### `hotel_verified`

โรงแรมหรือ partner ที่รู้จักร้านยืนยันว่าข้อมูลพื้นฐานถูกต้อง

#### `loma_verified`

ทีม LOMA หรือ partner อย่างเป็นทางการตรวจสอบข้อมูลแล้ว

### ใช้ทำอะไร

- ตัดสินว่าร้านสามารถได้รับ badge อะไร
- ป้องกัน AI กล่าวอ้างข้อมูลที่ยังไม่ยืนยัน
- ให้ความสำคัญกับร้านที่ข้อมูลน่าเชื่อถือกว่า
- แสดงข้อความให้ผู้ใช้รู้ระดับความมั่นใจ

### UI ตัวอย่าง

```
Verified Local
Information provided by the business
Accessibility not yet verified
```

### Rule สำคัญ

หากร้านเป็น `unverified` และข้อมูล wheelchair เป็น `unknown` ระบบห้ามพูดว่า:

> “This restaurant is wheelchair accessible.”
> 

ต้องพูดว่า:

> “Wheelchair accessibility has not yet been verified.”
> 

---

# โครงสร้างข้อมูลตัวอย่างที่ทีมใช้ได้ทันที

```json
{
  "provider_name": "Baan Phuket Kitchen",
  "category": "local_food",
  "short_description": "A family-run restaurant serving affordable traditional Phuket dishes.",
  "latitude": 7.8841,
  "longitude": 98.3892,
  "opening_hours": {
    "open_time": "10:00",
    "close_time": "20:00",
    "closed_days": []
  },
  "price_range": "budget",
  "estimated_visit_duration_min": 60,
  "estimated_visit_duration_max": 90,
  "wheelchair_accessibility": "full",
  "elderly_suitability": "suitable",
  "contact_method": {
    "type": "phone",
    "value": "0812345678"
  },
  "locality_score": 86,
  "verification_status": "hotel_verified"
}
```

# Logic สำหรับ Demo scenario

Input:

> “I am travelling with my elderly mother who uses a wheelchair. We want affordable local food nearby and have no more than two hours.”
> 

ระบบควรทำตามลำดับนี้:

1. Filter `category = local_food`
2. Filter `price_range = budget`
3. Filter `wheelchair_accessibility = full`
4. Filter `elderly_suitability = suitable`
5. Filter ร้านที่เปิดอยู่
6. คำนวณระยะทางจาก latitude/longitude
7. ตรวจว่าเวลาเดินทางและเวลาใช้บริการรวมไม่เกิน 120 นาที
8. เรียงลำดับจาก locality score, ระยะทาง และ verification status
9. แสดง 3 ร้านพร้อมเหตุผล

ตัวอย่างเหตุผลที่ระบบแสดง:

> **Why it matches:** Affordable local Phuket food, verified wheelchair access, suitable for elderly guests, 8 minutes from your hotel, and approximately 60–90 minutes per visit.
> 

สำหรับ Demo ให้ทีมกรอก 10–20 ร้านด้วย 12 fields นี้ให้ครบก่อน ระบบ matching ก็สามารถแสดง AI use case ที่ชัดเจนได้แล้ว โดยไม่ต้องสร้างโครงสร้างข้อมูลระดับจังหวัดทั้งหมดในตอนนี้.