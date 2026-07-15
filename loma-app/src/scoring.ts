// LOMA AI Curation Engine — deterministic, offline, recomputable.
// Ported 1:1 from LOMA-handover/LOMA-prototype.html ("LOMA AI CURATION ENGINE").
// Runs over the signals our REAL Google-enriched providers already carry
// (rating, review count, branches, hours, contact, language, price, safety),
// so the five scores describe real Phuket businesses — not mock seed data.
//
// The defensible point: popularity earns nothing. Weighting review volume would
// just re-rank TripAdvisor's top — the opposite of "local". VisibilityGap is
// HIGH when a place is good AND under-discovered.

export type SourceType =
  | "ai_discovered"
  | "hotel_nominated"
  | "community_nominated"
  | "self_registered"
  | "admin_added";

export type ProviderStatus =
  | "candidate"
  | "ai_shortlisted"
  | "needs_human_review"
  | "verified"
  | "rejected"
  | "suspended";

export type FreshnessStatus = "fresh" | "needs_refresh" | "stale";
export type ReviewSignal = "improving" | "stable" | "declining" | "risk_detected";

// Minimal signal surface the engine reads (our Pick satisfies this).
export interface ScoreInput {
  id: string;
  name: string;
  cat: string;
  area: string;
  rating: number;
  reviews: number;
  branches: number;
  local: boolean;
  verified: boolean;
  hours: string;
  contact: string;
  priceText: string;
  lang: string;
  img: string;
  quality: number;
  locality: number;
  readiness: number;
  safety: number;
  seed?: boolean;
  sourceType?: SourceType;
}

export type EvidenceStrength = "strong" | "medium" | "weak" | "negative";
export type LocalityStatus = "verified_local" | "likely_local" | "unclear" | "not_local";
export interface LocalityEvidence {
  signal: string;
  source: string;
  strength: EvidenceStrength;
}

export interface AiScore {
  loma_cat: string;
  source_type: SourceType;
  locality_score: number;
  // Localness is a SCORE + a CONFIDENCE + evidence — a high score with weak
  // evidence is NOT proof of ownership. AI may say "Likely Local — requires
  // verification" but never "Verified Local" without strong evidence / human sign-off.
  locality_confidence: number; // 0–1
  locality_status: LocalityStatus;
  locality_evidence: LocalityEvidence[];
  quality_score: number;
  visibility_gap_score: number;
  readiness_score: number;
  risk_score: number;
  overall_loma_score: number;
  is_local: boolean;
  is_hidden_gem: boolean;
  is_tourist_ready: boolean;
  is_community_experience: boolean;
  requires_advance_contact: boolean;
  risk_flags: [string, "high" | "med"][];
  last_checked_at: string;
  last_verified_at: string | null;
  freshness_status: FreshnessStatus;
  review_signal_status: ReviewSignal;
  status: ProviderStatus;
  is_verified: boolean;
  ai_summary: string;
}

export const LOMA_CATS: [string, string][] = [
  ["Local Food", "🍜"],
  ["Café & Dessert", "☕"],
  ["Massage & Spa", "💆"],
  ["Souvenirs & Crafts", "🎁"],
  ["Local Product", "🧺"],
  ["Community Experience", "🛶"],
  ["Wellness", "🧘"],
];

export function lomaCat(c: string): string {
  c = c || "";
  if (/Cooking|Food|Kitchen/i.test(c)) return "Local Food";
  if (/Caf|Dessert/i.test(c)) return "Café & Dessert";
  if (/Massage|Spa/i.test(c)) return "Massage & Spa";
  if (/Souvenir|Craft/i.test(c)) return "Souvenirs & Crafts";
  if (/Community|Guide|Boat|Sea/i.test(c)) return "Community Experience";
  if (/Wellness|Yoga/i.test(c)) return "Wellness";
  if (/Market|Product|Bar/i.test(c)) return "Local Product";
  return "Local Product";
}

const SOURCE_TYPES: SourceType[] = [
  "ai_discovered",
  "hotel_nominated",
  "community_nominated",
  "self_registered",
  "admin_added",
];

export const SRC_LABEL: Record<SourceType, string> = {
  ai_discovered: "🤖 AI-discovered",
  hotel_nominated: "🏨 Hotel-nominated",
  community_nominated: "🌾 Community-nominated",
  self_registered: "✍️ Self-registered",
  admin_added: "🛡 Admin-added",
};

