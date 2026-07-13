// Admin dashboard aggregations — mirrors the prototype's DASH object and per-view
// rollups, computed from window.LOMA_DATA (via mock.ts). Nothing is hardcoded.
import {
  OPERATORS,
  staffMembers,
  recommendations,
  transactions,
  LOMA,
} from "../mock";
import type {
  CatalogProvider,
  StaffMember,
  Recommendation,
  Transaction,
} from "../types";

export const OPS = OPERATORS;
export const STF = staffMembers;
export const RECS = recommendations;
export const TX = transactions;
export const AREAS_D = LOMA.areas;
export const TUR = LOMA.tourists;

export const opById: Record<string, CatalogProvider> = Object.fromEntries(
  OPS.map((o) => [o.id, o])
);
export const staffById: Record<string, StaffMember> = Object.fromEntries(
  STF.map((s) => [s.id, s])
);

// ---------- formatting ----------
export const fmtB = (n: number): string => "฿" + Math.round(n).toLocaleString();
export const fmtBk = (n: number): string =>
  n >= 1e6
    ? "฿" + (n / 1e6).toFixed(2) + "M"
    : n >= 1e3
    ? "฿" + Math.round(n / 1e3) + "k"
    : "฿" + Math.round(n);
export const pct = (n: number): string => Math.round(n * 100) + "%";

