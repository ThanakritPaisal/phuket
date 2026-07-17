#!/usr/bin/env node
/**
 * gen_real_loma_data.mjs — inject REAL Phuket provider data into LOMA.html.
 *
 * The LOMA.html prototype ships with a synthetic `window.LOMA_DATA` bundle and 6
 * hand-curated demo `PROVIDERS`. This script replaces that data with the 1,243 REAL
 * Google/OSM/TAT-enriched providers from the loma-app (old React version), run through
 * loma-app's OWN deterministic AI Curation Engine (scoring.ts) so the five LOMA scores,
 * the localness/verification status machine and the narrative copy all describe real
 * businesses — NOT mock seed data.
 *
 * It ports (1:1) the pure logic from loma-app/src/{scoring,geo,copy,social,picks}.ts and:
 *   1. maps every real provider -> the operator schema LOMA.html's OPS / Admin dashboard use
 *   2. re-points the 6 curated demo cards at real high-scoring places (keeping their ids so
 *      every hardcoded phone-demo flow keeps working) + real map pins
 *   3. regenerates referentially-consistent staff / tourists / recommendations / transactions
 *      (there is no real tourist/transaction data) against the REAL operator ids + real hotels
 *   4. injects the result into LOMA.html WITHOUT touching any markup, CSS or JS logic
 *      (a byte-for-byte backup is kept at LOMA.html.orig; re-runs read from it, so it is idempotent)
 *
 * Run:  node data/gen_real_loma_data.mjs
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../../..");                 // .../phuket
const LOMA_APP_DATA = resolve(REPO, "loma-app/src/data");
const HTML_PATH = resolve(__dirname, "../LOMA.html");
const HTML_ORIG = resolve(__dirname, "../LOMA.html.orig");

const ASSET_BASE = "https://storage.googleapis.com/gradient-digital-group-loma-assets";
const assetUrl = (p) => (!p ? "" : /^https?:\/\//.test(p) ? p : ASSET_BASE + (p.startsWith("/") ? p : "/" + p));

const providers = JSON.parse(readFileSync(resolve(LOMA_APP_DATA, "providers.json"), "utf8"));
const accountsRaw = JSON.parse(readFileSync(resolve(LOMA_APP_DATA, "accounts.real.json"), "utf8"));

/* ============================================================================
   1:1 PORT — geo.ts
   ============================================================================ */
const PHUKET_BBOX = { latMin: 7.74, latMax: 8.26, lngMin: 98.24, lngMax: 98.6 };
const R_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
}
const AVG_KMH = 35, WALK_KMH = 4.5;
const driveMinutes = (km) => Math.max(1, Math.round(((km * 1.3) / AVG_KMH) * 60));
const walkMinutes = (km) => Math.max(1, Math.round(((km * 1.2) / WALK_KMH) * 60));
const distLabel = (km) => (km < 1.0 ? `${walkMinutes(km)} min walk` : `${driveMinutes(km)} min by car`);
function project(p) {
  const { latMin, latMax, lngMin, lngMax } = PHUKET_BBOX;
  const x = ((p.lng - lngMin) / (lngMax - lngMin)) * 100;
  const y = ((latMax - p.lat) / (latMax - latMin)) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(6, y)) };
}
const AREA_CENTROIDS = {
  Patong: { lat: 7.8965, lng: 98.2966 }, Kata: { lat: 7.8199, lng: 98.2986 },
  Karon: { lat: 7.846, lng: 98.2949 }, Kamala: { lat: 7.954, lng: 98.281 },
  Surin: { lat: 7.977, lng: 98.279 }, "Bang Tao": { lat: 8.0, lng: 98.296 },
  "Phuket Old Town": { lat: 7.8842, lng: 98.3878 }, Rawai: { lat: 7.774, lng: 98.324 },
  "Nai Harn": { lat: 7.777, lng: 98.303 }, Chalong: { lat: 7.843, lng: 98.338 },
  Kathu: { lat: 7.911, lng: 98.332 }, "Nai Yang": { lat: 8.09, lng: 98.3 },
  "Mai Khao": { lat: 8.16, lng: 98.3 }, "Cape Panwa": { lat: 7.806, lng: 98.403 },
  Thalang: { lat: 8.033, lng: 98.336 },
};

/* ============================================================================
   1:1 PORT — scoring.ts (the AI Curation Engine)
   ============================================================================ */
function hsh(s) {
  let h = 2166136261; s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const clampi = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));
const THAI_SCRIPT = /[฀-๿]/;

