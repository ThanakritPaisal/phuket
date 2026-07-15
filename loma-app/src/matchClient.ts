import type { MatchRequest } from "./matching";

const API_BASE =
  (import.meta.env.VITE_LOG_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type ParsedRequest = MatchRequest & { _source?: "gemini" | "keyword" | "unavailable" };

/** Parse a natural-language request into structured constraints via the backend
 *  (Gemini, with a server-side keyword fallback). If the API is unreachable the
 *  caller should fall back to the manual quick-filter chips. */
export async function parseRequest(text: string): Promise<ParsedRequest> {
  try {
    const res = await fetch(`${API_BASE}/nl-parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return (await res.json()) as ParsedRequest;
  } catch {
    // backend down
  }
  return { _source: "unavailable" };
}
