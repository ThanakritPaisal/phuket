#!/usr/bin/env python3
"""One-shot patcher: make LOMA.html's Community data identical to loma-app.

Reads loma-app's own community data (the source of truth) and rewrites the demand-side
COMMUNITIES catalog + the community-host logins in LOMA.html to match it exactly:

  loma-app/src/data/v2/communities.json        -> const COMMUNITIES
  loma-app/src/data/v2/communityAccounts.json  -> const COMMUNITY_ACCOUNTS

The 10 real Phuket CBT communities — Thai `name` (primary), English `nameEn` gloss, real
member-provider `img` (resolved to the hosted bucket), `memberIds`, coordinates, etc.
LOMA.html's own init loop fills the booking fields (rounds/capacity/…) it needs.

Idempotent — guarded by a marker. Run:  python _wire_communities.py
"""
import io, json, os, sys

HTML = "LOMA.html"
MARKER = "LOMA communities: loma-app parity"
HERE = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.join(HERE, "..", "..", "loma-app", "src", "data", "v2")
ASSET_BASE = "https://storage.googleapis.com/gradient-digital-group-loma-assets"

# `programs` carries the per-program name/duration/price the detail screen already knows
# how to render (and which makes it hide its generic Duration row). `duration` is gone:
# it was the same placeholder string on all ten communities.
COMM_KEYS = ["id", "name", "nameEn", "area", "emo", "img", "about", "activities",
             "memberIds", "programs", "priceFrom", "schedule", "phone", "lat", "lng",
             "programs_status"]


def asset(p):
    if not p:
        return None
    return p if p.startswith("http") else ASSET_BASE + (p if p.startswith("/") else "/" + p)


def jsval(v):
    return "null" if v is None else json.dumps(v, ensure_ascii=False)


def build_communities():
    rows = json.load(io.open(os.path.join(V2, "communities.json"), encoding="utf-8"))
    out = ["const COMMUNITIES = ["]
    for i, c in enumerate(rows):
        c = dict(c)
        c["img"] = asset(c.get("img"))
        body = ", ".join(f"{k}:{jsval(c.get(k))}" for k in COMM_KEYS)
        out.append("  { " + body + " }" + ("," if i < len(rows) - 1 else ""))
    out.append("];")
    return "\n".join(out)


def build_accounts():
    rows = json.load(io.open(os.path.join(V2, "communityAccounts.json"), encoding="utf-8"))
    out = ["const COMMUNITY_ACCOUNTS=["]
    for i, a in enumerate(rows):
        out.append("  {user:%s, pass:%s, commId:%s, person:%s}%s" % (
            jsval(a["user"]), jsval(a["pass"]), jsval(a["commId"]), jsval(a["person"]),
            "," if i < len(rows) - 1 else ""))
    out.append("];")
    return "\n".join(out)


def replace_block(text, start_tok, end_tok, new_block, label):
    """Replace text[start_tok .. just before end_tok] with new_block (robust to
    whitespace). start_tok must appear exactly once; end_tok must follow it."""
    if text.count(start_tok) != 1:
        raise SystemExit(f"[{label}] expected 1 '{start_tok}', found {text.count(start_tok)}")
    s = text.index(start_tok)
    e = text.index(end_tok, s)
    return text[:s] + new_block + "\n" + text[e:]


def main():
    # --force: replace_block regenerates the whole COMMUNITIES array from communities.json,
    # so re-running is safe — it is a rewrite, not an append. Needed whenever the source
    # data changes (the marker alone would pin the mockup to the first run forever).
    force = "--force" in sys.argv
    src = io.open(HTML, encoding="utf-8").read()
    if MARKER in src and not force:
        print("already wired — nothing to do  (use --force to re-sync from communities.json)")
        return

    comm_header = (
        "/* Communities — identical to loma-app (LOMA communities: loma-app parity).\n"
        "   The 10 real Phuket CBT communities from loma-app/src/data/v2/communities.json;\n"
        "   `name` is Thai (primary), `nameEn` the English gloss, `img` a real member photo. */\n"
    )
    src = replace_block(src, "const COMMUNITIES = [", "function COMM(id)",
                        comm_header + build_communities(), "communities")
    src = replace_block(src, "const COMMUNITY_ACCOUNTS=[", "function commAcct",
                        build_accounts(), "community-accounts")

    io.open(HTML, "w", encoding="utf-8", newline="").write(src)
    print("wired LOMA.html communities to loma-app parity (10 communities, 6 host logins)")


if __name__ == "__main__":
    main()
