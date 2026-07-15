// TRACKING EVENTS + HOTEL IMPACT CREDITS — ported from the v2 prototype.
// "No hidden commission. Transparent impact credits."
// A scan is worth almost nothing; a real tourist action is worth a lot.
import { activePick } from "./activeAccount";
import { getActiveAccount } from "./activeAccount";
import { community, commReady, PARTNERS, UNDER_SERVED } from "./v2data";
import { bumpVersion } from "./store";
import { logEvent } from "./logger";

export interface TrackingEvent {
  id: string;
  event_type: string;
  hotel_id: string;
  staff_id: string | null;
  provider_id: string | null;
  community_id: string | null;
  recommendation_list_id: string | null;
  tourist_session_id: string;
  timestamp: string;
  credits: number;
  counted: boolean;
  flagged: boolean;
  metadata: { multipliers: string[]; base_points: number; [k: string]: unknown };
}

export const CREDIT_POINTS: Record<string, number> = {
  recommendation_created: 1,
  qr_generated: 1,
  qr_scanned: 2,
  provider_card_viewed: 3,
  direction_clicked: 5,
  contact_clicked: 5,
  community_inquiry_clicked: 10,
  provider_confirmed_visit: 20,
  positive_feedback: 10,
  feedback_submitted: 2,
  complaint: -15,
};
export const MULTIPLIERS = {
  hidden_gem: 1.3,
  community_experience: 1.5,
  under_served_area: 1.2,
  verified_provider: 1.1,
};
const ONCE_PER_SESSION = [
  "qr_scanned",
  "provider_card_viewed",
  "direction_clicked",
  "contact_clicked",
  "community_inquiry_clicked",
  "positive_feedback",
  "provider_confirmed_visit",
];
const CAP_PER_SESSION: Record<string, number> = { qr_generated: 2, recommendation_created: 5 };