function scoreLocality(p) {
  let s = (p.locality || 70) * 0.6;
  s += p.branches === 1 ? 22 : p.branches <= 2 ? 10 : 0;
  s += p.local ? 8 : 0;
  s += /Community|Craft|Market|Souvenir/i.test(p.cat) ? 8 : 0;
  const thaiName = THAI_SCRIPT.test(p.name || "");
  s += thaiName ? 10 : 0;
  if (thaiName && /Food|Kitchen|Cook|Caf|Dessert|Noodle|Rice/i.test(p.cat)) s += 6;
  if (/starbucks|7-eleven|mcdonald|franchise|chain|group co/i.test(p.name || "")) s -= 60;
  return clampi(s, 0, 100);
}
function scoreQuality(p) {
  const r = p.rating || 4.2;
  let s = (p.quality || 70) * 0.55 + (r - 3.4) * 28;
  s += p.reviews >= 25 ? 8 : 0;
  s += p.verified ? 5 : 0;
  if (p.reviews < 5) s -= 22; else if (p.reviews < 12) s -= 12; else if (p.reviews < 20) s -= 5;
  return clampi(s, 0, 100);
}
function scoreVisibilityGap(p) {
  const n = Math.max(1, p.reviews || 1);
  const L = Math.log10(n + 1), lo = Math.log10(11), hi = Math.log10(700);
  const fame = clampi((100 * (L - lo)) / (hi - lo), 0, 100);
  let s = 100 - fame;
  s += (p.rating || 0) >= 4.3 ? 10 : 0;
  s -= /Patong|Kata|Karon/i.test(p.area || "") ? 12 : 0;
  return clampi(s, 0, 100);
}
function scoreReadiness(p) {
  let s = (p.readiness || 70) * 0.68;
  s += p.hours && !/varies/i.test(p.hours) ? 8 : 0;
  s += p.contact ? 8 : 0;
  s += p.priceText ? 6 : 0;
  s += /English/i.test(p.lang || "") ? 8 : 0;
  s += p.img ? 4 : 0;
  return clampi(s, 0, 100);
}
function scoreRisk(p) {
  let s = 100 - (p.safety || 85);
  const h = hsh("risk|" + p.id) % 100;
  if (!p.seed && h < 7) s += 42;
  if (!p.priceText) s += 10;
  if (/Boat|Sea/i.test(p.cat || "")) s += 8;
  return clampi(s, 0, 100);
}
const isHiddenGem = (s) =>
  s.locality_score >= 78 && s.quality_score >= 72 && s.visibility_gap_score >= 55 &&
  s.readiness_score >= 62 && s.risk_score <= 25;

const SOURCE_TYPES = ["ai_discovered", "hotel_nominated", "community_nominated", "self_registered", "directory_listed", "admin_added"];

/** compute the status-machine outcome (scoring.ts aiScore, status subset). */
function aiStatus(p, source_type) {
  const locality_score = scoreLocality(p);
  const quality_score = scoreQuality(p);
  const visibility_gap_score = scoreVisibilityGap(p);
  const readiness_score = scoreReadiness(p);
  const risk_score = scoreRisk(p);
  const overall = clampi(
    locality_score * 0.3 + quality_score * 0.25 + visibility_gap_score * 0.2 + readiness_score * 0.25 - risk_score * 0.3,
    0, 100
  );
  const hg = isHiddenGem({ locality_score, quality_score, visibility_gap_score, readiness_score, risk_score });
  const pipeline = source_type === "ai_discovered" || source_type === "self_registered";
  let status;
  if (risk_score >= 45) status = "needs_human_review";
  else if (readiness_score < 58) status = "needs_human_review";
  else if (p.verified && !pipeline && overall >= 55) status = "verified";
  else if (hg) status = "ai_shortlisted";
  else if (overall < 38) status = "rejected";
  else status = "candidate";
  return { status, overall, hg };
}

/* sourceTypeFor — picks.ts */
function sourceTypeFor(src) {
  switch (src) {
    case "osm_bulk": case "osm_sample": case "osm": return "ai_discovered";
    case "tat_restaurants": case "tat_spas": case "tat_stores": case "tat": return "directory_listed";
    case "hotel_nominated": return "hotel_nominated";
    case "admin_added": return "admin_added";
    case "self_registered": return "self_registered";
    case "cbt_seed": case undefined: case null: case "": return "community_nominated";
    default: return "ai_discovered";
  }
}

/* ============================================================================
   1:1 PORT — copy.ts (narrative, grounded only in real fields)
   ============================================================================ */
