// The signed-in partner property drives every distance in the app, so the picks
// engine needs to know who is signed in. Personas set this on sign-in; picks are
// memoised per account so the 78 haversine computations happen once each.
import type { RealAccount } from "./types";
import { ACCOUNTS_REAL, DEFAULT_ACCOUNT } from "./accounts";
import { picksFor, type Pick } from "./picks";

let active: RealAccount = DEFAULT_ACCOUNT;
const cache = new Map<string, Pick[]>();

export function setActiveAccount(a: RealAccount): void {
  active = a;
}

export function getActiveAccount(): RealAccount {
  return active;
}

/** Memoised picks for the signed-in property, nearest first. */
export function activePicks(): Pick[] {
  const key = active.id;
  let v = cache.get(key);
  if (!v) {
    v = picksFor(active);
    cache.set(key, v);
  }
  return v;
}

export function activePick(id: string): Pick | undefined {
  return activePicks().find((p) => p.id === id);
}

/** Resolve a community's member-provider ids to full scored Picks (with .ai). */
export function communityMembers(memberIds: string[]): Pick[] {
  return memberIds.map((id) => activePick(id)).filter((p): p is Pick => !!p);
}

export { ACCOUNTS_REAL, DEFAULT_ACCOUNT };
