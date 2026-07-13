// Provider persona — shared helpers ported from LOMA-prototype.html
import { ACCOUNTS, GUEST_REVIEWS } from "../mock";
import type { CatalogProvider, GuestReview } from "../types";

// Provider demo accounts (prototype PROVIDER_ACCOUNTS)
export interface ProviderAccount {
  user: string;
  pass: string;
  provId: string;
  status: string;
}
export const PROVIDER_ACCOUNTS: ProviderAccount[] = [
  { user: "baanrimtalay", pass: "kitchen2026", provId: "BRT", status: "verified" },
  { user: "oldtownmassage", pass: "massage2026", provId: "OTH", status: "verified" },
  { user: "rawaifisherfolk", pass: "rawai2026", provId: "RFE", status: "verified" },
];

// mock Google Places results for the import flow (prototype GOOGLE_RESULTS)
export interface GoogleResult {
  name: string;
  cat: string;
  area: string;
  address: string;
  rating: number;
  reviews: number;
  hours: string;
  phone: string;
  price: string;
  img: string;
}
export const GOOGLE_RESULTS: GoogleResult[] = [
  { name: "Chalong Seafood House", cat: "Local Food", area: "Chalong", address: "55 Chao Fa Rd, Chalong, Phuket", rating: 4.5, reviews: 328, hours: "11:00 – 22:00 daily", phone: "+66 76 123 456", price: "฿฿", img: "https://loremflickr.com/600/400/thai,seafood?lock=71" },
  { name: "Baan Suan Thai Massage", cat: "Massage & Wellness", area: "Rawai", address: "12 Wiset Rd, Rawai, Phuket", rating: 4.7, reviews: 210, hours: "10:00 – 21:00 daily", phone: "+66 76 222 333", price: "฿฿", img: "https://loremflickr.com/600/400/spa,massage?lock=72" },
  { name: "Phuket Town Coffee Lab", cat: "Café", area: "Old Town", address: "8 Thalang Rd, Old Town, Phuket", rating: 4.6, reviews: 154, hours: "08:00 – 17:00 daily", phone: "+66 76 444 555", price: "฿", img: "https://loremflickr.com/600/400/coffee,cafe?lock=73" },
];

export const AREAS = ["Patong", "Kata", "Karon", "Rawai", "Chalong", "Old Town", "Bang Tao", "Nai Yang"];
export const REG_CATS = ["Local Food", "Café", "Massage & Wellness", "Souvenir & Local Product", "Community Experience", "Local Market"];

const seedOf = (id: string): number =>
  [...id].reduce((s, c) => s + c.charCodeAt(0), 0);

export interface ProvStats {
  leads: number;
  visits: number;
  conv: number;
  revenue: number;
  avg: number;
}
export function provStats(p: CatalogProvider): ProvStats {
  const seed = seedOf(p.id);
  const leads = 42 + (seed % 38);
  const visits = Math.round(leads * (0.52 + (seed % 18) / 100));
  const conv = Math.round((visits / leads) * 100);
  const avg = p.price === "฿" ? 170 : p.price === "฿฿" ? 540 : 920;
  return { leads, visits, conv, revenue: visits * avg, avg };
}

export interface Partner {
  name: string;
  leads: number;
  visits: number;
}
export function provPartners(id: string): Partner[] {
  const seed = seedOf(id);
  const names = ACCOUNTS.filter((a) => a.status === "approved")
    .map((a) => a.name)
    .concat(["Old Town Guesthouse", "Bang Tao Villa Mgmt", "Chalong Car Hire"]);
  return names.slice(0, 5).map((n, i) => ({
    name: n,
    leads: 3 + ((seed + i * 7) % 13),
    visits: 1 + ((seed + i * 5) % 8),
  }));
}

export function provReviews(id: string): GuestReview[] {
  return GUEST_REVIEWS.filter((r) => r.prov === id);
}

export interface Lead {
  by: string;
  when: string;
  ctx: string;
  status: "New" | "Opened" | "Confirmed";
  spend: string;
}
export const PROV_LEADS: Lead[] = [
  { by: "Sea Breeze Boutique Hotel", when: "12 min ago", ctx: "Party of 2 · tonight", status: "New", spend: "—" },
  { by: "Kata Backpackers Hostel", when: "2h ago", ctx: "Solo · this afternoon", status: "Opened", spend: "—" },
  { by: "Sea Breeze Boutique Hotel", when: "Yesterday", ctx: "Family of 4", status: "Confirmed", spend: "฿620" },
  { by: "Rawai Scooter Rental", when: "2 days ago", ctx: "Couple", status: "Confirmed", spend: "฿410" },
  { by: "Old Town Guesthouse", when: "3 days ago", ctx: "Two guests", status: "Confirmed", spend: "฿880" },
  { by: "Kata Backpackers Hostel", when: "4 days ago", ctx: "Solo", status: "Opened", spend: "—" },
];

export function provMenu(p: CatalogProvider): [string, string][] {
  const c = p.cat;
  if (/Food|Kitchen|Dessert/.test(c)) return [["Signature seafood dish", "฿180"], ["Local set menu", "฿350"], ["House curry", "฿250"], ["Soft drinks", "฿60"]];
  if (/Café/.test(c)) return [["Local coffee", "฿60"], ["Traditional Phuket dessert", "฿90"], ["Iced specialty", "฿120"]];
  if (/Massage|Wellness/.test(c)) return [["Thai massage · 60 min", "฿300"], ["Herbal compress · 90 min", "฿600"], ["Foot massage · 45 min", "฿250"]];
  if (/Souvenir|Craft|Product/.test(c)) return [["Hand-made batik", "฿250–900"], ["Local ceramics", "฿120–400"], ["Pearl jewellery", "฿300+"]];
  return [["Half-day experience", "฿450 / person"], ["Group package", "from ฿1,200"]];
}

export function provScore(p: CatalogProvider): number {
  return p.loma_score || Math.round((p.quality + p.locality + p.readiness + p.safety) / 4);
}

export function provInit(name: string): string {
  return (
    name
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "P"
  );
}

export function inits(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
}

export function revKw(cat: string): string {
  return /Food|Kitchen/.test(cat)
    ? "thai,food"
    : /Massage|Wellness/.test(cat)
    ? "spa,massage"
    : /Souvenir|Craft/.test(cat)
    ? "handicraft,thai"
    : /Café|Dessert/.test(cat)
    ? "coffee,dessert"
    : "phuket,thailand";
}

export function refFor(id: string): string {
  let h = 0;
  const s = "LOMA" + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (
    "LOMA-" +
    String(id).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) +
    "-" +
    (1000 + (h % 9000))
  );
}

export function fmtBk(n: number): string {
  return n >= 1e6
    ? "฿" + (n / 1e6).toFixed(2) + "M"
    : n >= 1e3
    ? "฿" + Math.round(n / 1e3) + "k"
    : "฿" + Math.round(n);
}