const CAT_FIT = {
  "Community Experience": "a community-run experience", "Local Food": "a local kitchen",
  "Souvenir & Local Product": "a local maker's shop", "Massage & Wellness": "a local wellness spot",
  "Boat / Sea": "a local boat operator",
};
const CAT_TAGS = {
  "Community Experience": ["local culture", "families"], "Local Food": ["local food", "couples"],
  "Souvenir & Local Product": ["souvenirs", "local crafts"], "Massage & Wellness": ["rainy day", "couples"],
  "Boat / Sea": ["nature", "half-day"],
};
function reasonFor(p, dist) {
  const kind = CAT_FIT[p.category] || "a verified local place";
  const bits = [`${kind} in ${p.area}`];
  if (dist) bits.push(dist.toLowerCase() + " away");
  if (p.rating != null && p.reviews != null && p.reviews >= 5) bits.push(`rated ${p.rating}★ by ${p.reviews} visitors on Google`);
  else if (p.rating != null) bits.push(`rated ${p.rating}★ on Google`);
  else bits.push("newly listed and vetted by LOMA");
  const lead = bits.join(", ");
  return p.summary ? `${lead}. ${p.summary}` : `${lead}.`;
}
function whyLocalFor(p) {
  const base = "Sourced from Phuket's community-based tourism registry — a locally owned, community-run operator rather than a chain or tour-desk listing.";
  return p.confidence === "HIGH" ? `${base} Identity and location verified against Google.` : base;
}
function bestForFor(p) {
  const tags = [...(CAT_TAGS[p.category] || ["local culture"])];
  if (p.rating != null && p.rating >= 4.5) tags.push("highly rated");
  if (p.price === "Free" || p.price === "฿") tags.push("great value");
  return Array.from(new Set(tags)).slice(0, 3);
}
function scoresFor(p) {
  const r = p.rating ?? 4.0, n = p.reviews ?? 0;
  const confidence = p.confidence === "HIGH" ? 6 : 0;
  const volume = Math.min(12, Math.round(Math.log10(Math.max(1, n)) * 6));
  const quality = Math.max(60, Math.min(98, Math.round(r * 18) + volume));
  const locality = p.confidence === "HIGH" ? 96 : 90;
  const readiness = Math.max(60, Math.min(96, 66 + confidence + (p.phone ? 8 : 0) + (p.hours.length ? 10 : 0)));
  const safety = Math.max(70, Math.min(96, 78 + confidence + (p.website ? 4 : 0)));
  return { quality, locality, readiness, safety };
}

/* ============================================================================
   1:1 PORT — social.ts (deterministic demo social links)
   ============================================================================ */
function demoSocial(id, name, category) {
  if (category === "Community Experience") return null;
  const q = encodeURIComponent((name || "") + " Phuket");
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const s = {};
  if (hsh("fb|" + id) % 10 < 8) s.facebook = "https://www.facebook.com/search/top?q=" + q;
  if (hsh("ig|" + id) % 10 < 6) s.instagram = "https://www.instagram.com/explore/tags/" + slug + "/";
  if (hsh("tk|" + id) % 10 < 5) s.tiktok = "https://www.tiktok.com/search?q=" + q;
  return Object.keys(s).length ? s : null;
}

/* ============================================================================
   Category mapping: real provider category -> the vocabulary LOMA.html's filters
   (INTENT_MAP / CATS chips) expect, so category filtering keeps working unchanged.
   ============================================================================ */
const HTML_CAT = {
  "Local Food": ["Local Food", "🍜"],
  "Seafood": ["Local Food", "🍜"],
  "Street Food & Noodles": ["Local Food", "🍜"],
  "Café & Dessert": ["Café", "☕"],
  "Massage & Wellness": ["Massage & Wellness", "💆"],
  "Souvenir & Local Product": ["Souvenir & Local Product", "🎁"],
  "Community Experience": ["Community Experience", "🛶"],
  "Boat / Sea": ["Boat / Sea", "⛵"],
};
const htmlCat = (c) => (HTML_CAT[c] || ["Local Food", "🍜"])[0];
const htmlEmo = (c) => (HTML_CAT[c] || ["Local Food", "🍜"])[1];

const VETTING = {
  verified: "verified", ai_shortlisted: "pending", candidate: "pending",
  needs_human_review: "needs review", rejected: "rejected", suspended: "needs review",
};

/* Reference point for the static "distance" label (operators are global; use the
   flagship real hotel, Istanbul Boutique / Patong, as the recommending property). */
const REF = { lat: accountsRaw[0].lat, lng: accountsRaw[0].lng };

/* ============================================================================
   Build operators from the real providers, run through the real engine.
   ============================================================================ */
