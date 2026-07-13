// ESTIMATED LOCAL ECONOMIC IMPACT — ported from the v2 prototype.
// The number NEVER depends on a shop typing a figure. Every baht is derived from
// a price the provider already declared, or a category benchmark. Three confidence
// tiers, labelled on screen. A booking is not a visit; no-shows are worth ฿0.
import { activePick } from "./activeAccount";
import { community } from "./v2data";
import { BOOKINGS } from "./bookings";
import { hotelEvents } from "./impact";

const CAT_BENCH: Record<string, number> = {
  "Local Food": 220,
  "Café & Dessert": 110,
  "Massage & Spa": 420,
  "Souvenirs & Crafts": 380,
  "Local Product": 260,
  "Community Experience": 500,
  Wellness: 400,
};

/** Midpoint of a provider-declared price string ("฿150–350 / person" → 250). */
export function priceMid(priceText: string | undefined): number | null {
  const n = (String(priceText || "").match(/\d[\d,]*/g) || [])
    .map((x) => parseInt(x.replace(/,/g, ""), 10))
    .filter((x) => x > 0 && x < 20000);
  if (n.length >= 2) return Math.round((n[0] + n[1]) / 2);
  if (n.length === 1) return n[0];
  return null;
}

export type EconTier = "exact" | "declared" | "benchmark";
export interface EconRow {
  tier: EconTier;
  name: string;
  baht: number;
  note: string;
}

export function econRows(): EconRow[] {
  const rows: EconRow[] = [];
  // A · EXACT — community guests the host CHECKED IN.
  BOOKINGS.filter((b) => b.status === "attended").forEach((b) => {
    const c = community(b.id);
    if (!c) return;
    const mid = priceMid(c.priceFrom) || CAT_BENCH["Community Experience"];
    rows.push({
      tier: "exact",
      name: c.name,
      baht: mid * b.pax,
      note: `${b.pax} guests checked in × ฿${mid} published programme price`,
    });
  });
  // B · DECLARED / C · BENCHMARK — confirmed visits.
  hotelEvents()
    .filter((e) => e.event_type === "provider_confirmed_visit" && e.counted && e.provider_id)
    .forEach((e) => {
      const pk = activePick(e.provider_id!);
      if (!pk) return;
      const mid = priceMid(pk.priceText);
      if (mid)
        rows.push({
          tier: "declared",
          name: pk.name,
          baht: mid,
          note: `confirmed visit × ฿${mid} (declared price band ${pk.priceText || ""})`,
        });
      else
        rows.push({
          tier: "benchmark",
          name: pk.name,
          baht: CAT_BENCH[pk.ai.loma_cat] || 200,
          note: `confirmed visit × ฿${CAT_BENCH[pk.ai.loma_cat] || 200} ${pk.ai.loma_cat} benchmark`,
        });
    });
  return rows;
}

export interface EconTotals {
  exact: number;
  declared: number;
  benchmark: number;
  nx: number;
  nd: number;
  nb: number;
  total: number;
  pendingBookings: number;
  pendingBaht: number;
  noshows: number;
  noShopInput: number;
}

export function econTotals(): EconTotals {
  const r = econRows();
  const t: EconTotals = {
    exact: 0, declared: 0, benchmark: 0, nx: 0, nd: 0, nb: 0,
    total: 0, pendingBookings: 0, pendingBaht: 0, noshows: 0, noShopInput: 100,
  };
  r.forEach((x) => {
    t[x.tier] += x.baht;
    t[({ exact: "nx", declared: "nd", benchmark: "nb" } as const)[x.tier]]++;
  });
  t.total = t.exact + t.declared + t.benchmark;
  const pend = BOOKINGS.filter((b) => b.status !== "attended" && b.status !== "noshow");
  t.pendingBookings = pend.length;
  t.pendingBaht = pend.reduce((a, b) => {
    const c = community(b.id);
    const m = c ? priceMid(c.priceFrom) || 500 : 500;
    return a + m * b.pax;
  }, 0);
  t.noshows = BOOKINGS.filter((b) => b.status === "noshow").length;
  t.noShopInput = t.total ? Math.round(((t.exact + t.declared) / t.total) * 100) : 100;
  return t;
}

export const bahtF = (n: number) => "฿" + Math.round(n).toLocaleString();
export const fmtBk = (n: number) =>
  n >= 1e6 ? "฿" + (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? "฿" + Math.round(n / 1e3) + "k" : "฿" + Math.round(n);
