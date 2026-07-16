// ============================================================================
// Canonical LOMA provider ATTRIBUTES (orthogonal to category).
// Scaffolded 2026-07-16 ahead of the enrichment pull so ingestion has real slots
// to write into. Mirrors the taxonomy contract in categories.ts.
//
//   setting  — indoor / outdoor (drives the rainy-day filter)
//   dietary  — vegetarian / vegan / halal (CONFIRMED tags only)
//
// HONESTY RULE (same as accessibility): "unknown" ≠ "no". A place is only tagged
// vegetarian/halal when we have positive evidence; absence means "not confirmed",
// never "not available". Never infer halal from a photo or a guess.
// ============================================================================
import type { Setting, DietaryTag } from "./types";
import { CATEGORIES, RAINY_OK, type RawTags } from "./categories";

// ---- setting -------------------------------------------------------------
export const SETTING_LABEL: Record<Setting, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  mixed: "Indoor & outdoor",
  unknown: "Not confirmed",
};

/**
 * Rainy-day fit. Uses the real per-place `setting` when known; falls back to the
 * category indoor-default (RAINY_OK) while `setting` is still "unknown" pre-pull.
 */
export function rainyOk(setting: Setting | undefined, category: string): boolean {
  if (setting === "indoor" || setting === "mixed") return true;
  if (setting === "outdoor") return false;
  return RAINY_OK.includes(category); // setting unknown → category proxy
}

// ---- dietary -------------------------------------------------------------
export const DIETARY_LABEL: Record<DietaryTag, string> = {
  vegetarian: "🌱 Vegetarian options",
  vegan: "🌿 Vegan options",
  halal: "☪ Halal",
};

export function hasDiet(dietary: DietaryTag[] | undefined, tag: DietaryTag): boolean {
  return !!dietary && dietary.includes(tag);
}

// ---- ingestion reference mappings (the Python pull mirrors these) ---------
// Derive `setting` from a Google primaryType / OSM tags. Coarse first pass; the
// pull refines ambiguous categories (esp. restaurants) via review-text mining.
export function settingFromTags(tags: RawTags): Setting {
  const t = (tags.primaryType || "").toLowerCase();
  const { amenity, shop, leisure, tourism } = tags;
  // clearly indoor
  if (
    amenity === "cafe" ||
    shop ||
    leisure === "spa" ||
    /\b(cafe|coffee|bakery|spa|massage|store|shop|mall|museum|gallery|restaurant)\b/.test(t)
  )
    return "indoor";
  // clearly outdoor
  if (
    amenity === "marketplace" ||
    tourism === "viewpoint" ||
    tourism === "attraction" ||
    /\b(beach|market|viewpoint|park|marina|pier|tourist_attraction|natural_feature)\b/.test(t)
  )
    return "outdoor";
  return "unknown"; // e.g. street food, hawker — resolve via reviews
}

/**
 * Derive dietary tags. `servesVegetarianFood` is the ONLY structured Google field;
 * halal/vegan have NO Google field, so they come from OSM diet:* tags + name/review
 * mining (Thai "เจ"/"มังสวิรัติ" for veg, "ฮาลาล"/"halal" for halal). Positive-only.
 */
export function dietaryFromTags(tags: {
  servesVegetarianFood?: boolean;
  diet_vegetarian?: string; // OSM diet:vegetarian = yes|only
  diet_vegan?: string;
  diet_halal?: string; // OSM diet:halal = yes
  nameMatchHalal?: boolean; // from name/review mining
  nameMatchVeg?: boolean;
}): DietaryTag[] {
  const out: DietaryTag[] = [];
  if (tags.servesVegetarianFood === true || /^(yes|only)$/.test(tags.diet_vegetarian || "") || tags.nameMatchVeg)
    out.push("vegetarian");
  if (/^(yes|only)$/.test(tags.diet_vegan || "")) out.push("vegan");
  if (/^yes$/.test(tags.diet_halal || "") || tags.nameMatchHalal) out.push("halal");
  return out;
}

// re-export for convenience so callers import attributes in one place
export { CATEGORIES, RAINY_OK };
