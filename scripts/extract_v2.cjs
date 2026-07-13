const fs = require("fs");
const html = fs.readFileSync(
  "C:/Projects/phuket/LOMA-handover/LOMA-handover/LOMA-prototype.html",
  "utf8"
);
function extract(name) {
  const re = new RegExp("const\\s+" + name + "\\s*=\\s*");
  const m = re.exec(html);
  if (!m) { console.log("!! not found:", name); return null; }
  let i = m.index + m[0].length;
  const open = html[i];
  const close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, q = null, esc = false;
  const start = i;
  for (; i < html.length; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (inStr) { if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { i++; break; } }
  }
  try { return eval("(" + html.slice(start, i) + ")"); }
  catch (e) { console.log("!! eval failed", name, e.message); return null; }
}
const dir = "C:/Projects/phuket/loma-app/src/data/v2/";
fs.mkdirSync(dir, { recursive: true });
const names = ["COMMUNITIES", "HOTEL_INFO", "HOTEL_FIELDS", "PARTNERS", "COMMUNITY_ACCOUNTS", "PROVIDER_ACCOUNTS"];
const out = {};
for (const n of names) out[n] = extract(n);
const w = (f, o) => fs.writeFileSync(dir + f, JSON.stringify(o, null, 1));
w("communities.json", out.COMMUNITIES);
w("hotelInfo.json", out.HOTEL_INFO);
w("hotelFields.json", out.HOTEL_FIELDS);
w("partners.json", out.PARTNERS);
w("communityAccounts.json", out.COMMUNITY_ACCOUNTS);
w("providerAccounts.json", out.PROVIDER_ACCOUNTS);
console.log("COMMUNITIES:", out.COMMUNITIES?.length, "sample keys:", out.COMMUNITIES && Object.keys(out.COMMUNITIES[0]));
console.log("PARTNERS:", out.PARTNERS?.length, "sample:", JSON.stringify(out.PARTNERS?.[0]));
console.log("COMMUNITY_ACCOUNTS:", out.COMMUNITY_ACCOUNTS?.length, JSON.stringify(out.COMMUNITY_ACCOUNTS?.[0]));
console.log("HOTEL_INFO keys:", out.HOTEL_INFO && Object.keys(out.HOTEL_INFO));
console.log("community[0]:", JSON.stringify(out.COMMUNITIES?.[0])?.slice(0, 500));
