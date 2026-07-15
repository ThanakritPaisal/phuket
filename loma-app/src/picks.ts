// The "find local picks" engine.
//
// Personas render `CatalogProvider` (the prototype's rich card shape). This module
// adapts REAL Google-enriched providers into that shape, computing distance live
// from the signed-in partner property and generating the LOMA narrative from data
// we actually have. Components downstream need no changes.
import type { CatalogProvider, Provider, RealAccount } from "./types";
import { CATALOG } from "./data";
import { haversineKm, distLabel, distMinutes, project } from "./geo";
import { reasonFor, whyLocalFor, bestForFor, scoresFor } from "./copy";
import { aiScore, type AiScore, type SourceType } from "./scoring";

export const CAT_EMO: Record<string, string> = {
  "Community Experience": "🛶",
  "Local Food": "🍜",
  "Souvenir & Local Product": "🎁",
  "Massage & Wellness": "💆",
  "Boat / Sea": "⛵",
};

export interface Pick extends CatalogProvider {
  km: number;
  minutes: number;
  lat: number;
  lng: number;
  ai: AiScore;
  // spec fields carried through for contextual matching (Layer B)
  wheelchair: Provider["wheelchair_accessibility"];
  elderly: Provider["elderly_suitability"];
  durationMin: number;
  durationMax: number;
  priceRange: Provider["price_range"];
  verification: Provider["verification_status"];
}

/** Adapt one real provider into the card shape, relative to a partner property. */
export function toPick(p: Provider, from: RealAccount, isHousePick = false): Pick {
  const km = haversineKm({ lat: from.lat, lng: from.lng }, { lat: p.lat!, lng: p.lng! });
  const label = distLabel(km);
  const s = scoresFor(p);
  const xy = project({ lat: p.lat!, lng: p.lng! });
  const hours = p.hours.length ? p.hours[0].replace(/^\w+:\s*/, "") : "See Google Maps";
  // Real provenance drives localness evidence strength: CBT-seed providers come from
  // the community-based-tourism registry (strong); OSM-discovered ones are public data (weak).
  const src = (p as Provider & { source?: string }).source;
  const sourceType: SourceType =
    src === "osm_bulk" || src === "osm_sample" ? "ai_discovered" : "community_nominated";

  const card: CatalogProvider & {
    km: number; minutes: number; lat: number; lng: number; sourceType: SourceType;
  } = {
    sourceType,
    id: p.id,
    name: p.name,
    cat: p.category,
    emo: CAT_EMO[p.category] || p.emo || "📍",
    area: p.area,
    dist: label,
    price: p.price || "฿฿",
    priceText: p.price || "Price varies",
    open: p.openNow ?? true,
    hours,
    local: true,
    // Every catalog provider comes from the BDI community-based-tourism registry,
    // so they are all vetted providers. `confidence` describes the Google *match*
    // quality, not the provider's standing — don't conflate the two.
    verified: true,
    quality: s.quality,
    locality: s.locality,
    readiness: s.readiness,
    safety: s.safety,
    loma_score: Math.round((s.quality + s.locality + s.readiness + s.safety) / 4),
    rating: p.rating ?? 0,
    reviews: p.reviews ?? 0,
    branches: 1,
    lang: "Thai · English",
    booking: p.phone ? "Walk-in welcome · call ahead for groups" : "Walk-in welcome",
    contact: p.phone ? "Phone" : "In person",
    pick: isHousePick,
    reason: reasonFor(p, label),
    whyLocal: whyLocalFor(p),
    note: p.address ? `Address: ${p.address}` : "",
    bestFor: bestForFor(p),
    img: p.photo || "",
    sum: p.summary || "",
    mapX: xy.x,
    mapY: xy.y,
    km,
    minutes: distMinutes(km),
    lat: p.lat!,
    lng: p.lng!,
  };
  // Run the real AI Curation Engine over the card's signals.
  return {
    ...card,
    ai: aiScore({ ...card, sourceType }),
    wheelchair: p.wheelchair_accessibility ?? "unknown",
    elderly: p.elderly_suitability ?? "unknown",
    durationMin: p.estimated_visit_duration_min ?? 45,
    durationMax: p.estimated_visit_duration_max ?? 75,
    priceRange: p.price_range ?? "unknown",
    verification: p.verification_status ?? "unverified",
  };
}

/** All real providers as picks for a property, nearest first. */
export function picksFor(account: RealAccount): Pick[] {
  const house = new Set(account.housePicks || []);
  return CATALOG.filter((p) => p.lat != null && p.lng != null)
    .map((p) => toPick(p, account, house.has(p.id)))
    .sort((a, b) => a.km - b.km);
}

export interface PickFilter {
  cat?: string | null;
  cats?: string[] | null;
  openNow?: boolean;
  maxMin?: number | null;
  sort?: "match" | "distance" | "rating";
}

export function filterPicks(all: Pick[], f: PickFilter): Pick[] {
  const out = all.filter(
    (p) =>
      (!f.cat || p.cat === f.cat) &&
      (!f.cats || f.cats.includes(p.cat)) &&
      (!f.openNow || p.open) &&
      (f.maxMin == null || p.minutes <= f.maxMin)
  );
  const sort = f.sort || "match";
  if (sort === "distance") return out.sort((a, b) => a.km - b.km);
  if (sort === "rating") return out.sort((a, b) => b.rating - a.rating);
  // "match" = LOMA score, then closer, then better rated
  return out.sort(
    (a, b) =>
      (b.loma_score ?? 0) - (a.loma_score ?? 0) || a.km - b.km || b.rating - a.rating
  );
}

export function pickById(account: RealAccount, id: string): Pick | undefined {
  const p = CATALOG.find((x) => x.id === id);
  if (!p || p.lat == null || p.lng == null) return undefined;
  return toPick(p, account, (account.housePicks || []).includes(id));
}
