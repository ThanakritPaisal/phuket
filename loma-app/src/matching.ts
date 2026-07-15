// LOMA Layer B — Contextual Matching Engine.
//   Hidden Gem Score decides whether a provider deserves visibility (Layer A).
//   Match Score decides whether it fits THIS tourist, right now (Layer B).
// Hard constraints filter first (accessibility, open-now, time budget, price, category);
// survivors are ranked by a weighted score; every result carries plain-language reasons.
import type { RealAccount } from "./types";
import { activePicks, getActiveAccount } from "./activeAccount";
import type { Pick } from "./picks";

export interface MatchRequest {
  category?: string | null; // LOMA category token, e.g. "local_food"
  price_range?: "budget" | "moderate" | "premium" | null;
  wheelchair_required?: boolean;
  elderly_friendly?: boolean;
  open_now?: boolean;
  max_minutes?: number | null; // total time budget incl. travel both ways
}

export interface MatchResult {
  pick: Pick;
  score: number;
  totalMinutes: number; // round-trip travel + visit + buffer
  reasons: string[];
  warnings: string[];
}
export interface MatchOutcome {
  results: MatchResult[];
  considered: number;
  excluded: { reason: string; count: number }[];
}

// spec category token -> our catalog category string
const CAT_MAP: Record<string, string> = {
  local_food: "Local Food",
  cafe_dessert: "Local Food",
  massage_spa: "Massage & Wellness",
  wellness: "Massage & Wellness",
  souvenir_craft: "Souvenir & Local Product",
  local_product: "Souvenir & Local Product",
  community_experience: "Community Experience",
};
const BUFFER = 15;

/** Round-trip travel + the venue visit (worst case) + a buffer. */
function totalMinutes(p: Pick): number {
  return p.minutes * 2 + p.durationMax + BUFFER;
}

export function matchProviders(req: MatchRequest, account?: RealAccount): MatchOutcome {
  const acct = account ?? getActiveAccount();
  const all: Pick[] = activePicks();
  const excluded: Record<string, number> = {};
  const bump = (r: string) => (excluded[r] = (excluded[r] || 0) + 1);

  const wantCat = req.category ? CAT_MAP[req.category] : null;
  const kept: MatchResult[] = [];

  for (const p of all) {
    // ---- hard constraints ----
    if (wantCat && p.cat !== wantCat) continue; // category is a plain filter, not "excluded"
    if (req.open_now && !p.open) { bump("closed now"); continue; }
    if (req.wheelchair_required && (p.wheelchair === "not_accessible" || p.wheelchair === "unknown")) {
      bump("wheelchair access not confirmed"); continue;
    }
    if (req.elderly_friendly && (p.elderly === "not_suitable" || p.elderly === "unknown")) {
      bump("elderly suitability not confirmed"); continue;
    }
    if (req.price_range === "budget" && p.priceRange === "premium") { bump("over budget"); continue; }
    if (req.price_range === "moderate" && p.priceRange === "premium") { bump("over budget"); continue; }
    const total = totalMinutes(p);
    if (req.max_minutes && total > req.max_minutes) { bump("won't fit the time window"); continue; }

    // ---- context fit (0–100): how well the SOFT preferences line up ----
    let ctx = 45;
    if (wantCat) ctx += 15;
    if (req.price_range === "budget") ctx += p.priceRange === "budget" ? 22 : p.priceRange === "unknown" ? 8 : 4;
    else if (req.price_range === "moderate") ctx += p.priceRange === "moderate" || p.priceRange === "budget" ? 16 : 6;
    if (req.wheelchair_required) ctx += p.wheelchair === "full" ? 18 : 8; // partial passed but ranks lower
    if (req.elderly_friendly) ctx += p.elderly === "suitable" ? 14 : 6;
    if (req.max_minutes) ctx += total <= req.max_minutes * 0.75 ? 8 : 0; // comfortably inside the window
    const context_fit = Math.min(100, ctx);

    const distance_fit = req.max_minutes
      ? Math.max(0, Math.min(100, 100 - (p.minutes / (req.max_minutes / 2)) * 100))
      : Math.max(0, 100 - p.minutes * 3);

    const a = p.ai;
    const score = Math.round(
      context_fit * 0.35 +
        a.quality_score * 0.15 +
        a.locality_score * 0.15 +
        a.readiness_score * 0.15 +
        a.visibility_gap_score * 0.1 +
        distance_fit * 0.1 -
        a.risk_score * 0.3
    );

    // ---- plain-language reasons + honest warnings ----
    const reasons: string[] = [];
    const warnings: string[] = [];
    if (wantCat) reasons.push(`${p.cat}${req.price_range === "budget" ? " · affordable" : ""}`);
    if (req.wheelchair_required)
      p.wheelchair === "full"
        ? reasons.push("Verified wheelchair access")
        : warnings.push("Only partly wheelchair accessible — call ahead");
    if (req.elderly_friendly)
      p.elderly === "suitable"
        ? reasons.push("Comfortable for elderly guests")
        : warnings.push("Suitable for elderly with conditions");
    if (req.price_range === "budget" && p.priceRange === "unknown") warnings.push("Price not verified");
    reasons.push(`${p.dist} from ${acct.name}`);
    reasons.push(`≈ ${p.durationMin}–${p.durationMax} min visit${req.max_minutes ? " — fits your window" : ""}`);
    reasons.push(a.locality_status === "verified_local" ? "Registry-verified local" : "Likely local · unverified");

    kept.push({ pick: p, score, totalMinutes: total, reasons, warnings });
  }

  kept.sort((x, y) => y.score - x.score);
  return {
    results: kept,
    considered: all.length,
    excluded: Object.entries(excluded)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