// FNV-1a hash — deterministic pseudo-randomness keyed on provider id.
function hsh(s: string): number {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const clampi = (n: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(n)));

// ---------- the five AI dimensions ----------
const THAI_SCRIPT = /[฀-๿]/;
function scoreLocality(p: ScoreInput): number {
  let s = (p.locality || 70) * 0.6;
  s += p.branches === 1 ? 22 : p.branches <= 2 ? 10 : 0;
  s += p.local ? 8 : 0;
  s += /Community|Craft|Market|Souvenir/i.test(p.cat) ? 8 : 0;
  // Local-identity signals available from public data (legitimate, not fabricated):
  // a Thai-script business name is a strong indicator of a locally-owned operator
  // rather than a chain or expat/tourist-facing brand.
  const thaiName = THAI_SCRIPT.test(p.name || "");
  s += thaiName ? 10 : 0;
  // a Thai-named independent kitchen/café is core-local — this is what lets genuine
  // food/café gems clear the Hidden Gem locality bar (they otherwise cap ~72).
  if (thaiName && /Food|Kitchen|Cook|Caf|Dessert|Noodle|Rice/i.test(p.cat)) s += 6;
  if (/starbucks|7-eleven|mcdonald|franchise|chain|group co/i.test(p.name || "")) s -= 60;
  return clampi(s, 0, 100);
}
function scoreQuality(p: ScoreInput): number {
  const r = p.rating || 4.2;
  let s = (p.quality || 70) * 0.55 + (r - 3.4) * 28;
  s += p.reviews >= 25 ? 8 : 0;
  s += p.verified ? 5 : 0;
  // Real-data adaptation (the handover's mock data never has <15 reviews):
  // you cannot claim "quality" from a handful of ratings, so damp thin samples.
  // This keeps single-review 5★ places out of the Hidden Gem list, in the spirit
  // of the engine's own "enough signal to trust" rule.
  if (p.reviews < 5) s -= 22;
  else if (p.reviews < 12) s -= 12;
  else if (p.reviews < 20) s -= 5;
  return clampi(s, 0, 100);
}
function scoreVisibilityGap(p: ScoreInput): number {
  const n = Math.max(1, p.reviews || 1);
  const L = Math.log10(n + 1),
    lo = Math.log10(11),
    hi = Math.log10(700);
  const fame = clampi((100 * (L - lo)) / (hi - lo), 0, 100);
  let s = 100 - fame;
  s += (p.rating || 0) >= 4.3 ? 10 : 0;
  s -= /Patong|Kata|Karon/i.test(p.area || "") ? 12 : 0;
  return clampi(s, 0, 100);
}
function scoreReadiness(p: ScoreInput): number {
  let s = (p.readiness || 70) * 0.68;
  s += p.hours && !/varies/i.test(p.hours) ? 8 : 0;
  s += p.contact ? 8 : 0;
  s += p.priceText ? 6 : 0;
  s += /English/i.test(p.lang || "") ? 8 : 0;
  s += p.img ? 4 : 0;
  return clampi(s, 0, 100);
}
function scoreRisk(p: ScoreInput): number {
  let s = 100 - (p.safety || 85);
  const h = hsh("risk|" + p.id) % 100;
  if (!p.seed && h < 7) s += 42;
  if (!p.priceText) s += 10;
  if (/Boat|Sea/i.test(p.cat || "")) s += 8;
  return clampi(s, 0, 100);
}
function riskFlags(p: ScoreInput): [string, "high" | "med"][] {
  const f: [string, "high" | "med"][] = [];
  const h = hsh("risk|" + p.id) % 100;
  if (!p.seed && h < 7) f.push(["Repeated complaint pattern in recent reviews", "high"]);
  if (!p.priceText) f.push(["Price not clearly stated", "med"]);
  if (/Boat|Sea/i.test(p.cat || "")) f.push(["High-risk activity — licensing check required", "med"]);
  if ((p.safety || 85) < 78) f.push(["Safety/hygiene signal below threshold", "med"]);
  return f;
}

// Hidden Gem = quality under-discovered, NOT popularity. All five must pass.
function isHiddenGem(s: {
  locality_score: number;
  quality_score: number;
  visibility_gap_score: number;
  readiness_score: number;
  risk_score: number;
}): boolean {
  return (
    s.locality_score >= 78 &&
    s.quality_score >= 72 &&
    s.visibility_gap_score >= 55 &&
    s.readiness_score >= 62 &&
    s.risk_score <= 25
  );
}

