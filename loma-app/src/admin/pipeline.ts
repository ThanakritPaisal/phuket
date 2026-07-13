// Admin AI-curation helpers — the review pipeline over our REAL scored providers.
// Ported from the v2 prototype's hiddenGems / candidatesBySource / reviewQueue /
// queueReason / readinessLevel, but reading each Pick's .ai AiScore rather than the
// prototype's flat provider object. All functions run over activePicks().
import { activePicks } from "../activeAccount";
import type { Pick } from "../picks";
import type { ProviderStatus, SourceType } from "../scoring";

// Resolve a pick's *effective* status: an admin override (approve/reject/…) wins
// over the AI engine's computed status. Views pass a resolver so approvals move
// cards between buckets live.
export type StatusOf = (p: Pick) => ProviderStatus;
export const aiStatus: StatusOf = (p) => p.ai.status;

// Order + copy for the four discovery channels (SOURCE_TYPES isn't exported by
// scoring, so we re-declare the order; SRC_LABEL comes from scoring).
export const SOURCE_TYPES: SourceType[] = [
  "ai_discovered",
  "hotel_nominated",
  "community_nominated",
  "self_registered",
  "admin_added",
];

export const SRC_NOTE: Record<SourceType, string> = {
  ai_discovered:
    "Imported from public data — Google Maps, reviews, social signals, open data.",
  hotel_nominated:
    "A hotel or frontline staff member suggested a place they already recommend.",
  community_nominated:
    "A community leader, association or tourism partner put this forward.",
  self_registered:
    "The business or community submitted its own profile / readiness form.",
  admin_added: "Added directly by a LOMA operator.",
};

// Prototype STATUS_COLOR — maps a status to a badge class.
export const STATUS_COLOR: Record<ProviderStatus, string> = {
  candidate: "b-price",
  ai_shortlisted: "b-pick",
  needs_human_review: "b-warn",
  verified: "b-verified",
  rejected: "b-warn",
  suspended: "b-warn",
};

// Hidden Gem = quality under-discovered, not popular. Highest LOMA score first.
export function hiddenGems(): Pick[] {
  return activePicks()
    .filter((p) => p.ai.is_hidden_gem)
    .sort((a, b) => b.ai.overall_loma_score - a.ai.overall_loma_score);
}

// Open candidates from one discovery channel (verified ones have left the queue).
export function candidatesBySource(src: SourceType, statusOf: StatusOf = aiStatus): Pick[] {
  return activePicks().filter(
    (p) => p.ai.source_type === src && statusOf(p) !== "verified"
  );
}

export const srcCount = (src: SourceType, statusOf: StatusOf = aiStatus) =>
  candidatesBySource(src, statusOf).length;

// Everything a human needs to touch: flagged for review, risky, or gone stale.
export function reviewQueue(statusOf: StatusOf = aiStatus): Pick[] {
  return activePicks()
    .filter(
      (p) =>
        statusOf(p) === "needs_human_review" ||
        p.ai.freshness_status !== "fresh" ||
        p.ai.review_signal_status === "risk_detected" ||
        p.ai.readiness_score < 62
    )
    .sort(
      (a, b) =>
        b.ai.risk_score - a.ai.risk_score ||
        b.ai.overall_loma_score - a.ai.overall_loma_score
    );
}

// Why a provider sits in the review queue — [label, badge class].
export function queueReason(p: Pick): [string, string] {
  const ai = p.ai;
  if (ai.review_signal_status === "risk_detected" || ai.risk_score >= 45)
    return ["Risk detected", "b-warn"];
  if (ai.readiness_score < 62) return ["Incomplete readiness", "b-price"];
  if (ai.freshness_status === "stale") return ["Stale data", "b-warn"];
  if (ai.freshness_status === "needs_refresh") return ["Needs refresh", "b-price"];
  return ["Human review", "b-price"];
}

export const QUEUE_REASONS = [
  "All",
  "Risk detected",
  "Incomplete readiness",
  "Stale data",
  "Needs refresh",
  "Human review",
] as const;

// Community-experience onboarding readiness 0–3.
export function readinessLevel(p: Pick, statusOf: StatusOf = aiStatus): number {
  if (statusOf(p) === "verified" && p.ai.readiness_score >= 80) return 3;
  if (p.ai.readiness_score >= 70) return 2;
  if (p.contact) return 1;
  return 0;
}

export function verifiedProviders(statusOf: StatusOf = aiStatus): Pick[] {
  return activePicks()
    .filter((p) => statusOf(p) === "verified")
    .sort((a, b) => b.ai.overall_loma_score - a.ai.overall_loma_score);
}

export function communityExperiences(statusOf: StatusOf = aiStatus): Pick[] {
  return activePicks()
    .filter((p) => p.ai.is_community_experience)
    .sort(
      (a, b) =>
        readinessLevel(b, statusOf) - readinessLevel(a, statusOf) ||
        b.ai.overall_loma_score - a.ai.overall_loma_score
    );
}
