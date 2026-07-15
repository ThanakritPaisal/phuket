// QR SHARING — real, cross-device links.
//
// A hotel share encodes the picked place IDs *into the URL itself*, so scanning the QR
// on any phone opens the tourist view with exactly those places — no server round-trip,
// no shared in-memory state required. The place catalog is static and identical on every
// device, so the receiving app just resolves the IDs locally.
import type { Persona } from "./types";
import { RECOMMENDATION_LISTS, type RecList } from "./recommendations";

const CREATED = "2026-07-13";

/** Stable per-place visit code shown by the tourist and scanned by the destination shop.
 *  Same algorithm as refFor() across roles, so codes match on both ends. */
export function visitCode(id: string): string {
  let h = 0;
  const s = "LOMA" + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const tail = String(id).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return "LOMA-" + tail + "-" + (1000 + (h % 9000));
}

/** Build the real, scannable URL for a recommendation list. Uses the current origin so
 *  it works wherever the app is hosted (localhost in dev, the deployed domain in prod). */
export function buildShareUrl(rl: RecList): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "https://loma.app/";
  const q = new URLSearchParams();
  q.set("loma", "r");
  q.set("r", rl.id);
  if (rl.items.length) q.set("p", rl.items.join(","));
  q.set("k", rl.kind);
  if (rl.hotel_id) q.set("h", rl.hotel_id);
  if (rl.hotel_name) q.set("hn", rl.hotel_name);
  return base + "?" + q.toString();
}

/** Build a scannable share URL directly from place IDs (for the share sheet / standee,
 *  which don't create a full RecList). */
export function buildShareUrlFromIds(
  ids: string[],
  kind: "assisted" | "passive",
  hotel: { id?: string; name?: string }
): string {
  let h = 0;
  for (const s of ids) for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return buildShareUrl({
    id: "rl_" + kind + "_" + (h % 99999),
    kind,
    hotel_id: hotel.id || "htl_demo",
    hotel_name: hotel.name || "your hotel",
    staff_id: "",
    items: ids,
    note: "",
    created: CREATED,
  });
}

/** The deep link for a share channel with the LOMA link pre-filled, or null for channels
 *  handled in-page (QR, Copy link). WhatsApp/LINE use https so they can be encoded into a
 *  QR — scanning it with a phone camera opens the app directly. */
export function channelHref(channel: string, url: string, message = "Local picks for you"): string | null {
  const text = `${message} ${url}`;
  const enc = encodeURIComponent;
  switch (channel) {
    case "WhatsApp":
      return `https://wa.me/?text=${enc(text)}`;
    case "LINE":
      return `https://line.me/R/msg/text/?${enc(text)}`;
    case "SMS":
      return `sms:?&body=${enc(text)}`;
    case "Email":
      return `mailto:?subject=${enc("Local picks recommended for you")}&body=${enc(text)}`;
    default:
      return null;
  }
}

/** Which channels can be shown as a scannable QR (https deep links the camera can open). */
export function channelHasQR(channel: string): boolean {
  return channel === "QR" || channel === "WhatsApp" || channel === "LINE";
}

/** Open a share channel on THIS device (opens the app with the link pre-filled). */
export function openShareChannel(channel: string, url: string, message = "Local picks for you"): boolean {
  const href = channelHref(channel, url, message);
  if (!href) return false;
  if (typeof window !== "undefined") window.open(href, "_blank", "noopener");
  return true;
}

/** Copy text to the clipboard, resolving true on success. */
export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export interface IncomingLink {
  listId: string;
  picks: string[];
  kind: "assisted" | "passive";
  hotelId: string;
  hotelName: string;
}

/** Parse an incoming share URL (if this page was opened from a scanned QR). */
export function parseDeepLink(): IncomingLink | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get("loma") !== "r") return null;
  const picks = (q.get("p") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    listId: q.get("r") || "rl_shared",
    picks,
    kind: q.get("k") === "passive" ? "passive" : "assisted",
    hotelId: q.get("h") || "htl_demo",
    hotelName: q.get("hn") || "your hotel",
  };
}

/** If the app was opened from a scanned share QR, register the shared list so the tourist
 *  view renders those exact places, and switch the demo to the Tourist persona.
 *  Returns the persona to start on, or null when there's no incoming link. */
export function applyIncomingDeepLink(): Persona | null {
  const link = parseDeepLink();
  if (!link || !link.picks.length) return null;
  const rl: RecList = {
    id: link.listId,
    kind: link.kind,
    hotel_id: link.hotelId,
    hotel_name: link.hotelName,
    staff_id: "shared",
    items: link.picks,
    note: "",
    created: CREATED,
  };
  RECOMMENDATION_LISTS.push(rl);
  return "tourist";
}
