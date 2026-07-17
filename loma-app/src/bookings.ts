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
  date: string; // ISO YYYY-MM-DD
  status: BookingStatus;
  round?: string; // time-slot for self-serve bookings (older seed rows have none)
  self?: boolean; // true when a guest booked it themselves from the tourist app
}

// Seeded demo bookings across the (real) communities.
export const BOOKINGS: Booking[] = [
  // { ref: "BK-2041", id: "bang-rong", hotel: "Istanbul Boutique Hotel", guest: "Müller +1", pax: 2, date: "2026-07-11", status: "attended" },
  // { ref: "BK-2042", id: "bang-rong", hotel: "Tall Tree Kata Phuket", guest: "Ferrari family", pax: 4, date: "2026-07-12", status: "confirmed" },
  // { ref: "BK-2043", id: "koh-maprao", hotel: "Istanbul Boutique Hotel", guest: "Andersson", pax: 2, date: "2026-07-10", status: "attended" },
  // { ref: "BK-2044", id: "bang-rong", hotel: "RentaBikePhuket.com", guest: "Tanaka +2", pax: 3, date: "2026-07-13", status: "requested" },
  // { ref: "BK-2045", id: "koh-maprao", hotel: "Tall Tree Kata Phuket", guest: "O'Brien", pax: 2, date: "2026-07-09", status: "noshow" },
  // { ref: "BK-2046", id: "kamala", hotel: "Istanbul Boutique Hotel", guest: "Rossi +1", pax: 2, date: "2026-07-11", status: "attended" },
  // { ref: "BK-2047", id: "old-town", hotel: "Tall Tree Kata Phuket", guest: "Nguyen family", pax: 3, date: "2026-07-12", status: "confirmed" },
  // { ref: "BK-2048", id: "cape-panwa", hotel: "RentaBikePhuket.com", guest: "Silva", pax: 2, date: "2026-07-13", status: "requested" },
  // { ref: "BK-2049", id: "bang-tao", hotel: "Istanbul Boutique Hotel", guest: "Kim +2", pax: 3, date: "2026-07-10", status: "attended" },
];

export function bookingsFor(commId: string): Booking[] {
  return BOOKINGS.filter((b) => b.id === commId);
}

export function setBookingStatus(ref: string, status: BookingStatus): void {
  const b = BOOKINGS.find((x) => x.ref === ref);
  if (b) {
    b.status = status;
    persist();
    bumpVersion();
  }
}

// ---------- Live availability + tourist self-booking ----------
// Ported from LOMA-prototype.html ("Book your visit"). A guest picks a day + round;
// the booking lands in the SAME BOOKINGS store the community host reads, so it shows
// up on their Bookings / Check-in screens right away. A booking is still not a visit —
// only a host check-in turns it into counted income.

// Fixed "today" keeps the 7-day strip deterministic and aligned with the seeded
// demo dates (matches NOW in impact.ts / econ.ts).
const REF_NOW = new Date("2026-07-13T00:00:00");
const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface BookDay {
  idx: number;
  top: string; // "Today" | "Tomorrow" | weekday
  num: number; // day of month
  iso: string; // YYYY-MM-DD
}

/** The next 7 bookable days from the reference date. */
export function bookDays(): BookDay[] {
  const out: BookDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(REF_NOW);
    d.setDate(REF_NOW.getDate() + i);
    out.push({
      idx: i,
      top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DN[d.getDay()],
      num: d.getDate(),
      iso: d.toISOString().slice(0, 10),
    });
  }
  return out;
}

// Communities carry no per-slot data yet, so every experience offers a morning
// and an afternoon round at a fixed capacity.
export const COMMUNITY_ROUNDS = ["Morning · 09:00", "Afternoon · 13:00"];
export const SLOT_CAPACITY = 12;

function slotHash(s: string): number {
  let h = 0;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  return h;
}

/** Seats left for a slot: a deterministic base load minus real (non-no-show) bookings. */
export function slotSeats(commId: string, dayIso: string, round: string): number {
  const base = slotHash(commId + "|" + dayIso + "|" + round) % (Math.floor(SLOT_CAPACITY * 0.7) + 1);
  const taken = BOOKINGS.filter(
    (b) => b.id === commId && b.date === dayIso && b.round === round && b.status !== "noshow"
  ).reduce((a, b) => a + b.pax, 0);
  return Math.max(0, SLOT_CAPACITY - base - taken);
}

/** The current guest's own booking for this exact slot, if any. */
export function myBooking(commId: string, dayIso: string, round: string): Booking | undefined {
  return BOOKINGS.find((b) => b.self && b.id === commId && b.date === dayIso && b.round === round);
}

let _seq = 5000;

/** Create a real self-serve booking. Returns the row now visible to the host. */
export function addBooking(input: {
  id: string;
  date: string;
  round: string;
  pax: number;
  hotel: string;
  guest: string;
}): Booking {
  const b: Booking = {
    ref: "BK-" + ++_seq,
    id: input.id,
    hotel: input.hotel,
    guest: input.guest,
    pax: input.pax,
    date: input.date,
    round: input.round,
    status: "confirmed",
    self: true,
  };
  BOOKINGS.push(b);
  persist();
  bumpVersion();
  return b;
}

/** Cancel a self-serve booking (guest changed their mind). */
export function cancelBooking(ref: string): void {
  const i = BOOKINGS.findIndex((b) => b.ref === ref && b.self);
  if (i >= 0) {
    BOOKINGS.splice(i, 1);
    persist();
    bumpVersion();
  }
}

// ---------- Persistence ----------
// Bookings are demo-mutable module state; without this they reset on every reload,
// so a guest's booking would never survive long enough for a host to check them in.
// We persist self-serve bookings (whole rows) plus status overrides on the seeded
// rows (check-in / no-show), and rehydrate on module load.
const LS_KEY = "loma_bookings_v1";

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const self = BOOKINGS.filter((b) => b.self);
    const status: Record<string, BookingStatus> = {};
    BOOKINGS.forEach((b) => {
      if (!b.self) status[b.ref] = b.status; // seeded rows: only save what changed at runtime
    });
    localStorage.setItem(LS_KEY, JSON.stringify({ self, status }));
  } catch {
    /* quota / private-mode — persistence is best-effort */
  }
}

function loadPersisted(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as { self?: Booking[]; status?: Record<string, BookingStatus> };
    (p.self || []).forEach((b) => {
      if (b && b.ref && !BOOKINGS.some((x) => x.ref === b.ref)) BOOKINGS.push(b);
    });
    Object.entries(p.status || {}).forEach(([ref, st]) => {
      const b = BOOKINGS.find((x) => x.ref === ref);
      if (b) b.status = st;
    });
    // Keep new refs above anything already stored so we never collide.
    const maxSeq = (p.self || []).reduce((m, b) => {
      const n = parseInt(String(b.ref).replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, _seq);
    _seq = maxSeq;
  } catch {
    /* corrupt storage — ignore and start clean */
  }
}

loadPersisted();
