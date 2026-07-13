// Minimal reactive store for the v2 in-memory engines (tracking events,
// recommendation lists, bookings, approvals). Mirrors the prototype's mutable
// module state, but lets React components re-render on change via useSyncExternalStore.
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

/** Notify all subscribers that mutable engine state changed. */
export function emitChange(): void {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Re-render the calling component whenever any engine emits a change.
 *  `selector` returns a primitive/stable value used as the snapshot. */
export function useStoreValue<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}

/** Bump this to force a re-read of the engines (they mutate arrays in place). */
let version = 0;
export function bumpVersion(): void {
  version++;
  emitChange();
}
export function useVersion(): number {
  return useStoreValue(() => version);
}
