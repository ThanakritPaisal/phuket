#!/usr/bin/env python3
"""Final direct-content edits, baked into a patcher so a rebuild keeps them.

These three were previously hand-edited straight into the generated LOMA.html and kept
getting lost across merges/rebuilds. Making them idempotent patcher steps fixes that.

  1) Drop the "Today's recommended local picks" block from the staff home — it was two
     hardcoded mock rows below the now-live "Recent recommendations". (ours)
  2) Remove the three top buttons on the staff home (Hotel Picks QR / Impact Credits /
     Impact Board). Saved & Impact remain reachable via the tab bar; Impact Board loses
     its entry point by design. (teammate 6fd2d49, kept by product decision)
  3) A shared tourist link now lands on the branded "Local picks recommended for you"
     scan page instead of a bare provider card. (teammate 6fd2d49)

Runs LAST — after _wire_live_actions (which adds lomaApplyIncomingLink) and
_wire_recent_recs (which adds the Recent-recommendations row). Marker-guarded.
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA ui-final layer"

src = io.open(HTML, encoding="utf-8").read()
if MARKER in src:
    print("already wired — nothing to do")
    sys.exit(0)


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


# 1) Remove the "Today's recommended local picks" block (keep Recent recommendations).
src = sub_once(
    src,
    '''    <div class="h-sec">Recent recommendations</div>
    ${_lomaRecentRows()}

    <div class="h-sec">Today's recommended local picks</div>
    ${miniRow('RFE')}${miniRow('KLD')}
  </div>${staffTabbar()}`;''',
    '''    <div class="h-sec">Recent recommendations</div>  <!-- LOMA ui-final layer -->
    ${_lomaRecentRows()}
  </div>${staffTabbar()}`;''',
    "todays-removal",
)

# 2) Remove the three staff-home top buttons (Hotel Picks QR / Impact Credits / Board).
BTN_START = '      <div style="display:flex;gap:9px">\n        <button data-go="saved"'
btn_a = src.index(BTN_START, src.index("function screenHome("))
btn_b = src.index('</button>\n      </div>', btn_a) + len('</button>\n      </div>')
src = src[:btn_a] + '      <div style="display:flex;gap:9px"></div>' + src[btn_b:]

# 3) Shared link lands on the recommended-picks scan page, not the bare provider card.
src = sub_once(
    src,
    "try{ state.persona='tourist'; state.curProv=pid; state.tourist='card'; }catch(e){}",
    "try{\n"
    "      state.persona='tourist';\n"
    "      state.curProv=pid;\n"
    "      /* Land on the branded \"Local picks recommended for you\" scan page (not the\n"
    "         bare provider card): seed a rec list holding the shared place. */\n"
    "      state.curList={ id:'rl_link_'+pid, kind:'assisted', items:[pid], note:'',\n"
    "        hotel_name:(typeof PARTNER!=='undefined'&&PARTNER&&PARTNER.name)||'' };\n"
    "      if(typeof gotoTourist==='function'){ gotoTourist('reclist'); }\n"
    "      else { state.tourist='reclist'; }\n"
    "    }catch(e){}",
    "reclist-landing",
)

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html ui-final layer:")
print("  · removed 'Today's recommended' block (kept Recent recommendations)")
print("  · removed 3 staff-home top buttons (Saved/Impact via tabs; Board retired)")
print("  · shared links land on the recommended-picks scan page")
