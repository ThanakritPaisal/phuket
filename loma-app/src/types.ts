// ---------- Real enriched provider (Google Places data) ----------
export interface Provider {
  id: string;
  name: string;
  seedName: string;
  category: string;
  emo: string;
  itemType: string;
  area: string;
  rating: number | null;
  reviews: number | null;
  price: string;
  openNow: boolean | null;
  hours: string[];
  lat: number | null;
  lng: number | null;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  primaryType: string;
  summary: string;
  photo: string | null;
  placeId: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  aka?: string[]; // other seed names merged into this place during dedupe
  // Spec fields. "unknown" is the honest default — never inferred from photos/reviews.
  estimated_visit_duration_min?: number; // minutes (at the venue, excl. travel)
  estimated_visit_duration_max?: number;
  wheelchair_accessibility?: WheelchairAccessibility;
  elderly_suitability?: ElderlySuitability;
  verification_status?: VerificationStatus;
  price_range?: PriceRange;
  contact_method?: ContactMethod;
  opening_hours?: OpeningHours;
  setting?: Setting; // indoor/outdoor — drives the rainy-day filter
  dietary?: DietaryTag[]; // CONFIRMED dietary options only; absence ≠ "not available"
  links?: ProviderLinks; // consolidated URLs (website, maps + Google deep-links)
  // Official Thai admin divisions, parsed from the Google address. Phuket = 3 districts
  // (amphoe) / 17 tambon. `area` is the informal tourist zone and does NOT map to these.
  district?: PhuketDistrict;
  tambon?: string;
}

/** Phuket's three official districts (amphoe). */
export type PhuketDistrict = "Mueang Phuket" | "Kathu" | "Thalang";

// All URL-type data for a business in one place. Google Places (New) supplies
// website + google_maps + the `googleMapsLinks` bundle (directions/reviews/photos/
// write_review). Socials come from the v3 social layer, not Google. menu/booking are
// rarely available from any source — left open for manual/provider entry.
export interface ProviderLinks {
  website?: string; // Google websiteUri (often a Facebook page for small shops)
  google_maps?: string; // Google googleMapsUri — the place page
  directions?: string; // googleMapsLinks.directionsUri
  reviews?: string; // googleMapsLinks.reviewsUri
  write_review?: string; // googleMapsLinks.writeAReviewUri
  photos?: string; // googleMapsLinks.photosUri
  menu?: string; // rarely available
  booking?: string; // rarely available
}

export type PriceRange = "budget" | "moderate" | "premium" | "unknown";
export interface ContactMethod {
  type: "phone" | "line" | "whatsapp" | "facebook" | "website" | "none";
  value: string;
}
export interface OpeningHours {
  open_time: string | null; // "HH:MM"
  close_time: string | null;
  closed_days: string[]; // ["monday", ...]
}

export type WheelchairAccessibility = "full" | "partial" | "not_accessible" | "unknown";
export type ElderlySuitability = "suitable" | "conditional" | "not_suitable" | "unknown";
export type Setting = "indoor" | "outdoor" | "mixed" | "unknown";
export type DietaryTag = "vegetarian" | "vegan" | "halal";
export type VerificationStatus =
  | "unverified"
  | "provider_declared"
  | "hotel_verified"
  | "loma_verified";

// ---------- Mock catalog provider (rich prototype card) ----------
export interface CatalogProvider {
  id: string;
  name: string;
  cat: string;
  emo: string;
  area: string;
  dist: string;
  price: string;
  priceText: string;
  open: boolean;
  hours: string;
  local: boolean;
  verified: boolean;
  quality: number;
  locality: number;
  readiness: number;
  safety: number;
  rating: number;
  reviews: number;
  branches: number;
  lang: string;
  booking: string;
  contact: string;
  pick: boolean;
  reason: string;
  whyLocal: string;
  note: string;
  bestFor: string[];
  img: string;
  sum: string;
  // present on LOMA_DATA.operators only:
  loma_score?: number;
  vettingStatus?: string;
  leads?: number;
  opens?: number;
  visits?: number;
  onboardedDate?: string;
  mapX?: number;
  mapY?: number;
}

export type Category = [string, string]; // [label, emoji]

export interface GuestReview {
  prov: string;
  stars: number;
  when: string;
  tags: string[];
  comment: string;
  photos: number;
  ctx: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  area: string;
  user: string;
  pass: string;
  staff: string;
  staffInit: string;
  staffCount: number;
  x: number;
  y: number;
  status: string;
  level: string;
  kind: string;
  inviteCode: string;
  housePicks: string[];
}

// ---------- Real partner account (Google-resolved place + mock credentials) ----------
// Extends Account so every persona that renders an Account (incl. its map x/y,
// which we now derive by projecting the real lat/lng) works unchanged.
export interface RealAccount extends Account {
  // real Google data
  placeId: string;
  lat: number;
  lng: number;
  address: string;
  rating: number | null;
  reviews: number | null;
  primaryType: string;
  mapsUrl: string;
  website: string;
  phone: string;
  photo: string | null;
  housePicks: string[];
  // official admin divisions (parsed from the address) — partners should span all 3 districts
  district?: PhuketDistrict;
  tambon?: string;
}

// ---------- Admin analytics dataset (window.LOMA_DATA) ----------
export interface StaffMember {
  id: string;
  name: string;
  role: string;
  venue: string;
  venueType: string;
  area: string;
  languages: string[];
  active: boolean;
  recs: number;
  opens: number;
  visits: number;
  conversionRate: number;
  commissionTHB: number;
  joinedDate: string;
}

export interface TouristProfile {
  id: string;
  nationality: string;
  partyType: string;
  partySize: number;
  stayArea: string;
  lengthOfStayDays: number;
  budgetTier: string;
  interests: string[];
  firstSeen: string;
}

export interface Recommendation {
  id: string;
  operatorId: string;
  staffId: string;
  touristId: string;
  category: string;
  area: string;
  channel: string;
  stage: string;
  opened: boolean;
  gotDirections: boolean;
  confirmedVisit: boolean;
  loggedSpend: boolean;
  rating: number | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  recommendationId: string;
  operatorId: string;
  staffId: string;
  touristId: string;
  spendTHB: number;
  currency: string;
  commissionTHB: number;
  localEconomicImpactTHB: number;
  paymentMethod: string;
  confirmedAt: string;
}

export interface AreaPoint {
  area: string;
  x: number;
  y: number;
}

export interface LomaData {
  operators: CatalogProvider[];
  staff: StaffMember[];
  tourists: TouristProfile[];
  recommendations: Recommendation[];
  transactions: Transaction[];
  areas: AreaPoint[];
}

export type IconName =
  | "search" | "pin" | "share" | "check" | "verified" | "star" | "back"
  | "heart" | "heartFill" | "nav" | "phone" | "clock" | "home" | "map"
  | "list" | "bookmark" | "user" | "qr" | "spark" | "copy";

export type Persona = "staff" | "tourist" | "provider" | "community" | "admin";
