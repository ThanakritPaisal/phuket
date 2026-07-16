import { createContext, useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import Icon from "../components/Icon";
import { operator } from "../mock";
import { activePick, activePicks } from "../activeAccount";
import { CAT_EMO, type Pick } from "../picks";
import { rainyOk } from "../attributes";
import type { RecList } from "../recommendations";
import type { Account, CatalogProvider, RealAccount } from "../types";

/* ============================================================
   Types
   ============================================================ */
export type StaffScreen =
  | "home"
  | "results"
  | "detail"
  | "recent"
  | "saved"
  | "reviews"
  | "settings"
  | "route"
  | "halfday"
  | "getverified"
  | "recommend"
  | "impact"
  | "qrlink"
  | "match";

export type AuthScreen =
  | "login"
  | "rolePick"
  | "regIndividual"
  | "regOrg"
  | "regStaff"
  | "pending";

export type PlaceKind = "property" | "elsewhere";
export type PlanKind = "route" | "halfday" | "custom";

export interface Filter {
  intent: string;
  cat: string | null;
  cats: string[] | null;
  place: PlaceKind;
  destArea: string | null;
  time: "now" | "any";
  openNow: boolean;
  maxMin: number | null;
  budget: string | null;
  family: boolean;
  rainy: boolean;
  halfday: boolean;
  sort: string;
  mode: "standard" | "route" | "halfday";
}

export type Modal =
  | { kind: "share"; id: string }
  | { kind: "shareset" }
  | { kind: "counterqr" }
  | null;

export interface StaffCtx {
  partner: RealAccount;
  saved: Set<string>;
  filter: Filter;
  routeDest: string;
  routeCats: string[];
  hd: { budget: string; group: string };
  ssMode: "auto" | "house";
  shareDeselect: Set<string>;
  planKind: PlanKind;
  curProv: string;
  curList: RecList | null;
  setCurList: (rl: RecList | null) => void;
  go: (s: StaffScreen) => void;
  setFilter: (patch: Partial<Filter>) => void;
  applyIntent: (name: string) => void;
  openProv: (id: string) => void;
  toggleSave: (id: string) => void;
  openModal: (m: Modal) => void;
  closeModal: () => void;
  setRouteDest: (d: string) => void;
  toggleRouteCat: (c: string) => void;
  setHd: (patch: Partial<{ budget: string; group: string }>) => void;
  setSsMode: (m: "auto" | "house") => void;
  toggleDeselect: (id: string) => void;
  selectAllSaved: () => void;
  setPlanKind: (k: PlanKind) => void;
  markRecommended: () => void;
  signOut: () => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<StaffCtx | null>(null);
export const StaffProvider = Ctx.Provider;
export function useStaff(): StaffCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStaff must be used inside StaffProvider");
  return c;
}

/* ============================================================
   Data + constants
   ============================================================ */
export const AREA_XY: Record<string, [number, number]> = {
  Patong: [58, 60],
  Kata: [50, 74],
  Karon: [52, 70],
  Rawai: [54, 82],
  Chalong: [60, 72],
  "Old Town": [62, 46],
  "Bang Tao": [44, 34],
  "Nai Yang": [40, 20],
};
export const AREAS = Object.keys(AREA_XY);

/** "Around this property" radius, in km, measured from the signed-in partner. */
export const PROPERTY_RADIUS_KM = 5;

/**
 * Official subdistricts (tambon) that actually have providers, with counts — powers the
 * "Somewhere else" picker. Derived from real data, so a chip can never be a dead end
 * (unlike the old hardcoded tourist-zone list, where "Nai Yang" matched nothing).
 */
export function tambonsWithCounts(): { tambon: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of activePicks()) {
    if (p.tambon) counts.set(p.tambon, (counts.get(p.tambon) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tambon, count]) => ({ tambon, count }))
    .sort((a, b) => b.count - a.count || a.tambon.localeCompare(b.tambon));
}

// Quick-intent chips, aligned to the canonical category taxonomy (src/categories.ts).
// Café now targets the real "Café & Dessert" category, Boat & Sea is added, and the
// unbacked "Family Friendly" chip (no data signal ever existed) is removed.
export const INTENTS = [
  "Local Food 🍜",
  "Seafood 🦐",
  "Street Food 🍲",
  "Café ☕",
  "Massage & Spa 💆",
  "Souvenir 🎁",
  "Local Experience 🛶",
  "Boat & Sea ⛵",
  "Rainy Day 🌧",
  "Open Now 🟢",
];

