// ============================================================================
// Canonical LOMA category taxonomy — SINGLE SOURCE OF TRUTH.
// Locked 2026-07-16, ahead of the ~1,000-business enrichment pull, so that every
// ingestion source (OSM tags, Google `primaryType`, TAT directory) and every
// app surface (chips, filters, display) resolves categories the SAME way.
//
// The data-enrichment pipeline (scripts/) MUST classify into exactly these ids.
// Do not invent per-source category strings — map into one of the six below.
// ============================================================================

export interface LomaCategory {
  id: string; // canonical value stored on every provider (Provider.category)
  label: string; // short chip/display label
  emoji: string;
  indoor: boolean; // indoor/outdoor default → drives the rainy-day (rainy_ok) proxy
}

export const CATEGORIES: LomaCategory[] = [
  { id: "Local Food", label: "Local food", emoji: "🍜", indoor: true },
  { id: "Seafood", label: "Seafood", emoji: "🦐", indoor: true },
  { id: "Street Food & Noodles", label: "Street food", emoji: "🍲", indoor: true },
  { id: "Café & Dessert", label: "Café", emoji: "☕", indoor: true },
  { id: "Massage & Wellness", label: "Massage & spa", emoji: "💆", indoor: true },
  { id: "Souvenir & Local Product", label: "Souvenir", emoji: "🎁", indoor: true },
  { id: "Community Experience", label: "Local experience", emoji: "🛶", indoor: false },
  { id: "Boat / Sea", label: "Boat & sea", emoji: "⛵", indoor: false },
];

export const CATEGORY_IDS: string[] = CATEGORIES.map((c) => c.id);
export const CAT_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.emoji])
);

// Categories that count as "rainy-day OK" (indoor). Interim proxy for the Rainy Day
// chip until the per-provider `setting` (indoor/outdoor, derived from primaryType +
// reviews) is populated by the enrichment pull.
export const RAINY_OK: string[] = CATEGORIES.filter((c) => c.indoor).map((c) => c.id);

export interface RawTags {
  amenity?: string;
  shop?: string;
  tourism?: string;
  leisure?: string;
  craft?: string;
  primaryType?: string; // Google Place primary type token
}

/**
 * Map a raw source tag-set to one canonical category. This is the ONE place ingestion
 * decides categories, so OSM, Google and TAT all resolve identically. Order matters:
 * more-specific buckets (café, wellness) are tested before the food/souvenir catch-alls.
 * The Python enrichment pipeline mirrors this mapping.
 */
export function tagToCategory(tags: RawTags): string {
  const { amenity, shop, tourism, leisure, craft } = tags;
  const t = (tags.primaryType || "").toLowerCase();
  const inShop = (...v: string[]) => !!shop && v.includes(shop);

  // Café & Dessert
  if (
    amenity === "cafe" ||
    amenity === "ice_cream" ||
    inShop("bakery", "pastry", "confectionery", "coffee", "tea", "chocolate") ||
    /\b(cafe|coffee|bakery|dessert|ice_cream|tea_house)\b/.test(t)
  )
    return "Café & Dessert";

  // Massage & Wellness
  if (shop === "massage" || leisure === "spa" || shop === "cosmetics" || /\b(spa|massage|wellness|beauty_salon)\b/.test(t))
    return "Massage & Wellness";

  // Boat / Sea (before generic attraction)
  if (/\b(marina|boat|dive|diving|pier|harbor|harbour|snorkel)\b/.test(t)) return "Boat / Sea";

  // Souvenir & Local Product
  if (
    inShop("craft", "gift", "art", "souvenir", "farm", "greengrocer") ||
    craft ||
    amenity === "marketplace" ||
    /\b(gift_shop|souvenir|market|craft|art_gallery|home_goods_store)\b/.test(t)
  )
    return "Souvenir & Local Product";

  // Community Experience
  if (tourism || /\b(tourist_attraction|museum|cultural_center|art_gallery)\b/.test(t)) return "Community Experience";

  // Local Food (default for eateries and anything unmatched)
  return "Local Food";
}
