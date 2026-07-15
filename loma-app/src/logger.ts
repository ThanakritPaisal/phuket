// Fire-and-forget client that ships tracking events to the FastAPI logging backend
// (loma-app/logging-api). It never throws into the UI and never blocks a click:
// events are queued and flushed in small batches, with a sendBeacon fallback on
// page hide so nothing is lost when the tab closes.
//
// Base URL comes from VITE_LOG_API_URL (see .env.local); defaults to localhost:8000.

const API_BASE =
  (import.meta.env.VITE_LOG_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export interface LogEvent {
  event_type: string;
  event_id?: string;
  hotel_id?: string | null;
  staff_id?: string | null;
  provider_id?: string | null;
  community_id?: string | null;
  recommendation_list_id?: string | null;
  tourist_session_id?: string | null;
  channel?: string | null;
  credits?: number;
  counted?: boolean;
  flagged?: boolean;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

let queue: LogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 800;

async function postBatch(events: LogEvent[]): Promise<void> {
  if (!events.length) return;
  try {
    await fetch(`${API_BASE}/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Logging is best-effort — swallow network errors so the app is unaffected.
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const batch = queue;
    queue = [];
    void postBatch(batch);
  }, FLUSH_MS);
}

/** Queue one event for delivery to the logging backend. Safe to call from any handler. */
export function logEvent(ev: LogEvent): void {
  queue.push(ev);
  scheduleFlush();
}

// On tab hide/unload, flush whatever is queued using sendBeacon (survives navigation).
if (typeof window !== "undefined") {
  const flushBeacon = () => {
    if (!queue.length) return;
    const body = JSON.stringify({ events: queue });
    queue = [];
    try {
      navigator.sendBeacon?.(`${API_BASE}/events/batch`, new Blob([body], { type: "application/json" }));
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushBeacon();
  });
  window.addEventListener("pagehide", flushBeacon);
}