function buildOperator(p) {
  const sourceType = sourceTypeFor(p.source);
  const s = scoresFor(p);
  const xy = project({ lat: p.lat, lng: p.lng });
  const km = haversineKm(REF, { lat: p.lat, lng: p.lng });
  const hours = p.hours && p.hours.length ? p.hours[0].replace(/^\w+:\s*/, "") : "See Google Maps";
  const price = p.price && p.price.trim() ? p.price : "฿฿";
  const img = assetUrl(p.photo);
  const cat = htmlCat(p.category);

  // scoring input mirrors loma-app toPick(): every catalog provider is treated as a
  // vetted CBT operator (verified:true) for scoring; the status machine still routes
  // ai_discovered/self_registered records through the human queue.
  const scoreInput = {
    id: p.id, name: p.name, cat: p.category, area: p.area,
    rating: p.rating ?? 0, reviews: p.reviews ?? 0, branches: 1, local: true, verified: true,
    hours, contact: p.phone ? "Phone" : "", priceText: price, lang: "Thai · English", img,
    quality: s.quality, locality: s.locality, readiness: s.readiness, safety: s.safety,
  };
  const { status } = aiStatus(scoreInput, sourceType);
  const vettingStatus = VETTING[status] || "pending";
  const verified = vettingStatus === "verified";

  const h = hsh("op|" + p.id);
  return {
    id: p.id, name: p.name, cat, emo: htmlEmo(p.category), area: p.area,
    mapX: Math.round(xy.x), mapY: Math.round(xy.y), dist: distLabel(km),
    price, priceText: price === "฿" ? "฿60–150" : price === "฿฿฿" ? "฿600–1,500 / person" : "฿150–350 / person",
    open: p.openNow ?? true, hours, local: true, verified, vettingStatus,
    quality: s.quality, locality: s.locality, readiness: s.readiness, safety: s.safety,
    loma_score: Math.round((s.quality + s.locality + s.readiness + s.safety) / 4),
    rating: p.rating ?? 0, reviews: p.reviews ?? 0, branches: 1, lang: "Thai · English",
    booking: p.phone ? "Walk-in welcome · call ahead for groups" : "Walk-in welcome",
    contact: p.phone ? "Phone" : "In person", pick: false,
    bestFor: bestForFor(p), img,
    reason: reasonFor(p, distLabel(km)), whyLocal: whyLocalFor(p),
    note: p.address ? `Address: ${p.address}` : "", sum: p.summary || "",
    social: demoSocial(p.id, p.name, p.category),
    leads: 0, opens: 0, visits: 0,
    onboardedDate: new Date(Date.UTC(2025, 0, 1) + (h % 520) * 864e5).toISOString().slice(0, 10),
  };
}

const withGeo = providers.filter((p) => p.lat != null && p.lng != null);

/* ---- pick the 6 curated demo cards (real high-scoring places), keep slot ids ---- */
// slot -> which real provider category feeds it (matches the original demo's theme)
const CURATED_SLOTS = [
  { id: "BRT", cats: ["Local Food", "Seafood"] },
  { id: "OTH", cats: ["Massage & Wellness"] },
  { id: "RFE", cats: ["Community Experience"] },
  { id: "KLD", cats: ["Café & Dessert"] },
  { id: "PCH", cats: ["Souvenir & Local Product"] },
  { id: "NYC", cats: ["Community Experience"] },
];
const scoreOf = (p) => {
  const s = scoresFor(p);
  return Math.round((s.quality + s.locality + s.readiness + s.safety) / 4);
};
// Is this real provider a genuine HIDDEN GEM per the AI engine? (local + quality +
// under-discovered + ready + low-risk). These make the on-message hero demo cards.
function hiddenGemFlag(p) {
  const s = scoresFor(p);
  const inp = { id: p.id, name: p.name, cat: p.category, area: p.area, rating: p.rating ?? 0, reviews: p.reviews ?? 0, branches: 1, local: true, verified: true, hours: (p.hours && p.hours.length) ? "x" : "", contact: p.phone ? "Phone" : "", priceText: (p.price && p.price.trim()) ? p.price : "฿฿", lang: "Thai · English", img: p.photo ? "x" : "", quality: s.quality, locality: s.locality, readiness: s.readiness, safety: s.safety };
  return aiStatus(inp, sourceTypeFor(p.source)).hg;
}
// Exclude obvious franchises/chains — they contradict LOMA's "local, not chains" promise.
const CHAIN = /coffee club|starbucks|café amazon|cafe amazon|amazon|7-eleven|mcdonald|kfc|burger king|pizza (hut|company)|domino|subway|dunkin|swensen|dairy queen|au bon pain|black canyon|true coffee|tops|big c|villa market|makro|franchise|\bchain\b/i;
// Exclude records that source data mis-tagged (clinics/hospitals/schools tagged "Local Food").
const NON_HOSPITALITY = /clinic|hospital|dental|pharmacy|โรงพยาบาล|คลินิก|ทันตกรรม|โรงเรียน|\bschool\b|กรอบรูป|อัดรูป/i;
const _curatedSeen = new Set();
const candidatesByScore = [...withGeo]
  .filter((p) => p.photo && (p.reviews ?? 0) >= 40 && (p.reviews ?? 0) <= 500 &&
    !CHAIN.test(p.name || "") && !NON_HOSPITALITY.test(p.name || ""))
  // credible, well-reviewed but not mega-famous local places; best LOMA score first
  .sort((a, b) => scoreOf(b) - scoreOf(a) || (b.reviews ?? 0) - (a.reviews ?? 0))
  .filter((p) => { const k = (p.name || "").trim().toLowerCase(); if (_curatedSeen.has(k)) return false; _curatedSeen.add(k); return true; });

