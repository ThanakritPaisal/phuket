// Real geography for LOMA: distances between the signed-in partner property and
// providers, plus a lat/lng -> map-percentage projection for the stylised maps.

export interface LatLng {
  lat: number;
  lng: number;
}

// Bounding box covering every real provider + partner account, with a small margin
// so nothing lands exactly on an edge of the stylised map.
export const PHUKET_BBOX = {
  latMin: 7.74,
  latMax: 8.26,
  lngMin: 98.24,
  lngMax: 98.60,
};

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
}

// Phuket's road network + traffic: ~35 km/h effective door-to-door average.
const AVG_KMH = 35;
const WALK_KMH = 4.5;

/** Estimated driving minutes for a straight-line distance (with a road-detour factor). */
export function driveMinutes(km: number): number {
  const roadKm = km * 1.3; // straight line -> road distance
  return Math.max(1, Math.round((roadKm / AVG_KMH) * 60));
}

export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km * 1.2 / WALK_KMH) * 60));
}

/** Human label, e.g. "8 min walk" / "14 min by car". */
export function distLabel(km: number): string {
  if (km < 1.0) return `${walkMinutes(km)} min walk`;
  return `${driveMinutes(km)} min by car`;
}

/** Minutes used for filtering/sorting (walk for very close, else drive). */
export function distMinutes(km: number): number {
  return km < 1.0 ? walkMinutes(km) : driveMinutes(km);
}

/** Approximate real centroids for the areas used by the admin analytics dataset. */
export const AREA_CENTROIDS: Record<string, LatLng> = {
  Patong: { lat: 7.8965, lng: 98.2966 },
  Kata: { lat: 7.8199, lng: 98.2986 },
  Karon: { lat: 7.846, lng: 98.2949 },
  Kamala: { lat: 7.954, lng: 98.281 },
  Surin: { lat: 7.977, lng: 98.279 },
  "Bang Tao": { lat: 8.0, lng: 98.296 },
  "Phuket Old Town": { lat: 7.8842, lng: 98.3878 },
  Rawai: { lat: 7.774, lng: 98.324 },
  "Nai Harn": { lat: 7.777, lng: 98.303 },
  Chalong: { lat: 7.843, lng: 98.338 },
  Kathu: { lat: 7.911, lng: 98.332 },
  "Nai Yang": { lat: 8.09, lng: 98.3 },
  "Mai Khao": { lat: 8.16, lng: 98.3 },
  "Cape Panwa": { lat: 7.806, lng: 98.403 },
  Thalang: { lat: 8.033, lng: 98.336 },
};

/** Project lat/lng onto the stylised map as {x,y} percentages. */
export function project(p: LatLng): { x: number; y: number } {
  const { latMin, latMax, lngMin, lngMax } = PHUKET_BBOX;
  const x = ((p.lng - lngMin) / (lngMax - lngMin)) * 100;
  // latitude grows north, y grows downward
  const y = ((latMax - p.lat) / (latMax - latMin)) * 100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(94, Math.max(6, y)),
  };
}
