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

export function bookingByRef(ref: string): Booking | undefined {
  return BOOKINGS.find((b) => b.ref === ref.trim());
}

// ---------- Capacity / live availability ----------
// Each community publishes a number of seats. Availability = capacity minus the pax of
// every booking that isn't a no-show, so a real tourist booking lowers it live.
const CAPACITY: Record<string, number> = {};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Published seats for a community (deterministic default 14–24, editable by the host). */
export function getCapacity(commId: string): number {
  if (CAPACITY[commId] == null) CAPACITY[commId] = 14 + (hashId(commId) % 11);
  return CAPACITY[commId];
}

export function setCapacity(commId: string, n: number): void {
  CAPACITY[commId] = Math.max(0, Math.floor(n));
  bumpVersion();
}

/** Seats already taken by live bookings (everything except no-shows). */
export function bookedPax(commId: string): number {
  return BOOKINGS.filter((b) => b.id === commId && b.status !== "noshow").reduce((a, b) => a + b.pax, 0);
}

/** Seats still available right now. */
export function remainingSlots(commId: string): number {
  return Math.max(0, getCapacity(commId) - bookedPax(commId));
}

// ---------- Creating a real booking (tourist side) ----------
let bkSeq = 3000;

export interface CreateBookingResult {
  ok: boolean;
  booking?: Booking;
  reason?: string;
}

export function createBooking(opts: {
  commId: string;
  pax: number;
  guest: string;
  hotel: string;
  date: string;
}): CreateBookingResult {
  const { commId, pax, guest, hotel, date } = opts;
  if (pax < 1) return { ok: false, reason: "Choose at least 1 guest" };
  const left = remainingSlots(commId);
  if (left < pax) return { ok: false, reason: `Only ${left} seat${left === 1 ? "" : "s"} left` };
  const ref = "BK-" + ++bkSeq;
  const booking: Booking = { ref, id: commId, hotel, guest, pax, date, status: "confirmed" };
  BOOKINGS.push(booking);
  bumpVersion(); // availability drops immediately
  return { ok: true, booking };
}
