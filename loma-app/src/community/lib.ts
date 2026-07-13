// Shared helpers for the Community Host portal.
// Every value here is derived from ONE signed-in community — see CommunityApp
// for how the community is resolved from the account. Nothing crosses communities.
import type { Community } from "../v2data";
import { commReady, READINESS_LEVELS } from "../v2data";
import { bookingsFor, type Booking, type BookingStatus } from "../bookings";
import { priceMid, bahtF } from "../econ";

export { bahtF };
export type { Booking, BookingStatus };

/** Two-letter initials from a community name, for the avatar. */
export function commInit(name: string): string {
  const parts = (name || "C")
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase());
  return parts.join("") || "C";
}

export interface CommRevenue {
  baht: number; // total earned via LOMA
  pax: number; // guests actually checked in
  n: number; // number of attended bookings
  mid: number; // midpoint of the community's published price
}

/** Money this community actually earned through LOMA — checked-in guests ONLY.
 *  A booking is not a visit; a no-show is ฿0. */
export function commRevenue(c: Community): CommRevenue {
  const mid = priceMid(c.priceFrom) || 500;
  const attended = bookingsFor(c.id).filter((b) => b.status === "attended");
  return {
    baht: attended.reduce((a, b) => a + mid * b.pax, 0),
    pax: attended.reduce((a, b) => a + b.pax, 0),
    n: attended.length,
    mid,
  };
}

export interface CommStats {
  upcoming: number; // requested + confirmed bookings (guests not yet visited)
  upcomingPax: number;
  checkedIn: number; // attended pax
  noshows: number;
}

export function commStats(c: Community): CommStats {
  const bk = bookingsFor(c.id);
  const upcoming = bk.filter((b) => b.status === "requested" || b.status === "confirmed");
  return {
    upcoming: upcoming.length,
    upcomingPax: upcoming.reduce((a, b) => a + b.pax, 0),
    checkedIn: bk.filter((b) => b.status === "attended").reduce((a, b) => a + b.pax, 0),
    noshows: bk.filter((b) => b.status === "noshow").length,
  };
}

export interface StatusBadge {
  cls: string;
  label: string;
}
export function statusBadge(s: BookingStatus): StatusBadge {
  switch (s) {
    case "requested":
      return { cls: "b-price", label: "⏳ Requested" };
    case "confirmed":
      return { cls: "b-local", label: "✓ Confirmed · awaiting visit" };
    case "attended":
      return { cls: "b-verified", label: "✓ Checked in" };
    case "noshow":
      return { cls: "b-closed", label: "✕ No-show · ฿0" };
  }
}

export interface ReadinessBadge {
  level: number; // 0..3
  cls: string;
  label: string;
}
const RL_CLS = ["b-closed", "b-price", "b-local", "b-verified"];
export function readiness(c: Community): ReadinessBadge {
  const level = commReady(c);
  return { level, cls: RL_CLS[level], label: READINESS_LEVELS[level] };
}

export interface Review {
  name: string;
  country: string;
  stars: number;
  text: string;
}
/** Deterministic guest reviews, seeded from the community id (mirrors the
 *  prototype's chReviews). Only guests a host checked in could leave these. */
export function commReviews(c: Community): Review[] {
  const seed = [...c.id].reduce((a, x) => a + x.charCodeAt(0), 0);
  const base: Review[] = [
    { name: "Marie L.", country: "France", stars: 5, text: "The most honest half-day of our whole trip. The family fed us like relatives." },
    { name: "Tom H.", country: "UK", stars: 5, text: "No tour bus, no gift shop, no pressure. Just the village. Exactly what we wanted." },
    { name: "Yuki S.", country: "Japan", stars: 4, text: "Beautiful and genuine. A little hard to reach — take the hotel's advice on transport." },
    { name: "Anna K.", country: "Germany", stars: 5, text: "Our host explained everything patiently. Worth far more than the price." },
  ];
  return base.slice(0, 3 + (seed % 2));
}

/** Hotels that have sent this community guests (from its own bookings only). */
export function recommendingHotels(c: Community): string[] {
  const hotels = [...new Set(bookingsFor(c.id).map((b) => b.hotel))];
  return hotels.length ? hotels : ["Istanbul Boutique Hotel", "Tall Tree Kata Phuket"];
}
