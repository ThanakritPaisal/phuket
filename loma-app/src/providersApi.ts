import { setProviders } from "./data";
import type { Provider } from "./types";

// Same backend as the event logger. Override with VITE_LOG_API_URL.
const API_BASE =
  (import.meta.env.VITE_LOG_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

/**
 * Load the provider catalog from the database (via the logging API) and hydrate the
 * data layer. Returns true on success. On any failure (API down / offline) the app
 * keeps the bundled providers.json as a fallback, so it always renders.
 */
export async function loadProviders(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/providers`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const rows = (await res.json()) as Provider[];
    if (Array.isArray(rows) && rows.length) {
      setProviders(rows);
      console.info(`[LOMA] loaded ${rows.length} providers from the database`);
      return true;
    }
  } catch {
    console.info("[LOMA] providers API unreachable — using bundled JSON fallback");
  }
  return false;
}