export function groupCount<T>(
  arr: T[],
  key: keyof T | ((x: T) => string)
): Record<string, number> {
  const m: Record<string, number> = {};
  arr.forEach((x) => {
    const k = typeof key === "function" ? key(x) : String(x[key]);
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

// ---------- the shared DASH aggregate ----------
export interface Dash {
  recs: number;
  opens: number;
  dirs: number;
  visits: number;
  spent: number;
  spend: number;
  impact: number;
  commission: number;
  avgRating: number;
  positive: number;
  ratingsN: number;
  leadByOp: Record<string, number>;
  visitByOp: Record<string, number>;
  spendByOp: Record<string, number>;
  venueOf: Record<string, StaffMember>;
}

export const DASH: Dash = (() => {
  const recs = RECS.length;
  const opens = RECS.filter((r) => r.opened).length;
  const dirs = RECS.filter((r) => r.gotDirections).length;
  const visits = RECS.filter((r) => r.confirmedVisit).length;
  const spent = RECS.filter((r) => r.loggedSpend).length;
  const spend = TX.reduce((s, t) => s + t.spendTHB, 0);
  const impact = TX.reduce((s, t) => s + t.localEconomicImpactTHB, 0);
  const commission = TX.reduce((s, t) => s + t.commissionTHB, 0);
  const ratings = RECS.filter((r) => r.rating != null).map((r) => r.rating as number);
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;
  const positive = ratings.length
    ? ratings.filter((r) => r >= 4).length / ratings.length
    : 0;
  const leadByOp = groupCount(RECS, "operatorId");
  const visitByOp = groupCount(
    RECS.filter((r) => r.confirmedVisit),
    "operatorId"
  );
  const spendByOp: Record<string, number> = {};
  TX.forEach((t) => {
    spendByOp[t.operatorId] = (spendByOp[t.operatorId] || 0) + t.spendTHB;
  });
  const venueOf = staffById;
  return {
    recs,
    opens,
    dirs,
    visits,
    spent,
    spend,
    impact,
    commission,
    avgRating,
    positive,
    ratingsN: ratings.length,
    leadByOp,
    visitByOp,
    spendByOp,
    venueOf,
  };
})();

// ---------- derived view rollups ----------
export type BarRow = [string, number];

export function topLeadRows(n = 5): BarRow[] {
  return Object.entries(DASH.leadByOp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, v]) => [opById[id]?.name ?? id, v] as BarRow);
}

export interface OperatorRow {
  o: CatalogProvider;
  leads: number;
  visits: number;
  spend: number;
}
export function operatorRows(limit = 40): OperatorRow[] {
  return OPS.map((o) => ({
    o,
    leads: DASH.leadByOp[o.id] || 0,
    visits: DASH.visitByOp[o.id] || 0,
    spend: DASH.spendByOp[o.id] || 0,
  }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, limit);
}

export function underexposedRows(n = 4): BarRow[] {
  return OPS.filter((o) => o.verified)
    .map((o) => [o.id, DASH.leadByOp[o.id] || 0] as [string, number])
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
    .map(([id, v]) => [opById[id]?.name ?? id, v] as BarRow);
}

export interface PartnerAgg {
  venue: string;
  type: string;
  area: string;
  recs: number;
  opens: number;
  visits: number;
}
export function partnerAggs(): PartnerAgg[] {
  const agg: Record<string, PartnerAgg> = {};
  RECS.forEach((r) => {
    const s = DASH.venueOf[r.staffId];
    if (!s) return;
    const k = s.venue;
    agg[k] = agg[k] || {
      venue: k,
      type: s.venueType,
      area: s.area,
      recs: 0,
      opens: 0,
      visits: 0,
    };
    agg[k].recs++;
    if (r.opened) agg[k].opens++;
    if (r.confirmedVisit) agg[k].visits++;
  });
  return Object.values(agg).sort((a, b) => b.recs - a.recs);
}

export interface CategoryAgg {
  cat: string;
  emo: string;
  recs: number;
  opens: number;
  visits: number;
  spend: number;
  sp: number;
  rsum: number;
  rn: number;
}
export function categoryAggs(): CategoryAgg[] {
  const emoOf: Record<string, string> = Object.fromEntries(
    OPS.map((o) => [o.cat, o.emo])
  );
  const cats: Record<string, CategoryAgg> = {};
  RECS.forEach((r) => {
    const c = r.category;
    cats[c] = cats[c] || {
      cat: c,
      emo: emoOf[c] || "",
      recs: 0,
      opens: 0,
      visits: 0,
      spend: 0,
      sp: 0,
      rsum: 0,
      rn: 0,
    };
    cats[c].recs++;
    if (r.opened) cats[c].opens++;
    if (r.confirmedVisit) cats[c].visits++;
    if (r.rating != null) {
      cats[c].rsum += r.rating;
      cats[c].rn++;
    }
  });
  TX.forEach((t) => {
    const c = opById[t.operatorId]?.cat;
    if (c && cats[c]) {
      cats[c].spend += t.spendTHB;
      cats[c].sp++;
    }
  });
  return Object.values(cats).sort((a, b) => b.recs - a.recs);
}

// recommendations grouped by month → line-chart series
export interface TrendPoint {
  label: string;
  recs: number;
  visits: number;
}
export function monthlyTrend(): TrendPoint[] {
  const months: Record<string, TrendPoint> = {};
  RECS.forEach((r) => {
    const key = r.createdAt.slice(0, 7); // YYYY-MM
    months[key] = months[key] || { label: key, recs: 0, visits: 0 };
    months[key].recs++;
    if (r.confirmedVisit) months[key].visits++;
  });
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Object.keys(months)
    .sort()
    .map((k) => {
      const m = months[k];
      const mi = parseInt(k.slice(5), 10) - 1;
      return { label: MON[mi] ?? k, recs: m.recs, visits: m.visits };
    });
}

export function recsByArea(): BarRow[] {
  const byArea = groupCount(RECS, "area");
  return Object.entries(byArea).sort((a, b) => b[1] - a[1]);
}

// area bubbles for the map
export interface Bubble {
  area: string;
  v: number;
  x: number;
  y: number;
  sz: number;
}
export function areaBubbles(): Bubble[] {
  const byArea = groupCount(RECS, "area");
  const coords: Record<string, { x: number; y: number }> = Object.fromEntries(
    AREAS_D.map((a) => [a.area, a])
  );
  const max = Math.max(1, ...Object.values(byArea));
  return Object.entries(byArea).map(([area, v]) => {
    const c = coords[area] || { x: 50, y: 50 };
    return { area, v, x: c.x, y: c.y, sz: 20 + (v / max) * 70 };
  });
}

// integrity: lead-concentration watch
export interface ConcRow {
  name: string;
  partner: string;
  share: number;
  leads: number;
}
export function concentration(): ConcRow[] {
  const byProv: Record<string, { total: number; parts: Record<string, number> }> = {};
  RECS.forEach((r) => {
    const s = DASH.venueOf[r.staffId];
    if (!s) return;
    const pid = r.operatorId;
    byProv[pid] = byProv[pid] || { total: 0, parts: {} };
    byProv[pid].total++;
    byProv[pid].parts[s.venue] = (byProv[pid].parts[s.venue] || 0) + 1;
  });
  return Object.entries(byProv)
    .filter(([, v]) => v.total >= 6)
    .map(([pid, v]) => {
      const top = Object.entries(v.parts).sort((a, b) => b[1] - a[1])[0];
      return {
        name: opById[pid]?.name ?? pid,
        partner: top[0],
        share: top[1] / v.total,
        leads: v.total,
      };
    })
    .sort((a, b) => b.share - a.share)
    .slice(0, 8);
}
export function monitoredCount(): number {
  const set = new Set<string>();
  RECS.forEach((r) => {
    if (DASH.venueOf[r.staffId]) set.add(r.operatorId);
  });
  return set.size;
}

export interface SelfDeal {
  partner: string;
  provider: string;
  signal: string;
  risk: "High" | "Medium";
}
export const SELF_DEAL: SelfDeal[] = [
  {
    partner: "Rawai Local Eats Guesthouse",
    provider: "Baan Rim Talay Local Kitchen",
    signal: "Same owner phone +66 81 234 5678 · matching National ID ••••89",
    risk: "High",
  },
  {
    partner: "Old Town Stay",
    provider: "Old Town Herbal Massage",
    signal: "Same Google Business owner · same contact email",
    risk: "Medium",
  },
];

// verification queue
export function verifyQueue(limit = 12): CatalogProvider[] {
  return OPS.filter(
    (o) => o.vettingStatus !== "verified" && o.vettingStatus !== "rejected"
  )
    .sort(
      (a, b) =>
        (a.vettingStatus === "pending" ? -1 : 0) -
          (b.vettingStatus === "pending" ? -1 : 0) ||
        (a.safety ?? 0) - (b.safety ?? 0)
    )
    .slice(0, limit);
}

// recent rated recommendations for the feedback table
export interface FeedbackRow {
  provider: string;
  rating: number;
  category: string;
  area: string;
  when: string;
  flag: "Positive" | "Watch";
}
export function recentFeedback(n = 10): FeedbackRow[] {
  return RECS.filter((r) => r.rating != null)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
    .map((r) => {
      const o = opById[r.operatorId];
      return {
        provider: o?.name ?? r.operatorId,
        rating: r.rating as number,
        category: r.category,
        area: r.area,
        when: r.createdAt.slice(0, 10),
        flag: (r.rating as number) >= 4 ? "Positive" : "Watch",
      };
    });
}

// recent transactions
export function recentTransactions(n = 30): Transaction[] {
  return TX.slice()
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
    .slice(0, n);
}

// staff leaderboard rows
export function staffLeaderboard(): StaffMember[] {
  return STF.slice().sort((a, b) => b.commissionTHB - a.commissionTHB);
}

export type { CatalogProvider, StaffMember, Recommendation, Transaction };
