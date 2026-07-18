#!/usr/bin/env python3
"""One-shot patcher: add a "Shared" tourist tab and repurpose "For you".

Before: the tourist tabbar's "For you" tab opened `reclist` — the hotel's
"Local picks recommended for you" page. There was a separate profile-based
`foryou` screen (touristForYou: "Picked for you · Zero taps — from your profile")
that no tab reached.

After:
  · Shared  (new, leftmost)  -> reclist  (the hotel "Local picks" page, unchanged)
  · For you                  -> foryou   (the profile-based screen), now showing the
                                          TOP-RATED place in EACH category (not just 3).

Idempotent — marker-guarded. Runs LAST (after all other patchers). See build.sh.
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA tourist-tabs layer"


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


def main():
    src = io.open(HTML, encoding="utf-8").read()
    if MARKER in src:
        print("already wired — nothing to do")
        return

    # 1) Tabbar: Shared (leftmost) -> reclist; For you -> foryou; Ask LOMA (rightmost,
    #    was "Hotel") -> ask (the same AI-guide screen as the top-nav "Ask LOMA"). Its
    #    icon is the LOMA wordmark rendered in the brand serif so it inherits currentColor
    #    (white on the navy tabbar, primary when active) like every other tab.
    LOMA_ICON = (
        '<span style="font-family:var(--fd),Georgia,serif;font-weight:800;'
        'font-size:12.5px;letter-spacing:.02em;line-height:1">LOMA</span>'
    )
    src = sub_once(
        src,
        "const t=[['reclist',I.bookmark,'For you'],['selfserve',I.search,'Explore'],['community',I.map,'Community'],['chat',I.home,'Hotel']];",
        "/* LOMA tourist-tabs layer: Shared = the hotel's shared picks (reclist); For you =\n"
        "   the profile-based picks (foryou); Ask LOMA = the AI local guide (ask). */\n"
        "  const t=[['reclist',I.share,'Shared'],['foryou',I.bookmark,'For you'],['selfserve',I.search,'Explore'],['community',I.map,'Community'],"
        "['ask','" + LOMA_ICON + "','Ask LOMA']];",
        "tabbar",
    )

    # 2) "For you" screen: show the top-rated place in every category, not a fixed 3.
    src = sub_once(
        src,
        "${rec.ids.map(row).join('')}",
        "${(function(){\n"
        "        /* Top-rated place per canonical category (categories.ts). liveProviders()\n"
        "           already excludes closed / seriously-complained places. */\n"
        "        var CATS=['Local Food','Seafood','Street Food & Noodles','Café & Dessert',"
        "'Massage & Wellness','Souvenir & Local Product','Community Experience','Boat / Sea'];\n"
        "        var live=(typeof liveProviders==='function')?liveProviders():((window.LOMA_DATA&&window.LOMA_DATA.operators)||[]);\n"
        "        return CATS.map(function(c){\n"
        "          var inCat=live.filter(function(p){return (p.cat===c||p.loma_cat===c) && p.rating!=null;});\n"
        "          /* Prefer places with real evidence (>=20 reviews) so 'top rated' isn't a\n"
        "             5.0-from-3-reviews fluke; fall back to all if a category has none. */\n"
        "          var strong=inCat.filter(function(p){return (p.reviews||0)>=20;});\n"
        "          var pool=strong.length?strong:inCat;\n"
        "          pool.sort(function(a,b){return (b.rating-a.rating)||((b.reviews||0)-(a.reviews||0));});\n"
        "          var p=pool[0]; if(!p) return '';\n"
        "          return bigCard(p,{catLabel:c, sub:'★ '+p.rating+' ('+(p.reviews||0)+') · top-rated '+T(c)});\n"
        "        }).join('');\n"
        "      })()}",
        "foryou-cards",
    )

    # 3) The For-you screen highlights the For-you tab (was reclist).
    src = sub_once(
        src,
        "${T('Browse all categories')}</button>\n    </div>${touristTabbar('reclist')}",
        "${T('Browse all categories')}</button>\n    </div>${touristTabbar('foryou')}",
        "foryou-tabbar",
    )

    # 4) The Ask-LOMA screen now has its own tab, so highlight it (was 'selfserve',
    #    from when Ask LOMA was only reachable from the top nav).
    src = sub_once(
        src,
        "data-lomasend style=\"width:auto;padding:12px 18px;font-weight:700\">${T('Send')}</button>\n"
        "      </div>\n    </div>${touristTabbar('selfserve')}",
        "data-lomasend style=\"width:auto;padding:12px 18px;font-weight:700\">${T('Send')}</button>\n"
        "      </div>\n    </div>${touristTabbar('ask')}",
        "ask-tabbar",
    )

    # 5) Chat bubbles: a long unbroken string (no spaces) ignores max-width and spills
    #    past the bubble's right edge. Force it to wrap. (bot bubble, then user bubble.)
    src = sub_once(
        src,
        "color:var(--ink);line-height:1.5;max-width:84%\">",
        "color:var(--ink);line-height:1.5;max-width:84%;word-break:break-word;overflow-wrap:anywhere\">",
        "bubble-wrap-bot",
    )
    src = sub_once(
        src,
        "padding:10px 13px;font-size:13.5px;line-height:1.5;max-width:84%\">",
        "padding:10px 13px;font-size:13.5px;line-height:1.5;max-width:84%;word-break:break-word;overflow-wrap:anywhere\">",
        "bubble-wrap-user",
    )

    io.open(HTML, "w", encoding="utf-8", newline="").write(src)
    print("wired LOMA.html tourist-tabs layer:")
    print("  · new 'Shared' tab (leftmost) -> the hotel's Local picks page")
    print("  · 'For you' tab -> profile-based picks, top-rated place per category")
    print("  · 'Ask LOMA' tab (was 'Hotel') -> the AI local-guide screen, LOMA-wordmark icon")
    print("  · chat bubbles wrap long unbroken text (no right-edge overflow)")


if __name__ == "__main__":
    main()