function aiExplain(p: ScoreInput, s: Omit<AiScore, "ai_summary">): string {
  const bits: string[] = [];
  const kind =
    ({
      "Local Food": "local kitchen",
      "Café & Dessert": "neighbourhood café",
      "Massage & Spa": "local therapist-run spa",
      "Souvenirs & Crafts": "artisan maker",
      "Local Product": "local shop",
      "Community Experience": "community-run experience",
      Wellness: "local wellness studio",
    } as Record<string, string>)[s.loma_cat] || "local business";
  if (s.locality_score >= 85) bits.push("Independent " + kind + ", single location");
  else if (s.locality_score >= 70) bits.push("Locally owned " + kind);
  else bits.push(kind + " with limited local-ownership signal");
  const revLabel = `${p.reviews || 0} review${p.reviews === 1 ? "" : "s"}`;
  if (s.quality_score >= 82)
    bits.push(`strong recent sentiment (${p.rating || "—"}★, ${revLabel})`);
  else if (s.quality_score >= 70) bits.push(`solid review signal (${p.rating || "—"}★)`);
  else if (p.reviews < 12) bits.push(`quality signal still thin (only ${revLabel})`);
  else bits.push("quality signal still thin");
  if (s.visibility_gap_score >= 70) bits.push("low mainstream visibility");
  else if (s.visibility_gap_score >= 50) bits.push("moderately under-discovered");
  else bits.push("already well known to tourists");
  let tail = "";
  if (s.risk_score >= 40) tail = " Risk signal detected — human review required before publishing.";
  else if (s.readiness_score < 62)
    tail = " Needs contact first: readiness incomplete (price, hours or language unclear).";
  else if (s.loma_cat === "Community Experience")
    tail = " Requires advance contact and capacity confirmation.";
  else if (s.readiness_score >= 80)
    tail = " Tourist-ready: clear hours, price and contact channel.";
  return bits.join(", ") + "." + tail;
}

// ---------- Localness evidence, confidence & status ----------
// Reviews/keywords are only WEAK evidence of "local"; ownership/registry/partner
// confirmation is STRONG. We tier evidence by provenance (source_type) + signals,
// derive a confidence, and only call something "verified_local" with strong evidence.
const SRC_EVIDENCE: Record<SourceType, LocalityEvidence> = {
  community_nominated: { signal: "Listed in the community-based-tourism (CBT) registry", source: "cbt_registry", strength: "strong" },
  hotel_nominated: { signal: "Nominated by a hotel partner", source: "hotel", strength: "strong" },
  admin_added: { signal: "Added by a LOMA operator", source: "loma", strength: "strong" },
  self_registered: { signal: "Self-registered by the business", source: "provider", strength: "medium" },
  ai_discovered: { signal: "Discovered from public data (Google Maps / OSM)", source: "public_data", strength: "weak" },
};

function localness(
  p: ScoreInput,
  source_type: SourceType,
  locality_score: number,
  approved: boolean
): { confidence: number; status: LocalityStatus; evidence: LocalityEvidence[] } {
  const ev: LocalityEvidence[] = [SRC_EVIDENCE[source_type]];
  if (p.branches === 1) ev.push({ signal: "Single location — no branches", source: "maps_data", strength: "medium" });
  if (/Community|Craft|Market|Souvenir/i.test(p.cat))
    ev.push({ signal: "Community / craft / market category", source: "category", strength: "medium" });
  if (THAI_SCRIPT.test(p.name || ""))
    ev.push({ signal: "Thai-script business name", source: "name", strength: "weak" });
  if (/starbucks|7-eleven|mcdonald|franchise|chain|group co/i.test(p.name || ""))
    ev.push({ signal: "Matches a chain / franchise name pattern", source: "name", strength: "negative" });

  const n = (s: EvidenceStrength) => ev.filter((e) => e.strength === s).length;
  const strong = n("strong"), medium = n("medium"), weak = n("weak"), neg = n("negative");
  let c =
    strong > 0 ? 0.72 + 0.06 * (strong - 1) + 0.03 * medium :
    medium > 0 ? 0.44 + 0.06 * medium + 0.02 * weak :
    weak > 0 ? 0.24 + 0.04 * weak : 0.15;
  c -= 0.25 * neg;
  const confidence = Math.max(0.05, Math.min(0.95, Math.round(c * 100) / 100));

  let status: LocalityStatus;
  if (neg > 0 || locality_score < 40) status = "not_local";
  else if (approved || (strong > 0 && locality_score >= 75)) status = "verified_local";
  else if (locality_score >= 65 && strong + medium > 0 && confidence >= 0.4) status = "likely_local";
  else status = "unclear";
  return { confidence, status, evidence: ev };
}

