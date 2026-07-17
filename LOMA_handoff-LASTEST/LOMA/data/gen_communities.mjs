#!/usr/bin/env node
/**
 * gen_communities.mjs — replace LOMA.html's 6 fabricated demo communities with the
 * 10 REAL communities loma-app renders, so the production prototype shows the same
 * community "place data" (ids, names, areas, images, activities) as loma-app.
 *
 * Source of truth (identical to what loma-app loads):
 *   loma-app/src/data/v2/communities.json        -> the 10 communities
 *   loma-app/src/data/v2/communityAccounts.json  -> the 6 community-host logins
 *
 * It maps each loma-app Community into the shape LOMA.html's community screens use
 * ({id,name,area,emo,img,about,activities,priceFrom,duration,schedule,phone}), resolves
 * images against the SAME asset bucket loma-app uses (assets.ts), and rewrites the
 * hardcoded `const COMMUNITIES = [...]` and `const COMMUNITY_ACCOUNTS=[...]` arrays.
 * Because the new ids are the real ones (bang-rong, kamala, old-town…), community
 * bookings now unify with loma-app + the DB-backed booking API.
 *
 * UI/markup/JS logic are untouched. Idempotent (a re-run just rewrites the arrays).
 * Run:  node data/gen_communities.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../../..");
const V2 = resolve(REPO, "loma-app/src/data/v2");
const HTML_PATH = resolve(__dirname, "../LOMA.html");

// Same bucket + resolution as loma-app/src/assets.ts (assetUrl).
const ASSET_BASE = "https://storage.googleapis.com/gradient-digital-group-loma-assets";
const assetUrl = (p) => (!p ? "" : /^https?:\/\//.test(p) ? p : ASSET_BASE + (p.startsWith("/") ? p : "/" + p));

const communities = JSON.parse(readFileSync(resolve(V2, "communities.json"), "utf8"));
const accounts = JSON.parse(readFileSync(resolve(V2, "communityAccounts.json"), "utf8"));

/* Map a loma-app community -> the prototype's community shape. The prototype shows a
   single English name; the areas/about/activities carry the same text loma-app shows.
   `rounds` is set explicitly so the prototype's id-specific round defaults never apply
   (and so booking slots stay stable). */
const toProto = (c) => ({
  id: c.id,
  name: c.nameEn || c.name,
  area: c.area,
  emo: c.emo,
  img: assetUrl(c.img),
  about: c.about,
  activities: c.activities,
  priceFrom: c.priceFrom,
  duration: c.duration,
  schedule: c.schedule,
  phone: c.phone,
  rounds: ["09:00", "13:00"],
});

const COMMUNITIES = communities.map(toProto);

// Prototype host logins = loma-app's, verbatim (all commIds resolve to a real community).
const COMMUNITY_ACCOUNTS = accounts.map((a) => ({
  user: a.user, pass: a.pass, commId: a.commId, person: a.person,
}));

// Sanity: every host account must point at a community that exists.
const ids = new Set(COMMUNITIES.map((c) => c.id));
for (const a of COMMUNITY_ACCOUNTS) {
  if (!ids.has(a.commId)) throw new Error(`account ${a.user} -> unknown commId ${a.commId}`);
}

let html = readFileSync(HTML_PATH, "utf8");

function replaceOnce(src, re, repl, label) {
  const m = src.match(re);
  if (!m) throw new Error(`anchor not found: ${label}`);
  if (src.match(new RegExp(re.source, re.flags + "g")).length !== 1)
    throw new Error(`anchor not unique: ${label}`);
  return src.replace(re, () => repl);
}

const commBlock = "const COMMUNITIES = " + JSON.stringify(COMMUNITIES, null, 2) + ";";
const acctBlock = "const COMMUNITY_ACCOUNTS = " + JSON.stringify(COMMUNITY_ACCOUNTS, null, 2) + ";";

html = replaceOnce(html, /const COMMUNITIES = \[[\s\S]*?\n\];/, commBlock, "COMMUNITIES");
html = replaceOnce(html, /const COMMUNITY_ACCOUNTS\s*=\s*\[[\s\S]*?\n\];/, acctBlock, "COMMUNITY_ACCOUNTS");

writeFileSync(HTML_PATH, html, "utf8");

console.log(JSON.stringify({
  communities: COMMUNITIES.length,
  ids: COMMUNITIES.map((c) => c.id),
  host_accounts: COMMUNITY_ACCOUNTS.map((a) => `${a.user}->${a.commId}`),
  images_resolved: COMMUNITIES.filter((c) => c.img).length,
}, null, 2));
