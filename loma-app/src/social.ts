// Social + TikTok layer (v3 handoff).
// DEMO: deterministic platform *search* URLs that always resolve on tap.
// PRODUCTION: replace demoSocial() with the shop's real profile URLs stored on the provider.

export type SocialKey = "facebook" | "instagram" | "tiktok";
export type SocialLinks = Partial<Record<SocialKey, string>>;

export const SOC_BG: Record<SocialKey, string> = {
  facebook: "#1877F2",
  instagram: "linear-gradient(45deg,#F09433,#E6683C,#DC2743,#CC2366,#BC1888)",
  tiktok: "#010101",
};

// FNV-1a — deterministic, so a given shop always gets the same demo socials across reloads.
function hsh(s: string): number {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * DEMO social links for a provider. Ported 1:1 from v3 `demoSocial(p)`:
 * ~80% get Facebook, ~60% Instagram, ~50% TikTok — deterministic per id.
 * Community Experiences get none (they're contact-first, not social-marketed).
 */
export function demoSocial(id: string, name: string, category: string): SocialLinks | null {
  if (category === "Community Experience") return null;
  const q = encodeURIComponent((name || "") + " Phuket");
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const s: SocialLinks = {};
  if (hsh("fb|" + id) % 10 < 8) s.facebook = "https://www.facebook.com/search/top?q=" + q;
  if (hsh("ig|" + id) % 10 < 6) s.instagram = "https://www.instagram.com/explore/tags/" + slug + "/";
  if (hsh("tk|" + id) % 10 < 5) s.tiktok = "https://www.tiktok.com/search?q=" + q;
  return Object.keys(s).length ? s : null;
}
