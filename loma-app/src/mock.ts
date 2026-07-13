// Typed access layer over the extracted prototype mock data.
// Personas read from here; swapping a source to real data is a one-line change.
import providersMock from "./data/mock/providers.mock.json";
import categoriesRaw from "./data/mock/categories.json";
import guestReviewsRaw from "./data/mock/guestReviews.json";
import accountsRaw from "./data/mock/accounts.json";
import lomaDataRaw from "./data/mock/lomaData.json";
import type {
  CatalogProvider,
  Category,
  GuestReview,
  Account,
  LomaData,
  StaffMember,
  Recommendation,
  Transaction,
} from "./types";

export const CATALOG_PROVIDERS = providersMock as CatalogProvider[];
export const CATEGORIES = categoriesRaw as Category[];
export const GUEST_REVIEWS = guestReviewsRaw as GuestReview[];
export const ACCOUNTS = accountsRaw as Account[];
export const LOMA = lomaDataRaw as unknown as LomaData;

// operators = the full 50-provider vetted catalog (superset of the 6 rich cards)
export const OPERATORS = LOMA.operators;

export function operator(id: string): CatalogProvider | undefined {
  return OPERATORS.find((o) => o.id === id) || CATALOG_PROVIDERS.find((p) => p.id === id);
}

export function reviewsFor(provId: string): GuestReview[] {
  return GUEST_REVIEWS.filter((r) => r.prov === provId);
}

export function account(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export function catEmoji(cat: string): string {
  return CATEGORIES.find((c) => c[0] === cat)?.[1] || "📍";
}

// ---------- Admin analytics rollups ----------
export const staffMembers: StaffMember[] = LOMA.staff;
export const recommendations: Recommendation[] = LOMA.recommendations;
export const transactions: Transaction[] = LOMA.transactions;

export interface AdminMetrics {
  operators: number;
  staff: number;
  tourists: number;
  recommendations: number;
  confirmedVisits: number;
  conversionRate: number;
  totalSpendTHB: number;
  commissionTHB: number;
  localImpactTHB: number;
  avgRating: number;
}

export function adminMetrics(): AdminMetrics {
  const confirmed = recommendations.filter((r) => r.confirmedVisit).length;
  const rated = recommendations.filter((r) => r.rating != null);
  const totalSpend = transactions.reduce((s, t) => s + t.spendTHB, 0);
  const commission = transactions.reduce((s, t) => s + t.commissionTHB, 0);
  const impact = transactions.reduce((s, t) => s + t.localEconomicImpactTHB, 0);
  return {
    operators: OPERATORS.length,
    staff: staffMembers.length,
    tourists: LOMA.tourists.length,
    recommendations: recommendations.length,
    confirmedVisits: confirmed,
    conversionRate: recommendations.length ? confirmed / recommendations.length : 0,
    totalSpendTHB: totalSpend,
    commissionTHB: commission,
    localImpactTHB: impact,
    avgRating: rated.length
      ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length
      : 0,
  };
}

export function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  return items.reduce((acc, it) => {
    const k = key(it);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function topOperatorsByVisits(n = 8): CatalogProvider[] {
  return [...OPERATORS].sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0)).slice(0, n);
}

export function topStaffByCommission(n = 8): StaffMember[] {
  return [...staffMembers].sort((a, b) => b.commissionTHB - a.commissionTHB).slice(0, n);
}