const INTENT_MAP: Record<string, Partial<Filter>> = {
  "Local Food": { cat: "Local Food" },
  Seafood: { cat: "Seafood" },
  "Street Food": { cat: "Street Food & Noodles" },
  Café: { cat: "Café & Dessert" },
  "Massage & Spa": { cat: "Massage & Wellness" },
  Souvenir: { cat: "Souvenir & Local Product" },
  "Local Experience": { cat: "Community Experience" },
  "Boat & Sea": { cat: "Boat / Sea" },
  "Rainy Day": { rainy: true },
  "Open Now": { openNow: true },
};

const EXPERIENCE_CATS = [
  "Community Experience",
  "Cooking Class",
  "Local Market",
  "Local Guide",
  "Boat / Sea",
];

export function intentLabel(s: string): string {
  return String(s)
    .replace(/\s[^\w\s&].*$/, "")
    .trim();
}

export function intentPatch(name: string): Partial<Filter> {
  const label = intentLabel(name);
  const base: Partial<Filter> = {
    intent: label,
    cat: null,
    cats: null,
    rainy: false,
    family: false,
    openNow: false,
    mode: "standard",
  };
  return { ...base, ...(INTENT_MAP[label] || {}) };
}

export function prov(id: string): CatalogProvider {
  // Real Google-enriched picks first (distance computed from the signed-in
  // property); fall back to the mock catalog for legacy ids (e.g. guest reviews).
  return (activePick(id) ?? (operator(id) as CatalogProvider)) as CatalogProvider;
}

function distMin(o: CatalogProvider): number {
  // Real picks carry exact minutes; mock rows still encode it in the dist string.
  const m = (o as Partial<Pick>).minutes;
  if (typeof m === "number") return m;
  const s = String(o.dist).match(/\d+/);
  return s ? +s[0] : 99;
}

export function catEmo(cat: string): string {
  return CAT_EMO[cat] || "📍";
}

export function placeLabel(f: Filter, partner: Account): string {
  if (f.place === "property") return "around " + partner.name;
  return "near " + (f.destArea || "chosen area");
}

export interface FilterOpts extends Partial<Filter> {}

export function filterCatalog(base: Filter, opts?: FilterOpts): CatalogProvider[] {
  const f = { ...base, ...(opts || {}) };
  // Real providers, with distance computed live from the signed-in property.
  let list: CatalogProvider[] = activePicks().slice();
  if (f.cat) list = list.filter((o) => o.cat === f.cat);
  if (f.cats && f.cats.length) list = list.filter((o) => f.cats!.includes(o.cat));
  if (f.family) list = list.filter((o) => (o.bestFor || []).some((t) => /famil|kid/i.test(t)));
  if (f.rainy) list = list.filter((o) => rainyOk((o as Pick).setting, o.cat));
  if (f.halfday) list = list.filter((o) => EXPERIENCE_CATS.includes(o.cat));
  if (f.openNow) list = list.filter((o) => o.open);
  if (f.maxMin) list = list.filter((o) => distMin(o) <= f.maxMin!);
  if (f.budget === "low") list = list.filter((o) => o.price === "฿");
  if (f.budget === "low-med") list = list.filter((o) => o.price === "฿" || o.price === "฿฿");
  // WHERE?
  //  "Around this property" = a real radius from the signed-in property.
  //  "Somewhere else"       = the whole island, narrowed to one official subdistrict.
  // NB: no silent fallback — if a subdistrict has no matches we return an empty list
  // rather than quietly showing the entire catalog (which used to happen).
  if (f.place === "property") {
    list = list.filter((o) => (o as Pick).km <= PROPERTY_RADIUS_KM);
  } else if (f.place === "elsewhere" && f.destArea) {
    list = list.filter((o) => (o as Pick).tambon === f.destArea);
  }
  const S: Record<string, (a: CatalogProvider, b: CatalogProvider) => number> = {
    match: (a, b) => (b.loma_score || b.quality) - (a.loma_score || a.quality),
    nearest: (a, b) => distMin(a) - distMin(b),
    local: (a, b) => b.locality - a.locality,
    readiness: (a, b) => b.readiness - a.readiness,
    pick: (a, b) => (Number(!!b.pick) - Number(!!a.pick)) || b.quality - a.quality,
  };
  list.sort(S[f.sort] || S.match);
  return list;
}

