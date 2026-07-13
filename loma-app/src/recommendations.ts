// RECOMMENDATION LISTS + QR LINKS — assisted (per-guest) and passive (hotel-wide).
import { getActiveAccount } from "./activeAccount";
import { trackEvent } from "./impact";

export interface RecList {
  id: string;
  kind: "assisted" | "passive";
  hotel_id: string;
  hotel_name: string;
  staff_id: string;
  items: string[];
  note: string;
  created: string;
}

function hsh(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const CREATED = "2026-07-13";

export const RECOMMENDATION_LISTS: RecList[] = [];

export function createRecList(
  ids: string[],
  kind: "assisted" | "passive" = "assisted",
  note = ""
): RecList {
  const partner = getActiveAccount();
  const rl: RecList = {
    id: "rl_" + (RECOMMENDATION_LISTS.length + 1) + "_" + (hsh(ids.join(",") + kind) % 9999),
    kind,
    hotel_id: partner.id || "htl_demo",
    hotel_name: partner.name,
    staff_id: partner.staff,
    items: ids.slice(),
    note,
    created: CREATED,
  };
  RECOMMENDATION_LISTS.push(rl);
  trackEvent("recommendation_created", {
    recommendation_list_id: rl.id,
    metadata: { kind: rl.kind, n: ids.length },
  });
  trackEvent("qr_generated", { recommendation_list_id: rl.id });
  return rl;
}

export function getRecList(id: string): RecList | undefined {
  return RECOMMENDATION_LISTS.find((r) => r.id === id);
}

export function recUrl(rl: RecList): string {
  return "loma.app/r/" + rl.id;
}