function hsh(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const NOW = new Date("2026-07-13T09:00:00Z");
const dstr = (d: Date) => d.toISOString().slice(0, 10);

export const TRACKING_EVENTS: TrackingEvent[] = [];
export let SESSION_ID = "ts_" + (hsh("demo-session") % 99999);
const _seen = new Set<string>();
const _caps: Record<string, number> = {};

// Minimal provider view the credit multipliers need.
interface ImpactProvider {
  id: string;
  area: string;
  loma_cat: string;
  is_hidden_gem: boolean;
  is_community_experience: boolean;
  is_verified: boolean;
}
function providerFor(id: string | null | undefined): ImpactProvider | null {
  if (!id) return null;
  const pk = activePick(id);
  if (!pk) return null;
  return {
    id: pk.id,
    area: pk.area,
    loma_cat: pk.ai.loma_cat,
    is_hidden_gem: pk.ai.is_hidden_gem,
    is_community_experience: pk.ai.is_community_experience,
    is_verified: pk.ai.is_verified,
  };
}

function multiplierFor(p: ImpactProvider | null): { m: number; tags: string[] } {
  if (!p) return { m: 1, tags: [] };
  let m = 1;
  const tags: string[] = [];
  if (p.is_hidden_gem) { m *= MULTIPLIERS.hidden_gem; tags.push("hidden_gem ×1.3"); }
  if (p.is_community_experience) { m *= MULTIPLIERS.community_experience; tags.push("community ×1.5"); }
  if (UNDER_SERVED.includes(p.area)) { m *= MULTIPLIERS.under_served_area; tags.push("under-served ×1.2"); }
  if (p.is_verified) { m *= MULTIPLIERS.verified_provider; tags.push("verified ×1.1"); }
  return { m, tags };
}

export interface TrackOpts {
  provider_id?: string | null;
  community_id?: string | null;
  recommendation_list_id?: string | null;
  tourist_session_id?: string;
  hotel_id?: string;
  staff_id?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export function trackEvent(event_type: string, opt: TrackOpts = {}): TrackingEvent {
  const partner = getActiveAccount();
  let p = providerFor(opt.provider_id);
  if (!p && opt.community_id) {
    const c = community(opt.community_id);
    if (c)
      p = {
        id: c.id,
        area: c.area,
        loma_cat: "Community Experience",
        is_hidden_gem: false,
        is_community_experience: true,
        is_verified: commReady(c) === 3,
      };
  }
  const key =
    event_type + "|" + (opt.provider_id || opt.community_id || "-") + "|" + (opt.tourist_session_id || SESSION_ID);
  let counted = true,
    flagged = false;
  if (ONCE_PER_SESSION.includes(event_type) && _seen.has(key)) {
    counted = false;
    flagged = true;
  }
  if (CAP_PER_SESSION[event_type] !== undefined) {
    _caps[event_type] = (_caps[event_type] || 0) + 1;
    if (_caps[event_type] > CAP_PER_SESSION[event_type]) counted = false;
  }
  _seen.add(key);
  const base = CREDIT_POINTS[event_type] || 0;
  const { m, tags } = multiplierFor(p);
  const credits = counted ? Math.round(base * (base > 0 ? m : 1)) : 0;
  const ev: TrackingEvent = {
    id: "ev_" + (TRACKING_EVENTS.length + 1),
    event_type,
    hotel_id: opt.hotel_id || partner.id || "htl_demo",
    staff_id: opt.staff_id || partner.staff || null,
    provider_id: opt.provider_id || null,
    community_id: opt.community_id || null,
    recommendation_list_id: opt.recommendation_list_id || null,
    tourist_session_id: opt.tourist_session_id || SESSION_ID,
    timestamp: opt.timestamp || dstr(NOW),
    credits,
    counted,
    flagged,
    metadata: { multipliers: tags, base_points: base, ...(opt.metadata || {}) },
  };
  TRACKING_EVENTS.push(ev);
  // Persist every event to the FastAPI logging backend (fire-and-forget).
  const { id, ...rest } = ev;
  logEvent({ ...rest, event_id: id });
  bumpVersion();
  return ev;
}

export const hotelEvents = () => TRACKING_EVENTS.filter((e) => !e.flagged);
export const impactCredits = () => hotelEvents().reduce((s, e) => s + e.credits, 0);
export const flaggedCount = () => TRACKING_EVENTS.filter((e) => e.flagged || !e.counted).length;
export const countEv = (t: string) =>
  TRACKING_EVENTS.filter((e) => e.event_type === t && e.counted).length;

export const TIERS: [string, string, number, string][] = [
  ["Bronze", "Local Supporter", 0, "#B07B3E"],
  ["Silver", "Local Impact Partner", 250, "#8A94A6"],
  ["Gold", "Phuket Local Impact Leader", 600, "#C9922B"],
  ["Platinum", "Community Tourism Champion", 1200, "#4F7D8C"],
];
export function hotelTier(c = impactCredits()) {
  let t = TIERS[0];
  TIERS.forEach((x) => {
    if (c >= x[2]) t = x;
  });
  return t;
}
export function nextTier(c = impactCredits()) {
  return TIERS.find((x) => c < x[2]) || null;
}
export const providersSupported = () =>
  new Set(hotelEvents().filter((e) => e.provider_id && e.credits > 0).map((e) => e.provider_id)).size;
export const communitiesPromoted = () =>
  new Set(
    hotelEvents()
      .filter((e) => {
        const p = e.provider_id && providerFor(e.provider_id);
        return p && p.is_community_experience;
      })
      .map((e) => e.provider_id)
  ).size;

export function topCreditProviders(n = 5): { id: string; c: number }[] {
  const m: Record<string, number> = {};
  hotelEvents().forEach((e) => {
    if (e.provider_id && e.credits > 0) m[e.provider_id] = (m[e.provider_id] || 0) + e.credits;
  });
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, c]) => ({ id, c }));
}
export function topCreditCats(): [string, number][] {
  const m: Record<string, number> = {};
  hotelEvents().forEach((e) => {
    const p = e.provider_id && providerFor(e.provider_id);
    if (p && e.credits > 0) m[p.loma_cat] = (m[p.loma_cat] || 0) + e.credits;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
export function creditTrend(): [string, number][] {
  const tot = impactCredits();
  const M = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const w = [0.08, 0.12, 0.15, 0.2, 0.22, 0.23];
  let run = 0;
  return w.map((x, i) => {
    run += x;
    return [M[i], Math.round(tot * run)] as [string, number];
  });
}
export function leaderboard(): { name: string; type: string; credits: number; me: boolean }[] {
  const partner = getActiveAccount();
  const rows = PARTNERS.filter((x) => x.name !== partner.name).map((x) => ({
    name: x.name,
    type: x.type,
    credits: Math.round(x.recs * 2.3 + x.visits * 5.1),
    me: false,
  }));
  rows.push({ name: partner.name, type: partner.type || "Hotel", credits: impactCredits(), me: true });
  return rows.sort((a, b) => b.credits - a.credits);
}

// ---------- seeded history so the impact dashboard is non-zero on load ----------
let seeded = false;
export function seedImpact(gemIds: string[], commIds: string[], normIds: string[]): void {
  if (seeded) return;
  seeded = true;
  const pool = [...gemIds.slice(0, 4), ...commIds.slice(0, 3), ...normIds.slice(0, 6)];
  pool.forEach((id, i) => {
    const sess = "ts_seed_" + i;
    trackEvent("qr_scanned", { provider_id: null, tourist_session_id: sess });
    trackEvent("provider_card_viewed", { provider_id: id, tourist_session_id: sess });
    if (i % 2 === 0) trackEvent("direction_clicked", { provider_id: id, tourist_session_id: sess });
    if (i % 3 === 0) trackEvent("contact_clicked", { provider_id: id, tourist_session_id: sess });
    const p = providerFor(id);
    if (p && p.is_community_experience)
      trackEvent("community_inquiry_clicked", { provider_id: id, tourist_session_id: sess });
    if (i % 3 === 1) trackEvent("provider_confirmed_visit", { provider_id: id, tourist_session_id: sess });
    if (i % 4 === 0) trackEvent("positive_feedback", { provider_id: id, tourist_session_id: sess });
  });
  // a flagged, non-counting burst — proves the anti-gaming guardrail on screen
  trackEvent("qr_scanned", { tourist_session_id: "ts_seed_0" });
  trackEvent("qr_scanned", { tourist_session_id: "ts_seed_0" });
}