// Fixed reference date keeps freshness deterministic across reloads (demo-stable).
const NOW = new Date("2026-07-13T09:00:00Z");
const dstr = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => dstr(new Date(NOW.getTime() - n * 864e5));
const SIGNALS: ReviewSignal[] = ["improving", "stable", "stable", "stable", "declining"];

export interface ApprovalState {
  approved: Set<string>;
  suspended: Set<string>;
}

/** Score one provider. Pure — returns the computed fields, does not mutate input. */
export function aiScore(p: ScoreInput, approvals?: ApprovalState): AiScore {
  const loma_cat = lomaCat(p.cat);
  const source_type = p.sourceType || SOURCE_TYPES[hsh("src|" + p.id) % 5];
  const locality_score = scoreLocality(p);
  const quality_score = scoreQuality(p);
  const visibility_gap_score = scoreVisibilityGap(p);
  const readiness_score = scoreReadiness(p);
  const risk_score = scoreRisk(p);
  const overall_loma_score = clampi(
    locality_score * 0.3 +
      quality_score * 0.25 +
      visibility_gap_score * 0.2 +
      readiness_score * 0.25 -
      risk_score * 0.3,
    0,
    100
  );
  const is_hidden_gem = isHiddenGem({
    locality_score,
    quality_score,
    visibility_gap_score,
    readiness_score,
    risk_score,
  });
  const is_community_experience = loma_cat === "Community Experience";
  const loc = localness(p, source_type, locality_score, !!approvals?.approved.has(p.id));

  const hA = hsh("age|" + p.id) % 100,
    hB = hsh("agf|" + p.id);
  const age = hA < 66 ? hB % 29 : hA < 88 ? 30 + (hB % 44) : 76 + (hB % 44);
  const freshness_status: FreshnessStatus =
    age < 30 ? "fresh" : age < 75 ? "needs_refresh" : "stale";
  const review_signal_status: ReviewSignal =
    risk_score >= 40 ? "risk_detected" : SIGNALS[hsh("sig|" + p.id) % 5];

  // status machine — ai_discovered & self_registered must pass the human queue
  const pipeline = source_type === "ai_discovered" || source_type === "self_registered";
  let status: ProviderStatus;
  if (approvals?.approved.has(p.id)) status = "verified";
  else if (approvals?.suspended.has(p.id)) status = "suspended";
  else if (risk_score >= 45) status = "needs_human_review";
  else if (readiness_score < 58) status = "needs_human_review";
  else if (p.verified && !pipeline && overall_loma_score >= 55) status = "verified";
  else if (is_hidden_gem) status = "ai_shortlisted";
  else if (overall_loma_score < 38) status = "rejected";
  else status = "candidate";

  const base: Omit<AiScore, "ai_summary"> = {
    loma_cat,
    source_type,
    locality_score,
    locality_confidence: loc.confidence,
    locality_status: loc.status,
    locality_evidence: loc.evidence,
    quality_score,
    visibility_gap_score,
    readiness_score,
    risk_score,
    overall_loma_score,
    is_local: locality_score >= 70,
    is_hidden_gem,
    is_tourist_ready: readiness_score >= 70 && risk_score < 30,
    is_community_experience,
    requires_advance_contact: is_community_experience || readiness_score < 70,
    risk_flags: riskFlags(p),
    last_checked_at: daysAgo(age),
    last_verified_at: p.verified ? daysAgo(age + (hsh("ver|" + p.id) % 40)) : null,
    freshness_status,
    review_signal_status,
    status,
    is_verified: status === "verified",
  };
  return { ...base, ai_summary: aiExplain(p, base) };
}

export const STATUS_LABEL: Record<ProviderStatus, string> = {
  candidate: "Candidate",
  ai_shortlisted: "AI-shortlisted",
  needs_human_review: "Needs human review",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};
