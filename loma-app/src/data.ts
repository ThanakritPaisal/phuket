import raw from "./data/providers.json";
import type { Provider } from "./types";
import { assetUrl } from "./assets";

// Photos are hosted in a GCS bucket; resolve the stored "/providers/*.jpg" paths
// to their full URLs at load time so every downstream consumer gets a real link.
export const PROVIDERS = (raw as Provider[]).map((p) => ({
  ...p,
  photo: assetUrl(p.photo),
}));

const confRank = (c: Provider["confidence"]) =>
  c === "HIGH" ? 0 : c === "MEDIUM" ? 1 : c === "LOW" ? 2 : 3;

// Better representative first: higher confidence, more reviews, has a photo.
function betterRep(a: Provider, b: Provider): number {
  return (
    confRank(a.confidence) - confRank(b.confidence) ||
    (b.reviews ?? 0) - (a.reviews ?? 0) ||
    Number(!!b.photo) - Number(!!a.photo)
  );
}

// Collapse rows that resolved to the same Google place (same placeId) into one
// card. Multiple seed rows (e.g. different products of one vendor) can map to a
// single physical place — placeId is the ground-truth identity. The representative
// inherits a photo/rating from a sibling if it lacks one, and keeps the other seed
// names as `aka` so nothing is lost. Rows without a placeId are never merged.
function dedupeByPlace(rows: Provider[]): Provider[] {
  const groups = new Map<string, Provider[]>();
  const out: Provider[] = [];
  for (const p of rows) {
    if (!p.placeId) {
      out.push(p);
      continue;
    }
    const g = groups.get(p.placeId);
    if (g) g.push(p);
    else groups.set(p.placeId, [p]);
  }
  for (const g of groups.values()) {
    const [rep, ...rest] = [...g].sort(betterRep);
    const merged: Provider = { ...rep };
    if (!merged.photo) merged.photo = rest.find((r) => r.photo)?.photo ?? null;
    if (merged.rating == null) merged.rating = rest.find((r) => r.rating != null)?.rating ?? null;
    const aka = rest
      .map((r) => r.seedName)
      .filter((n) => n && n !== merged.seedName);
    if (aka.length) merged.aka = aka;
    out.push(merged);
  }
  return out;
}

// Catalog for the tourist demo: all reliable (HIGH/MEDIUM) matches, deduped by place.
// Photo/rating are optional — cards fall back to an emoji and hide the rating badge.
export const CATALOG = dedupeByPlace(
  PROVIDERS.filter((p) => p.confidence === "HIGH" || p.confidence === "MEDIUM")
);

export const AREAS = Array.from(new Set(CATALOG.map((p) => p.area))).sort();
export const CATEGORIES = Array.from(new Set(CATALOG.map((p) => p.category))).sort();

export function byId(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export interface Filter {
  area: string | null;
  category: string | null;
  openNow: boolean;
}

export function filterCatalog(f: Filter): Provider[] {
  return CATALOG.filter(
    (p) =>
      (!f.area || p.area === f.area) &&
      (!f.category || p.category === f.category) &&
      (!f.openNow || p.openNow === true)
  ).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}
