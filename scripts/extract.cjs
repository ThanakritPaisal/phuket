const fs = require('fs');
const html = fs.readFileSync('C:/Projects/phuket/LOMA-prototype.html', 'utf8');

// balanced extraction of `const NAME = <array|object literal>;`
function extract(name) {
  const re = new RegExp("const\\s+" + name + "\\s*=\\s*");
  const m = re.exec(html);
  if (!m) { console.log("!! not found:", name); return null; }
  let i = m.index + m[0].length;
  const open = html[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, q = null, esc = false;
  const start = i;
  for (; i < html.length; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { i++; break; } }
  }
  const expr = html.slice(start, i);
  try { return eval("(" + expr + ")"); }
  catch (e) { console.log("!! eval failed for", name, e.message); return null; }
}

const out = {};
for (const n of ["PROVIDERS", "CATS", "GUEST_REVIEWS", "ACCOUNTS", "I"]) out[n] = extract(n);

const dm = /window\.LOMA_DATA\s*=\s*(\{[\s\S]*?\});/.exec(html);
out.LOMA_DATA = dm ? JSON.parse(dm[1]) : null;

const dir = 'C:/Projects/phuket/loma-app/src/data/mock/';
const w = (f, o) => fs.writeFileSync(dir + f, JSON.stringify(o, null, 1));
w('providers.mock.json', out.PROVIDERS);
w('categories.json', out.CATS);
w('guestReviews.json', out.GUEST_REVIEWS);
w('accounts.json', out.ACCOUNTS);
w('icons.json', out.I);
w('lomaData.json', out.LOMA_DATA);

console.log("PROVIDERS:", out.PROVIDERS && out.PROVIDERS.length,
  "| CATS:", out.CATS && out.CATS.length,
  "| GUEST_REVIEWS:", out.GUEST_REVIEWS && out.GUEST_REVIEWS.length,
  "| ACCOUNTS:", out.ACCOUNTS && out.ACCOUNTS.length,
  "| ICONS:", out.I ? Object.keys(out.I).length : 0);
console.log("LOMA_DATA keys:", out.LOMA_DATA ? Object.keys(out.LOMA_DATA) : null);
console.log("provider[0] keys:", out.PROVIDERS ? Object.keys(out.PROVIDERS[0]) : null);
console.log("CATS sample:", JSON.stringify(out.CATS && out.CATS.slice(0, 4)));
console.log("GUEST_REVIEWS[0]:", JSON.stringify(out.GUEST_REVIEWS && out.GUEST_REVIEWS[0]));
console.log("ACCOUNTS[0]:", JSON.stringify(out.ACCOUNTS && out.ACCOUNTS[0]));
console.log("ICON keys:", out.I ? Object.keys(out.I).join(",") : null);
