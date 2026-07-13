// Community-experience bookings (community host check-in flow).
// A booking is NOT a visit: only checked-in ("attended") guests count as impact.
import { bumpVersion } from "./store";

export type BookingStatus = "requested" | "confirmed" | "attended" | "noshow";

export interface Booking {
  ref: string;
  id: string; // community id
  hotel: string;
  guest: string;
  pax: number;
  date: string;
  status: BookingStatus;
}

// Seeded demo bookings across the (real) communities.
export const BOOKINGS: Booking[] = [
  { ref: "BK-2041", id: "bang-rong", hotel: "Istanbul Boutique Hotel", guest: "Müller +1", pax: 2, date: "2026-07-11", status: "attended" },
  { ref: "BK-2042", id: "bang-rong", hotel: "Tall Tree Kata Phuket", guest: "Ferrari family", pax: 4, date: "2026-07-12", status: "confirmed" },
  { ref: "BK-2043", id: "koh-maprao", hotel: "Istanbul Boutique Hotel", guest: "Andersson", pax: 2, date: "2026-07-10", status: "attended" },
  { ref: "BK-2044", id: "bang-rong", hotel: "RentaBikePhuket.com", guest: "Tanaka +2", pax: 3, date: "2026-07-13", status: "requested" },
  { ref: "BK-2045", id: "koh-maprao", hotel: "Tall Tree Kata Phuket", guest: "O'Brien", pax: 2, date: "2026-07-09", status: "noshow" },
  { ref: "BK-2046", id: "kamala", hotel: "Istanbul Boutique Hotel", guest: "Rossi +1", pax: 2, date: "2026-07-11", status: "attended" },
  { ref: "BK-2047", id: "old-town", hotel: "Tall Tree Kata Phuket", guest: "Nguyen family", pax: 3, date: "2026-07-12", status: "confirmed" },
  { ref: "BK-2048", id: "cape-panwa", hotel: "RentaBikePhuket.com", guest: "Silva", pax: 2, date: "2026-07-13", status: "requested" },
  { ref: "BK-2049", id: "bang-tao", hotel: "Istanbul Boutique Hotel", guest: "Kim +2", pax: 3, date: "2026-07-10", status: "attended" },
];

export function bookingsFor(commId: string): Booking[] {
  return BOOKINGS.filter((b) => b.id === commId);
}

export function setBookingStatus(ref: string, status: BookingStatus): void {
  const b = BOOKINGS.find((x) => x.ref === ref);
  if (b) {
    b.status = status;
    bumpVersion();
  }
}