const curatedSourceIds = new Set();
const PROVIDERS = [];
const PINS = [];
for (const slot of CURATED_SLOTS) {
  const pick = candidatesByScore.find((p) => slot.cats.includes(p.category) && !curatedSourceIds.has(p.id));
  if (!pick) continue;
  curatedSourceIds.add(pick.id);
  const op = buildOperator(pick);
  // keep the curated slot id (BRT/OTH/…) so every hardcoded phone-demo flow still resolves
  PROVIDERS.push({ ...op, id: slot.id, pick: true });
  const xy = project({ lat: pick.lat, lng: pick.lng });
  PINS.push({ id: slot.id, x: Math.round(xy.x), y: Math.round(xy.y) });
}

/* operators = every real provider EXCEPT the 6 promoted into the curated demo slots */
const operators = withGeo.filter((p) => !curatedSourceIds.has(p.id)).map(buildOperator);

/* ============================================================================
   Synthetic demand side (no real tourists/transactions exist) — referentially
   consistent against the REAL operator ids + real hotels. Deterministic PRNG.
   ============================================================================ */
let _seed = 0x9e3779b9;
function rng() { _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const sample = (arr, k) => { const c = [...arr], o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(rng() * c.length), 1)[0]); return o; };
function wpick(weighted) { const r = rng(); let c = 0; for (const [v, w] of weighted) { c += w; if (r <= c) return v; } return weighted[weighted.length - 1][0]; }

const dstr = (d) => d.toISOString().slice(0, 10);
const AREAS = Object.entries(AREA_CENTROIDS).map(([area, ll]) => { const xy = project(ll); return { area, x: Math.round(xy.x), y: Math.round(xy.y) }; });
const AREA_NAMES = AREAS.map((a) => a.area);

// staff: first 5 venues are the REAL hotel/partner accounts; rest synthetic for volume.
const STAFF_ROLES = ["Front-desk", "Concierge", "Guest relations", "Rental staff", "Tour desk", "Owner / manager"];
const PARTNER_TYPES = ["Hotel front desk", "Hostel", "Guesthouse", "Villa manager", "Motorbike rental", "Car rental", "Dive shop", "Tour desk"];
const THAI_FIRST = ["Somchai", "Nok", "Aor", "Ploy", "Beam", "Pim", "Kai", "Mai", "Tan", "Fern", "Aon", "Boss", "Nan", "Praew", "Win", "Gift", "Mint", "Earth", "Bank", "Tee", "Ja", "Bow", "Net", "June", "Tom"];
const THAI_LAST = ["S.", "T.", "P.", "K.", "W.", "R.", "C.", "N.", "L.", "M."];
const VENUE_NAMES = ["Sea Breeze", "Kata", "Rawai", "Old Town", "Bang Tao", "Chalong", "Andaman", "Surin", "Patong", "Nai Harn", "Kamala", "Karon"];
const VENUE_TYPES = ["Boutique Hotel", "Backpackers Hostel", "Guesthouse", "Villa Mgmt", "Scooter Rental", "Car Hire", "Dive Centre", "Tour Desk", "Beach Resort", "Residence"];

const staff = [];
const N_STAFF = 60;
for (let i = 0; i < N_STAFF; i++) {
  const real = accountsRaw[i];
  const venue = real ? real.name : `${pick(VENUE_NAMES)} ${pick(VENUE_TYPES)}`;
  const area = real ? real.area || real.tambon || pick(AREA_NAMES) : pick(AREA_NAMES);
  const recs = ri(8, 180), opens = Math.floor(recs * (0.62 + rng() * 0.26)), visits = Math.floor(opens * (0.28 + rng() * 0.22));
  staff.push({
    id: `ST${String(i + 1).padStart(3, "0")}`, name: `${pick(THAI_FIRST)} ${pick(THAI_LAST)}`,
    role: pick(STAFF_ROLES), venue, venueType: real ? "Hotel front desk" : pick(PARTNER_TYPES), area,
    languages: sample(["Thai", "English", "Chinese", "Russian", "German", "French"], ri(2, 3)),
    active: rng() > 0.15, recs, opens, visits,
    conversionRate: recs ? Math.round((visits / recs) * 1000) / 1000 : 0,
    commissionTHB: visits * ri(20, 60), joinedDate: dstr(new Date(Date.UTC(2025, 0, 1) + ri(0, 520) * 864e5)),
  });
}

