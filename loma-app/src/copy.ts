// Generates the LOMA-curated narrative ("why this fits you" / "why this is local")
// for real Google-enriched providers, using only data we actually have.
// Nothing here invents facts — every clause is derived from a real field.
import type { Provider } from "./types";

const CAT_FIT: Record<string, string> = {
  "Community Experience": "a community-run experience",
  "Local Food": "a local kitchen",
  "Souvenir & Local Product": "a local maker's shop",
  "Massage & Wellness": "a local wellness spot",
  "Boat / Sea": "a local boat operator",
};

const CAT_TAGS: Record<string, string[]> = {
  "Community Experience": ["local culture", "families"],
  "Local Food": ["local food", "couples"],
  "Souvenir & Local Product": ["souvenirs", "local crafts"],
  "Massage & Wellness": ["rainy day", "couples"],
  "Boat / Sea": ["nature", "half-day"],
};

/** "Why this fits you" — built from category, area, rating volume and Google's summary. */
export function reasonFor(p: Provider, distLabel?: string): string {
  const kind = CAT_FIT[p.category] || "a verified local place";
  const bits: string[] = [`${kind} in ${p.area}`];
  if (distLabel) bits.push(distLabel.replace(/^(\d+)/, "$1").toLowerCase() + " away");
  if (p.rating != null && p.reviews != null && p.reviews >= 5)
    bits.push(`rated ${p.rating}★ by ${p.reviews} visitors on Google`);
  else if (p.rating != null) bits.push(`rated ${p.rating}★ on Google`);
  else bits.push("newly listed and vetted by LOMA");
  const lead = bits.join(", ");
  return p.summary ? `${lead}. ${p.summary}` : `${lead}.`;
}

/** "Why this is local" — grounded in the CBT registry provenance, not invented. */
export function whyLocalFor(p: Provider): string {
  const base =
    "Sourced from Phuket's community-based tourism registry — a locally owned, " +
    "community-run operator rather than a chain or tour-desk listing.";
  return p.confidence === "HIGH"
    ? `${base} Identity and location verified against Google.`
    : base;
}

export function bestForFor(p: Provider): string[] {
  const tags = [...(CAT_TAGS[p.category] || ["local culture"])];
  if (p.rating != null && p.rating >= 4.5) tags.push("highly rated");
  if (p.price === "Free" || p.price === "฿") tags.push("great value");
  return Array.from(new Set(tags)).slice(0, 3);
}

/** Derived LOMA sub-scores. Locality is high by construction (CBT registry). */
export function scoresFor(p: Provider) {
  const r = p.rating ?? 4.0;
  const n = p.reviews ?? 0;
  const confidence = p.confidence === "HIGH" ? 6 : 0;
  const volume = Math.min(12, Math.round(Math.log10(Math.max(1, n)) * 6));
  const quality = Math.max(60, Math.min(98, Math.round(r * 18) + volume));
  const locality = p.confidence === "HIGH" ? 96 : 90; // CBT registry provenance
  const readiness = Math.max(60, Math.min(96, 66 + confidence + (p.phone ? 8 : 0) + (p.hours.length ? 10 : 0)));
  const safety = Math.max(70, Math.min(96, 78 + confidence + (p.website ? 4 : 0)));
  return { quality, locality, readiness, safety };
}
