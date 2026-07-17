// Network layer for the DB-backed booking system (loma-app/logging-api → `booking`
// table). Every call is best-effort: on any failure the UI keeps its optimistic local
// state (bookings.ts) so the demo never breaks when the API is down. Same backend/base
// URL as the event logger and providers API — override with VITE_LOG_API_URL.
import type { Booking, BookingStatus } from "./bookings";

const API_BASE =
  (import.meta.env.VITE_LOG_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

// The backend serializes rows into exactly the web app's Booking shape (see
// _booking_out in main.py), so responses map 1:1 onto our Booking type.
interface CreateInput {
  id: string; // community id
  date: string;
  round: string;
  pax: number;
  hotel: string;
  guest: string;
}

/** Load all bookings from the database. Returns null on failure (caller keeps fallback). */
export async function fetchBookings(): Promise<Booking[] | null> {
  try {
    const res = await fetch(`${API_BASE}/bookings`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const rows = (await res.json()) as Booking[];
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

/** Create a booking server-side. Returns the persisted row (with the server-minted ref). */
export async function createBookingApi(input: CreateInput): Promise<Booking | null> {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: input.id,
        date: input.date,
        round: input.round,
        pax: input.pax,
        hotel: input.hotel,
        guest: input.guest,
        self_serve: true,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Booking;
  } catch {
    return null;
  }
}

/** Host action — check a guest in / mark a no-show. */
export async function updateBookingStatusApi(ref: string, status: BookingStatus): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(ref)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Cancel a self-serve booking. */
export async function cancelBookingApi(ref: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(ref)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
