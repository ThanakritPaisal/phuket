import accountsRaw from "./data/accounts.real.json";
import type { RealAccount } from "./types";
import { CATALOG } from "./data";
import { haversineKm, project } from "./geo";
import { assetUrl } from "./assets";

// The seed file has no x/y — derive them by projecting the real lat/lng onto the
// stylised map, so the "you are here" marker is geographically accurate. Photos
// resolve to the hosted GCS bucket URL.
export const REAL_ACCOUNTS = (accountsRaw as Omit<RealAccount, "x" | "y">[]).map(
  (a): RealAccount => ({ ...a, ...project({ lat: a.lat, lng: a.lng }), photo: assetUrl(a.photo) })
);

/** House picks = nearest well-rated real providers to the property. */
function computeHousePicks(a: RealAccount, n = 3): string[] {
  return CATALOG.filter((p) => p.lat != null && p.lng != null && (p.rating ?? 0) >= 4.0)
    .map((p) => ({
      id: p.id,
      km: haversineKm({ lat: a.lat, lng: a.lng }, { lat: p.lat!, lng: p.lng! }),
      rating: p.rating ?? 0,
      reviews: p.reviews ?? 0,
    }))
    // nearest first, then better-reviewed
    .sort((x, y) => x.km - y.km || y.reviews - x.reviews)
    .slice(0, n)
    .map((x) => x.id);
}

// Fill housePicks from real geography (the seed file ships them empty).
export const ACCOUNTS_REAL: RealAccount[] = REAL_ACCOUNTS.map((a) => ({
  ...a,
  housePicks: a.housePicks?.length ? a.housePicks : computeHousePicks(a),
}));

export function accountByUser(user: string, pass: string): RealAccount | undefined {
  return ACCOUNTS_REAL.find((a) => a.user === user && a.pass === pass);
}

export function accountById(id: string): RealAccount | undefined {
  return ACCOUNTS_REAL.find((a) => a.id === id);
}

export const DEFAULT_ACCOUNT = ACCOUNTS_REAL[0];