export function routeStops(base: Filter, routeCats: string[]): CatalogProvider[] {
  return filterCatalog(base, {
    cats: routeCats,
    cat: null,
    family: false,
    rainy: false,
    openNow: false,
    budget: null,
    sort: "nearest",
  });
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

export function levelLabel(a: Account): string {
  return (
    (
      { verified: "Verified Partner", org: "Registered Organization", individual: "Registered User" } as Record<
        string,
        string
      >
    )[a.level] || "Registered User"
  );
}

export function attribution(a: Account): string {
  if (!a) return "Shared via LOMA";
  if (a.level === "verified") {
    if (a.kind === "org" || a.kind === "org-staff") return "Recommended by " + a.name;
    const r = a.type || "";
    if (/driver|taxi|transfer/i.test(r)) return "Shared by a verified LOMA driver";
    if (/guide/i.test(r)) return "Shared by a verified LOMA guide";
    return "Recommended by " + a.name;
  }
  return "Shared via LOMA";
}

/* ============================================================
   Presentational helpers
   ============================================================ */
export function bg(img?: string): CSSProperties {
  return img ? { backgroundImage: `url(${img})` } : {};
}

export function LocalBadge() {
  return <span className="badge b-local">🌿 Local</span>;
}

export function VerifiedBadge({ p }: { p: CatalogProvider }) {
  return p.verified ? (
    <span className="badge b-verified">
      <Icon name="verified" size={12} /> Verified
    </span>
  ) : (
    <span className="badge b-closed">Pending</span>
  );
}

export function OpenStatus({ open }: { open: boolean }) {
  return open ? (
    <span className="badge b-open">
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }}
      />
      Open now
    </span>
  ) : (
    <span className="badge b-closed">Closed</span>
  );
}

export function ScoreBadge({ label, v }: { label: string; v: number }) {
  return (
    <span className="score">
      <span className="ring" style={{ ["--v" as never]: v } as CSSProperties}>
        <i>{v}</i>
      </span>
      {label}
    </span>
  );
}

export function StaffAppbar() {
  const { partner, go } = useStaff();
  return (
    <div className="appbar">
      <div className="row1">
        <img src="/loma-navy.png" alt="LOMA" className="wordmark-sm" />
        <div className="where">
          <div className="t">Recommending from</div>
          <div className="p">
            <Icon name="pin" size={15} /> {partner.name}
          </div>
        </div>
        <div className="avatar" title={partner.staff} onClick={() => go("settings")}>
          {partner.staffInit}
        </div>
      </div>
    </div>
  );
}

const TABS: [StaffScreen, Parameters<typeof Icon>[0]["name"], string][] = [
  ["home", "search", "Find"],
  ["recommend", "spark", "Recommend"],
  ["saved", "bookmark", "Saved"],
  ["impact", "star", "Impact"],
  ["reviews", "heart", "Reviews"],
  ["settings", "user", "Partner"],
];

// Sub-screens that light up a parent tab in the bar.
const TAB_ROOT: Partial<Record<StaffScreen, StaffScreen>> = {
  results: "home",
  detail: "home",
  recent: "home",
  route: "home",
  halfday: "home",
  getverified: "home",
};

export function StaffTabbar({ active }: { active: StaffScreen }) {
  const { go } = useStaff();
  const root = TAB_ROOT[active] ?? active;
  return (
    <div className="tabbar">
      {TABS.map(([s, ic, l]) => (
        <button key={s} className={root === s ? "on" : ""} onClick={() => go(s)}>
          <span className="ic">
            <Icon name={ic} size={21} />
          </span>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Wraps a screen body with the sticky appbar + tabbar (mirrors the prototype's #staffScroll). */
export function Screen({ active, children }: { active: StaffScreen; children: ReactNode }) {
  return (
    <div className="scroll">
      <StaffAppbar />
      <div className="pad">{children}</div>
      <StaffTabbar active={active} />
    </div>
  );
}

export function MapSVG() {
  return (
    <svg className="water" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2de" />
          <stop offset="1" stopColor="#bcd6d0" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sea)" />
      <g opacity=".5" stroke="#a9c6bf" strokeWidth="1" fill="none">
        <path d="M0 70 H400 M0 140 H400 M0 210 H400 M80 0 V300 M180 0 V300 M280 0 V300" />
      </g>
      <path
        d="M150 10 C 200 20, 230 60, 225 110 C 250 150, 245 210, 210 250 C 190 280, 150 285, 140 250 C 120 220, 130 180, 120 150 C 110 110, 120 50, 150 10 Z"
        fill="#d9e6cf"
        stroke="#b6cdae"
        strokeWidth="2"
      />
      <path d="M225 110 C 260 120, 270 150, 255 175" fill="none" stroke="#b6cdae" strokeWidth="2" />
      <g stroke="#e7c98f" strokeWidth="3" strokeLinecap="round" opacity=".8">
        <path d="M150 30 L 200 120 L 180 230" />
        <path d="M160 150 L 225 140" />
      </g>
      <circle cx="200" cy="120" r="3" fill="#9bb892" />
      <circle cx="180" cy="230" r="3" fill="#9bb892" />
    </svg>
  );
}
