// v2 mock data (communities, partners, hotel info, community-host logins),
// extracted verbatim from LOMA-handover/LOMA-prototype.html.
import { assetUrl } from "./assets";
import communitiesRaw from "./data/v2/communities.json";
import hotelInfoRaw from "./data/v2/hotelInfo.json";
import hotelFieldsRaw from "./data/v2/hotelFields.json";
import partnersRaw from "./data/v2/partners.json";
import communityAccountsRaw from "./data/v2/communityAccounts.json";

export interface Community {
  id: string;
  name: string; // Thai (primary)
  nameEn: string; // English gloss
  area: string;
  emo: string;
  img: string | null; // a real member-provider photo, or null
  about: string;
  activities: string[];
  memberIds: string[]; // real member providers (join on the seed `community` field)
  priceFrom: string;
  duration: string;
  schedule: string[];
  phone: string;
  lat: number | null; // median of member businesses' coordinates
  lng: number | null;
}
export interface PartnerStat {
  name: string;
  type: string;
  area: string;
  recs: number;
  opens: number;
  visits: number;
}
export interface CommunityAccount {
  user: string;
  pass: string;
  commId: string;
  person: string;
}

// Community hero images point at a member provider's photo ("/providers/*.jpg");
// resolve to the hosted bucket URL, same as everything else.
export const COMMUNITIES = (communitiesRaw as Community[]).map((c) => ({
  ...c,
  img: assetUrl(c.img),
}));
export const HOTEL_INFO = hotelInfoRaw as Record<string, string>;
export const HOTEL_FIELDS = hotelFieldsRaw as [string, string][];
export const PARTNERS = partnersRaw as PartnerStat[];
export const COMMUNITY_ACCOUNTS = communityAccountsRaw as CommunityAccount[];

export function community(id: string): Community | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}

export const READINESS_LEVELS = [
  "Information Only",
  "Contactable",
  "Ready to Recommend",
  "Verified Community Experience",
];

// A community's on-boarding readiness (0–3). Deterministic per community.
export function commReady(c: Community): number {
  // Flagship communities with real member providers + a full programme read as
  // fully verified experiences; memberless ones (Kathu, Ban Sakhu) are contactable.
  if (/bang-rong|old-town|koh-maprao/.test(c.id) && c.memberIds.length > 0) return 3;
  if (c.memberIds.length > 0 && c.activities.length >= 3) return 2;
  if (c.phone) return 1;
  return 0;
}

export const UNDER_SERVED = [
  "Mai Khao",
  "Thalang",
  "Nai Yang",
  "Cape Panwa",
  "Kathu",
  "Rawai",
  "Koh Lone",
  "Bang Rong",
  "Pa Khlok",
];