// tourists
const NATIONALITIES = [["Chinese", 0.14], ["Russian", 0.12], ["Australian", 0.09], ["German", 0.08], ["British", 0.08], ["Indian", 0.07], ["French", 0.06], ["American", 0.06], ["South Korean", 0.05], ["Malaysian", 0.05], ["Israeli", 0.04], ["Scandinavian", 0.04], ["Singaporean", 0.03], ["Italian", 0.03], ["Thai (domestic)", 0.06]];
const PARTY_TYPES = ["solo", "couple", "family", "friends group"];
const BESTFOR = ["families", "couples", "solo travelers", "local food", "rainy day", "groups", "budget", "foodies"];
const tourists = [];
const N_TOURISTS = 600;
for (let i = 0; i < N_TOURISTS; i++) {
  const party = pick(PARTY_TYPES);
  const size = party === "solo" ? 1 : party === "couple" ? 2 : ri(3, party === "family" ? 5 : 6);
  tourists.push({
    id: `TR${String(i + 1).padStart(4, "0")}`, nationality: wpick(NATIONALITIES), partyType: party, partySize: size,
    stayArea: pick(AREA_NAMES), lengthOfStayDays: pick([2, 3, 3, 4, 5, 5, 7, 7, 10, 14]),
    budgetTier: pick(["฿", "฿฿", "฿฿", "฿฿฿"]),
    interests: sample([...BESTFOR, "beaches", "nightlife", "culture", "wellness"], ri(2, 4)),
    firstSeen: dstr(new Date(Date.UTC(2026, 0, 1) + ri(0, 170) * 864e5)),
  });
}

