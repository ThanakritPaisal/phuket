#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Swap the 6 hard-coded demo businesses in the phone prototype for 6 REAL Phuket
providers, and replace the invented "guest reviews" with REAL Google reviews.

Real sources (both offline, no live API needed at build time):
  - data/loma-real-data.js        -> real operators w/ GCS images + LOMA scores
  - ../../batch1_enriched.json    -> real Google review text (reviews_text[])

The demo slot ids (BRT, OTH, RFE, KLD, PCH, NYC) are PRESERVED so the stylised
map pins, PINS[], provReviews() and every screen that looks a provider up by id
keep working — only the data behind each slot becomes real.

Idempotent + marker-guarded. Run standalone or from build.sh.
"""
import io, os, re, json
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "LOMA.html")
REAL_JS = os.path.join(HERE, "data", "loma-real-data.js")
BATCH = os.path.join(HERE, "..", "..", "batch1_enriched.json")
MARKER = "/* REAL-PROTOTYPE wired */"

# demo slot -> (category to draw a real provider from, keep this pick flag)
SLOTS = [
    ("BRT", "Local Food",               True),
    ("OTH", "Massage & Wellness",       False),
    ("RFE", "Community Experience",     True),
    ("KLD", "Café",                     False),
    ("PCH", "Souvenir & Local Product", False),
    ("NYC", "Community Experience",     False),
]

# fields copied from a real operator into a prototype provider slot
KEEP = ["name", "cat", "emo", "area", "dist", "price", "priceText", "open",
        "hours", "local", "verified", "quality", "locality", "readiness",
        "safety", "rating", "reviews", "branches", "lang", "booking",
        "contact", "reason", "whyLocal", "note", "bestFor", "img", "sum",
        "loma_score"]


def load_real():
    js = io.open(REAL_JS, encoding="utf-8").read()
    m = re.search(r"window\.LOMA_DATA\s*=\s*(\{.*\});", js, re.S)
    return json.loads(m.group(1))["operators"]


def load_reviews():
    batch = json.load(io.open(BATCH, encoding="utf-8"))
    return {x["id"]: x["reviews_text"] for x in batch if x.get("reviews_text")}


def pick_providers(ops, reviews):
    by_id = {o["id"]: o for o in ops}
    used_id, used_name = set(), set()

    def pick(cat, lo, hi, minrat):
        c = [o for i, o in by_id.items()
             if i in reviews and o["cat"] == cat
             and "storage.googleapis" in (o.get("img") or "")
             and o.get("local") and o.get("rating", 0) >= minrat
             and lo <= o.get("reviews", 0) <= hi
             and i not in used_id and o["name"].strip().lower() not in used_name]
        c.sort(key=lambda o: (o.get("loma_score", 0), o.get("rating", 0)), reverse=True)
        return c[0] if c else None

    chosen = {}
    for sid, cat, pickflag in SLOTS:
        # tiers: credible local first, relax gradually so every slot fills
        o = (pick(cat, 40, 800, 4.4) or pick(cat, 20, 1500, 4.2)
             or pick(cat, 5, 4000, 4.0) or pick(cat, 1, 10 ** 9, 0))
        if o is None:
            raise SystemExit("no real provider for slot %s (%s)" % (sid, cat))
        used_id.add(o["id"]); used_name.add(o["name"].strip().lower())
        chosen[sid] = o
    return chosen


def clean(text):
    """Collapse newlines/whitespace and drop control chars so the string is
    safe to embed as a JS/JSON literal and reads as one flowing paragraph."""
    text = re.sub(r"[\x00-\x1f\x7f-\x9f]+", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def when_label(iso):
    try:
        return datetime.strptime(iso[:7], "%Y-%m").strftime("%b %Y")
    except Exception:
        return "recently"


def build_providers(chosen):
    out = []
    for sid, cat, pickflag in SLOTS:
        o = chosen[sid]
        p = {"id": sid, "pick": pickflag}
        for k in KEEP:
            if k in o:
                p[k] = o[k]
        # keep a stable, category-appropriate emoji even if the real one is blank
        p.setdefault("emo", "📍")
        out.append(p)
    return out


def build_reviews(chosen, reviews, per=5):
    out = []
    for sid, cat, pickflag in SLOTS:
        rid = chosen[sid]["id"]
        for r in (reviews.get(rid) or []):
            text = clean(r.get("text") or "")
            if not text:
                continue
            stars = int(round(r.get("rating") or chosen[sid].get("rating") or 5))
            stars = max(1, min(5, stars))
            comment = text if len(text) <= 240 else text[:237].rstrip() + "…"
            out.append({
                "prov": sid,
                "stars": stars,
                "when": when_label(r.get("time") or ""),
                "tags": [],                       # no fabricated tags
                "comment": comment,
                "photos": 0,                      # no fabricated photos
                "ctx": (r.get("author") or "Google reviewer") + " · Google review",
            })
            if sum(1 for x in out if x["prov"] == sid) >= per:
                pass
        # cap per provider
    # enforce cap deterministically
    capped, seen = [], {}
    for r in out:
        seen[r["prov"]] = seen.get(r["prov"], 0)
        if seen[r["prov"]] < per:
            capped.append(r); seen[r["prov"]] += 1
    return capped


def js_array(name, rows):
    body = ",\n  ".join(json.dumps(r, ensure_ascii=False) for r in rows)
    return "const %s = [\n  %s\n];" % (name, body)


def main():
    s = io.open(HTML, encoding="utf-8").read()
    if MARKER in s:
        print("_wire_real_prototype: already wired — skipping")
        return

    ops = load_real()
    reviews = load_reviews()
    chosen = pick_providers(ops, reviews)

    providers = build_providers(chosen)
    guest = build_reviews(chosen, reviews)

    # 1) replace the demo PROVIDERS array
    new_prov = MARKER + "\n" + js_array("PROVIDERS", providers)
    s, n1 = re.subn(r"const PROVIDERS = \[.*?\n\];", new_prov, s, count=1, flags=re.S)

    # 2) replace the invented GUEST_REVIEWS array with real Google reviews
    new_rev = js_array("GUEST_REVIEWS", guest)
    s, n2 = re.subn(r"const GUEST_REVIEWS = \[.*?\n\];", new_rev, s, count=1, flags=re.S)

    # 3) provider profile gallery: drop the two loremflickr fillers, use the real photo
    s, n3 = re.subn(
        r"const photos=\[p\.img, `https://loremflickr\.com/300/300/\$\{kw\}\?lock=21`, `https://loremflickr\.com/300/300/\$\{kw\}\?lock=42`\];",
        "const photos=[p.img].filter(Boolean);",
        s, count=1)

    # 4) Google "import" flow -> real Google Places (backend /places/search).
    #    GOOGLE_RESULTS stays as an offline fallback if the API is unreachable.
    gsearch_js = (
        "const gSrch=e.target.closest('[data-gsearch]');\n"
        "  if(gSrch){const q=(document.getElementById('gquery').value||'').trim();"
        "const box=document.getElementById('gresults');\n"
        "    const render=(res)=>{state.gResults=res;box.innerHTML=res.length?`<div style=\"margin-top:10px;display:flex;flex-direction:column;gap:8px\">${res.map((r,i)=>`<div class=\"prow\" data-gpick=\"${i}\" style=\"margin:0;cursor:pointer;background:var(--surface)\"><div data-photo=\"${r.img||''}\" data-emo=\"📍\" style=\"width:48px;height:48px;border-radius:9px;flex:none\"></div><div class=\"info\"><h3 style=\"font-size:13px\">${r.name}</h3><div class=\"m\" style=\"font-size:11px\">${r.rating}★ (${r.reviews}) · ${r.cat} · ${r.area}</div></div><div style=\"font-size:11px;color:var(--primary);font-weight:700;align-self:center\">Import</div></div>`).join('')}</div>`:`<div style=\"margin-top:10px;color:var(--muted);font-size:12px\">No matches on Google for “${q}”.</div>`;hydratePhotos(box);};\n"
        "    if(q.length<2){render(GOOGLE_RESULTS);return;}\n"
        "    box.innerHTML=`<div style=\"margin-top:10px;color:var(--muted);font-size:12px\">Searching Google…</div>`;\n"
        "    fetch(_LOMA_API_BASE+'/places/search?q='+encodeURIComponent(q)).then(x=>x.ok?x.json():Promise.reject()).then(render).catch(()=>render(GOOGLE_RESULTS.filter(r=>r.name.toLowerCase().includes(q.toLowerCase()))));\n"
        "    return;}"
    )
    s, n4 = re.subn(
        r"const gSrch=e\.target\.closest\('\[data-gsearch\]'\);[\s\S]*?hydratePhotos\(box\);return;\}",
        lambda m: gsearch_js, s, count=1)

    gpick_js = (
        "const gPick=e.target.closest('[data-gpick]');\n"
        "  if(gPick){const list=(state.gResults&&state.gResults.length)?state.gResults:GOOGLE_RESULTS;"
        "const r=list[+gPick.dataset.gpick];state.provReg.imported=r;state.provReg.cat=r.cat;"
        "state.provReg.area=r.area;state.provReg.googleClaimed=true;renderProvider();"
        "toast('Imported \"'+r.name+'\" from Google');return;}"
    )
    s, n5 = re.subn(
        r"const gPick=e\.target\.closest\('\[data-gpick\]'\);[\s\S]*?from Google'\);return;\}",
        lambda m: gpick_js, s, count=1)

    if not (n1 and n2 and n4 and n5):
        raise SystemExit("_wire_real_prototype: anchor not found (n1=%s n2=%s n4=%s n5=%s)" % (n1, n2, n4, n5))

    io.open(HTML, "w", encoding="utf-8", newline="").write(s)
    print("_wire_real_prototype: %d providers, %d real reviews, gallery=%d, google-import=%d/%d" % (len(providers), len(guest), n3, n4, n5))
    for sid, cat, _ in SLOTS:
        o = chosen[sid]
        print("   %s <- %-8s %-34s %s* %srv" % (sid, o["id"], o["name"][:34], o.get("rating"), o.get("reviews")))


if __name__ == "__main__":
    main()
