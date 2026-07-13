# AI Hidden Gem Scoring — Detailed Implementation Spec

Implement a provider scoring system that evaluates whether a local business or community experience should be surfaced as a LOMA “Hidden Gem”.

Hidden Gem does NOT mean “low review count”.
Hidden Gem means:

High local authenticity

- strong quality signal
- low mainstream visibility
- enough tourist readiness
- risk/red flags

The system should score each provider across 5 dimensions:

1. Locality Score
2. Quality Signal Score
3. Visibility Gap Score
4. Tourist Readiness Score
5. Risk Filter Score

Each score should be stored as a number from 0–100.
Also calculate an overall_loma_score and a hidden_gem_status.

---

## 1. Locality Score

Purpose:
Measure whether the provider is genuinely local and aligned with LOMA’s mission to support SMEs and communities.

Signals to evaluate:

- Locally owned or family-run
- Single branch or small number of branches
- Not a franchise / not a large chain
- Uses local products, ingredients, craft, or knowledge
- Employs local people
- Has cultural or community connection
- Located in Phuket
- Distinctive local identity, not generic tourist business

Suggested scoring:

- 80–100 = clearly local / community-rooted
- 60–79 = local SME but less distinctive
- 40–59 = locally located but unclear ownership or identity
- 0–39 = chain, franchise, tourist-heavy, or weak local signal

Example explanation:
“High locality score because the provider appears family-run, single-location, and strongly connected to Phuket food culture.”

---

## 2. Quality Signal Score

Purpose:
Estimate whether the provider is good enough to recommend.

Signals to evaluate:

- Positive review sentiment
- Recent positive reviews
- Repeated positive keywords such as authentic, friendly, clean, fair price, tasty, handmade, local, welcoming
- Consistent feedback across platforms
- Good photos or evidence of real customer experience
- Owner responds professionally
- Low frequency of serious complaints

Suggested scoring:

- 80–100 = strong positive sentiment and consistent quality signals
- 60–79 = generally positive but limited evidence
- 40–59 = mixed or insufficient evidence
- 0–39 = weak, negative, or unreliable quality signal

Important:
Do not score only by star rating.
Use sentiment and consistency, not popularity alone.

Example explanation:
“Strong quality signal because recent public reviews repeatedly mention authentic taste, friendly service, and fair pricing.”

---

## 3. Visibility Gap Score

Purpose:
Find providers that are good but under-discovered.

Signals to evaluate:

- Good quality signal but not extremely high mainstream visibility
- Not dominated by ads or major influencer campaigns
- Not already top-ranked everywhere
- Not a major chain or famous tourist attraction
- Has signs of organic appreciation but limited reach
- May be talked about by locals or niche creators rather than mass tourist pages

Suggested scoring:

- 80–100 = high quality but low mainstream exposure
- 60–79 = visible in some circles but not mainstream
- 40–59 = moderately visible
- 0–39 = already famous, overexposed, or heavily commercialized

Important:
Low visibility alone is not enough.
Visibility Gap should only matter if Quality Signal and Tourist Readiness are acceptable.

Example explanation:
“High visibility gap because the provider has strong positive sentiment but relatively low mainstream tourist exposure.”

---

## 4. Tourist Readiness Score

Purpose:
Measure whether tourists can realistically use this provider without confusion or high friction.

Signals to evaluate:

- Clear location / Google Maps pin
- Opening hours available
- Contact channel available
- Price or price range available
- Clear product or service offering
- Photos available
- English support or simple tourist communication path
- Walk-in possible or booking/contact instruction clear
- For community experiences: duration, program, contact person, approximate price, booking note
- Reasonable accessibility from tourist areas

Suggested scoring:

- 80–100 = ready to recommend
- 60–79 = usable but some details missing
- 40–59 = interesting but needs human verification
- 0–39 = not ready for tourist recommendation

Example explanation:
“Tourist readiness is moderate because the provider has a clear location and contact method, but price range and English support need confirmation.”

---

## 5. Risk Filter Score

Purpose:
Prevent bad or unsafe recommendations.

Risk score should work differently from other scores:
Higher risk should reduce eligibility.

Risk signals:

- Scam complaints
- Overcharging complaints
- Safety concerns
- Unclear pricing
- Aggressive selling
- Repeated negative reviews
- Fake review patterns
- Unclear location
- No reliable contact channel
- Unsafe transport / boat / adventure activity without verification
- Medical or wellness claims that need extra caution
- Sensitive or inappropriate business category
- Complaint from tourist / hotel / provider partner

Suggested scoring:

- 0–20 = low risk
- 21–50 = needs caution
- 51–75 = needs human review
- 76–100 = should not be recommended

Status rules:

- risk_score >= 76 → auto status = rejected or suspended
- risk_score 51–75 → status = needs_human_review
- risk_score 21–50 → eligible only if other scores are strong
- risk_score 0–20 → eligible if other dimensions pass

Example explanation:
“Risk review required because recent comments mention unclear pricing and inconsistent service.”

---

# Overall Hidden Gem Logic

Calculate:

overall_loma_score =
(locality_score * 0.25)

- (quality_score * 0.25)
- (visibility_gap_score * 0.20)
- (tourist_readiness_score * 0.20)
- (risk_score * 0.30)

Suggested status logic:

If risk_score >= 76:
hidden_gem_status = "rejected_or_suspended"

Else if risk_score >= 51:
hidden_gem_status = "needs_human_review"

Else if locality_score >= 70
and quality_score >= 70
and visibility_gap_score >= 60
and tourist_readiness_score >= 60
and risk_score <= 50:
hidden_gem_status = "hidden_gem_candidate"

Else if locality_score >= 60
and quality_score >= 60
and tourist_readiness_score >= 60:
hidden_gem_status = "local_provider_candidate"

Else:
hidden_gem_status = "information_only"

---

# UI Requirements

Admin should see scoring breakdown:

Provider: [name]
Overall LOMA Score: [number]
Status: Hidden Gem Candidate / Needs Review / Verified Local / Information Only

Scoring breakdown:

- Locality: 82
- Quality Signal: 76
- Visibility Gap: 71
- Tourist Readiness: 64
- Risk Filter: 18

AI explanation:
“Family-run local restaurant with strong recent sentiment and moderate visibility. Tourist readiness is acceptable, but price range should be confirmed before full verification.”

Admin actions:

- Approve as Verified Local
- Mark as Hidden Gem
- Request More Information
- Send to Human Review
- Reject
- Suspend

Tourist-facing badges:

- Hidden Gem
- Verified Local
- Tourist Ready
- Contact Before Visiting
- Community Experience

Do not show raw internal risk score to tourists.
Only show safe, positive, trust-building labels.

---

# Demo Data Requirement

Create at least 10 provider records with varied scores:

- 2 strong Hidden Gem candidates
- 2 Verified Local providers
- 2 Tourist Ready but not hidden
- 2 Needs Human Review
- 1 Community Experience ready to recommend
- 1 Information Only community listing

This is necessary for demoing how the AI curation system works.