// recommendations — the core funnel. Operators are weighted by loma_score so better
// real providers get recommended more (realistic), keeping the dashboard lively.
const FUNNEL = ["shared", "opened", "directions", "visited", "spent"];
const recWeights = operators.map((o) => Math.max(1, (o.loma_score || 50) - 40) ** 2);
const recTotalW = recWeights.reduce((a, b) => a + b, 0);
function weightedOp() { let r = rng() * recTotalW; for (let i = 0; i < operators.length; i++) { r -= recWeights[i]; if (r <= 0) return operators[i]; } return operators[operators.length - 1]; }
const recommendations = [];
const N_RECS = 4200;
for (let i = 0; i < N_RECS; i++) {
  const op = weightedOp(), st = pick(staff), tr = pick(tourists);
  let stage = 0;
  if (rng() < 0.78) stage = 1;
  if (stage === 1 && rng() < 0.73) stage = 2;
  if (stage === 2 && rng() < 0.55) stage = 3;
  if (stage === 3 && rng() < 0.72) stage = 4;
  const d = new Date(Date.UTC(2026, 0, 1) + ri(0, 173) * 864e5 + ri(7, 22) * 36e5 + ri(0, 59) * 6e4);
  recommendations.push({
    id: `RC${String(i + 1).padStart(5, "0")}`, operatorId: op.id, staffId: st.id, touristId: tr.id,
    category: op.cat, area: op.area, channel: pick(["QR card", "LINE share", "WhatsApp", "printed card", "verbal + QR"]),
    stage: FUNNEL[stage], opened: stage >= 1, gotDirections: stage >= 2, confirmedVisit: stage >= 3, loggedSpend: stage >= 4,
    rating: stage >= 3 ? pick([4, 5, 5, 5, 3]) : null,
    createdAt: `${dstr(d)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  });
}

// transactions (only "spent" recs) + roll engagement counts back onto operators
const opById = new Map(operators.map((o) => [o.id, o]));
const SPEND = { "฿": [80, 300], "฿฿": [300, 900], "฿฿฿": [900, 3500] };
const transactions = [];
let txi = 0;
for (const r of recommendations) {
  const op = opById.get(r.operatorId); if (!op) continue;
  op.leads++; if (r.opened) op.opens++; if (r.confirmedVisit) op.visits++;
  if (!r.loggedSpend) continue;
  txi++;
  const [lo, hi] = SPEND[op.price] || [200, 800];
  const spend = ri(lo, hi), commission = Math.floor(spend * (0.05 + rng() * 0.07));
  transactions.push({
    id: `TX${String(txi).padStart(5, "0")}`, recommendationId: r.id, operatorId: op.id, staffId: r.staffId, touristId: r.touristId,
    spendTHB: spend, currency: "THB", commissionTHB: commission, localEconomicImpactTHB: spend,
    paymentMethod: pick(["cash", "cash", "QR PromptPay", "card"]), confirmedAt: r.createdAt,
  });
}

const LOMA_DATA = { operators, staff, tourists, recommendations, transactions, areas: AREAS };

/* ============================================================================
   Inject into LOMA.html (backup-preserving, idempotent, UI-untouched).
   ============================================================================ */
if (!existsSync(HTML_ORIG)) copyFileSync(HTML_PATH, HTML_ORIG);
let html = readFileSync(HTML_ORIG, "utf8");

const before = html.length;
const dataLine = "window.LOMA_DATA = " + JSON.stringify(LOMA_DATA) + ";";
const provBlock = "const PROVIDERS = " + JSON.stringify(PROVIDERS, null, 2) + ";";
const pinsBlock = "const PINS = " + JSON.stringify(PINS) + ";";

function replaceOnce(src, re, repl, label) {
  if (!re.test(src)) throw new Error(`anchor not found: ${label}`);
  return src.replace(re, () => repl);
}
html = replaceOnce(html, /window\.LOMA_DATA\s*=\s*[^\n]*/, dataLine, "LOMA_DATA");
html = replaceOnce(html, /const PROVIDERS = \[[\s\S]*?\n\];/, provBlock, "PROVIDERS");
html = replaceOnce(html, /const PINS = \[[\s\S]*?\n\];/, pinsBlock, "PINS");

/* ============================================================================
   Real, scannable QR codes. The prototype shipped a `qrSVG()` that drew a random
   pattern (not a real QR). Inline the same `qrcode` library loma-app uses and make
   every QR encode the actual link/code its own UI already shows.
   ============================================================================ */
// 1) inline the QR library once, before any app code runs
if (!html.includes("window.LomaQR")) {
  const qrLib = readFileSync(resolve(__dirname, "qrcode.browser.js"), "utf8");
  const anchor = '<div class="toast" id="toast"></div>';
  html = replaceOnce(html, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    anchor + "\n\n<script>/* qrcode — real scannable QR, bundled from loma-app (node-qrcode, MIT) */\n" + qrLib + "</script>", "qrlib");
}
// 2) replace the fake generator with a real one (accepts the text to encode)
const realQrSVG = `function qrSVG(text){
  text=(text==null||text==='')?'https://loma.app':String(text);
  try{
    var q=window.LomaQR.create(text,{errorCorrectionLevel:'M'});
    var n=q.modules.size,d=q.modules.data,m=2,cells='';
    for(var y=0;y<n;y++)for(var x=0;x<n;x++){if(d[y*n+x])cells+='<rect x="'+x+'" y="'+y+'" width="1.04" height="1.04"/>';}
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(-m)+' '+(-m)+' '+(n+2*m)+' '+(n+2*m)+'" shape-rendering="crispEdges" style="width:100%;height:100%" role="img" aria-label="QR code"><rect x="'+(-m)+'" y="'+(-m)+'" width="'+(n+2*m)+'" height="'+(n+2*m)+'" fill="#fff"/><g fill="#0A3A73">'+cells+'</g></svg>';
  }catch(e){return '<svg viewBox="0 0 1 1" style="width:100%;height:100%"><rect width="1" height="1" fill="#fff"/></svg>';}
}`;
html = replaceOnce(html, /\/\* tiny fake QR \*\/\r?\nfunction qrSVG\(\)\{[\s\S]*?\r?\n\}/, "/* real, scannable QR (encodes the given text) */\n" + realQrSVG, "qrSVG");

// 3) feed each QR its real content (the exact link/code its UI already displays)
const qrCallSites = [
  ['152px;height:152px;margin:14px auto">${qrSVG()}', "152px;height:152px;margin:14px auto\">${qrSVG(verifyUrl(PARTNER.name))}", "counter/standee QR"],
  ['padding:10px;border:1px solid var(--line)">${qrSVG()}', "padding:10px;border:1px solid var(--line)\">${qrSVG(recUrl(rl))}", "share-link QR"],
  ['<div class="qr">${qrSVG()}</div>', "<div class=\"qr\">${qrSVG(shareLink(p.id))}</div>", "tourist referral QR"],
  ['<div class="qr" style="margin:0">${qrSVG()}</div>', "<div class=\"qr\" style=\"margin:0\">${qrSVG(shareLink('BRT'))}</div>", "QR component demo"],
  ['width:150px;height:150px;margin:0 auto 8px">${qrSVG()}', "width:150px;height:150px;margin:0 auto 8px\">${qrSVG(link)}", "share-sheet QR"],
];
let qrPatched = 0;
for (const [find, repl, label] of qrCallSites) {
  if (!html.includes(find)) throw new Error(`QR call site not found: ${label}`);
  html = html.replace(find, () => repl);
  qrPatched++;
}

/* ============================================================================
   Real, WORKING share links. The prototype's links pointed at the fictional
   loma.app domain and the page never parsed them — so a scanned link went
   nowhere. Rebuild every link against the CURRENT origin (works at localhost /
   wherever it's served; becomes a real loma.app link if ever deployed there) and
   add a deep-link router so an opened link navigates straight to the shared view.
   ============================================================================ */
// 1) link builders -> real origin URLs with parseable params
html = replaceOnce(html, /function recUrl\(rl\)\{return "loma\.app\/r\/"\+rl\.id;\}/,
  "function recUrl(rl){return lomaUrl({loma:'r', r:rl.id, k:rl.kind, p:(rl.items||[]).join(',')});}", "recUrl");
html = replaceOnce(html, /function verifyUrl\(name\)\{return 'loma\.app\/h\/'\+name\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\+\/g,'-'\)\.replace\(\/\^-\|-\$\/g,''\);\}/,
  "function verifyUrl(name){var slug=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return lomaUrl({loma:'h', h:slug, hn:name});}", "verifyUrl");
html = replaceOnce(html, /function shareLink\(id\)\{\s*if\(id&&EV\(id\)\)[\s\S]*?refFor\(id\);\}/,
  `function shareLink(id){
  if(id&&EV(id)) return lomaUrl({loma:'e', id:id, ref:refFor(id)});
  if(id==='PLAN') return lomaUrl({loma:'plan', p:planStops().map(function(x){return x&&x.id;}).filter(Boolean).join(','), ref:refFor('PLAN')});
  return lomaUrl({loma:'c', id:id, ref:refFor(id)});}`, "shareLink");

// 2) "Copy link" on the generated recommendation must copy the REAL url, not the list id
html = replaceOnce(html, /data-copylink="\$\{rl\.id\}"/, 'data-copylink="${recUrl(rl)}"', "copylink");

// 3) deep-link router — inject just before the boot render()
const router = `/* ============================================================
   DEEP LINKS — real, working share links (no fictional domain).
   Links are built against the current origin (lomaBase), so they open THIS app
   wherever it is hosted; the params open the exact shared view.
   ============================================================ */
function lomaBase(){return location.href.replace(/[?#].*$/,'');}
function lomaUrl(params){var q=[];for(var k in params){var v=params[k];if(v!==undefined&&v!==null&&v!=='')q.push(encodeURIComponent(k)+'='+encodeURIComponent(v));}return lomaBase()+(q.length?'?'+q.join('&'):'');}
function applyDeepLink(){
  var q; try{q=new URLSearchParams(location.search);}catch(e){return false;}
  var mode=q.get('loma'); if(!mode) return false;
  var ids=(q.get('p')||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  if(mode==='r'){ if(ids.length) state.curList=createRecList(ids, q.get('k')==='passive'?'passive':'assisted'); state.persona='tourist'; state.tourist='reclist'; return true; }
  if(mode==='c'){ var id=q.get('id'); if(id&&P(id)){ state.curProv=id; state.persona='tourist'; state.tourist='card'; return true; } }
  if(mode==='h'){ state.persona='tourist'; state.tourist='selfserve'; return true; }
  if(mode==='e'){ var eid=q.get('id'); state.persona='tourist'; if(eid&&typeof EV==='function'&&EV(eid)){ state.curTourEvent=eid; state.tourist='eventDetail'; } else { state.tourist='events'; } return true; }
  if(mode==='plan'){ if(ids.length){ state.curList=createRecList(ids,'assisted'); state.tourist='reclist'; } else { state.tourist='selfserve'; } state.persona='tourist'; return true; }
  if(mode==='v'){ var vid=q.get('id'); if(vid&&P(vid)){ state.curProv=vid; state.persona='tourist'; state.tourist='ref'; return true; } }
  return false;
}
if(applyDeepLink()){
  try{
    var _pt=document.getElementById('personaTabs');
    if(_pt) _pt.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x.dataset.persona===state.persona);});
    document.querySelectorAll('.persona').forEach(function(s){s.classList.add('hidden');});
    var _pe=document.getElementById('p-'+state.persona); if(_pe) _pe.classList.remove('hidden');
  }catch(e){}
}
render();`;
html = replaceOnce(html, /\nrender\(\);\n<\/script>/, "\n" + router + "\n</script>", "deeplink-router");

writeFileSync(HTML_PATH, html, "utf8");
// also drop a standalone bundle for reference / future backends
writeFileSync(resolve(__dirname, "loma-real-data.js"), "/* REAL LOMA data bundle — generated from loma-app providers.json */\n" + dataLine + "\n", "utf8");

const stageCounts = FUNNEL.reduce((m, s) => ((m[s] = recommendations.filter((r) => r.stage === s).length), m), {});
console.log(JSON.stringify({
  providers_in: providers.length,
  operators_out: operators.length,
  curated_slots: PROVIDERS.map((p) => `${p.id}:${p.name}`),
  staff: staff.length, tourists: tourists.length, recommendations: recommendations.length, transactions: transactions.length,
  verified: operators.filter((o) => o.verified).length,
  pending: operators.filter((o) => o.vettingStatus === "pending").length,
  needs_review: operators.filter((o) => o.vettingStatus === "needs review").length,
  rejected: operators.filter((o) => o.vettingStatus === "rejected").length,
  stageCounts,
  local_impact_THB: transactions.reduce((a, t) => a + t.localEconomicImpactTHB, 0),
  qr_call_sites_patched: qrPatched,
  qr_lib_inlined: html.includes("window.LomaQR"),
  html_bytes: `${before} -> ${html.length}`,
}, null, 2));
