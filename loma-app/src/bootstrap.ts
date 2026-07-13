// One-time seed so the impact dashboard is non-zero on load, using our REAL
// scored providers (hidden gems, community experiences, ordinary verified).
import { activePicks } from "./activeAccount";
import { seedImpact } from "./impact";

export function bootstrapImpact(): void {
  const picks = activePicks();
  const gems = picks.filter((p) => p.ai.is_hidden_gem).map((p) => p.id);
  const comm = picks.filter((p) => p.ai.is_community_experience).map((p) => p.id);
  const norm = picks
    .filter((p) => p.ai.is_verified && !p.ai.is_hidden_gem && !p.ai.is_community_experience)
    .map((p) => p.id);
  seedImpact(gems, comm, norm);
}
