#!/usr/bin/env python3
"""One-shot patcher: thumbs up / down feedback on every recommended provider card.

Every tourist-facing provider card (bigCard) gets a "Good match?  👍 👎" row. A tap
logs one funnel event to the DB (POST /events via the existing lomaLog helper) carrying:

  · the decision            -> metadata.vote            ("up" | "down")
  · the tourist demographic -> metadata.nationality/age (from state.profile)
  · the business in question -> provider_id  (+ metadata.category / rating / reviews / area)
  · who / where             -> tourist_session_id, hotel_id, metadata.screen

That's the (demographic, decision, business) triple the ML team needs later — no schema
change: the events table already stores provider_id + a JSONB metadata blob.

The vote is echoed back in the card (highlighted thumb + "Thanks") and remembered per
provider in localStorage so it survives re-renders; a tourist can change their mind and
each decision is logged (ML can keep the latest or the full trail).

Idempotent — marker-guarded. Must run AFTER _wire_live_actions.py (defines lomaLog) and
_wire_tourist_tabs.py. See build.sh.
"""
import io

HTML = "LOMA.html"
MARKER = "LOMA rec-feedback layer"


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

    # 1) Helpers (per-provider vote store) + the feedback branch of the click delegation,
    #    injected just before the body click listener. The branch runs before [data-tprov]
    #    so a thumb tap logs feedback instead of opening the provider page.
    helpers = r"""/* ===== LOMA rec-feedback layer ================================================
   Thumbs up/down on recommended provider cards -> POST /events (demographic + decision
   + business) for future ML. Best-effort; nothing blocks if the API is down.
============================================================================== */
function lomaFbMap(){ try{ return JSON.parse(localStorage.getItem('loma_fb')||'{}'); }catch(e){ return {}; } }
function lomaGetFb(pid){ try{ return lomaFbMap()[pid]||''; }catch(e){ return ''; } }
function lomaSetFb(pid,vote){ try{ var m=lomaFbMap(); m[pid]=vote; localStorage.setItem('loma_fb',JSON.stringify(m)); }catch(e){} }
(function(){ try{
  var st=document.createElement('style');
  st.textContent=
    '.bc-fb{display:flex;align-items:center;gap:7px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line)}'+
    '.bc-fbq{font-size:11.5px;color:var(--muted);font-weight:600}'+
    '.bc-fbb{width:34px;height:28px;display:grid;place-items:center;border:1px solid var(--line);'+
      'border-radius:99px;background:var(--surface);font-size:14px;line-height:1;cursor:pointer;'+
      'transition:transform .1s var(--ease),background .15s,border-color .15s;-webkit-tap-highlight-color:transparent}'+
    '.bc-fbb:active{transform:scale(.9)}'+
    '.bc-fbb.up.on{background:var(--primary-l);border-color:var(--primary)}'+
    '.bc-fbb.down.on{background:#fdecec;border-color:#e2726e}'+
    '.bc-fbthx{margin-left:auto;font-size:11px;font-weight:700;color:var(--primary);opacity:0;transition:opacity .2s}';
  document.head.appendChild(st);
}catch(e){} })();
"""

    branch = (
        "  // ---- RECOMMENDATION FEEDBACK (thumbs up/down) -> DB for ML ----\n"
        "  const fb=e.target.closest('[data-fb]');\n"
        "  if(fb){\n"
        "    e.stopPropagation();\n"
        "    const pid=fb.getAttribute('data-fbprov'), vote=fb.getAttribute('data-fb');\n"
        "    const pf=state.profile||{};\n"
        "    lomaLog('rec_feedback', pid, null, {\n"
        "      vote:vote,\n"
        "      nationality:pf.n||null, age:pf.a||null,\n"
        "      category:fb.getAttribute('data-fbcat')||null,\n"
        "      rating:(fb.getAttribute('data-fbrating')||null),\n"
        "      reviews:(fb.getAttribute('data-fbreviews')||null),\n"
        "      area:fb.getAttribute('data-fbarea')||null,\n"
        "      screen:state.tourist||null\n"
        "    });\n"
        "    lomaSetFb(pid, vote);\n"
        "    const grp=fb.closest('.bc-fb');\n"
        "    if(grp){\n"
        "      grp.querySelectorAll('[data-fb]').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-fb')===vote); });\n"
        "      const thx=grp.querySelector('.bc-fbthx'); if(thx){ thx.textContent=T('Thanks — noted'); thx.style.opacity='1'; }\n"
        "    }\n"
        "    return;\n"
        "  }\n"
    )

    src = sub_once(
        src,
        "document.body.addEventListener('click',e=>{",
        helpers + "document.body.addEventListener('click',e=>{\n" + branch,
        "fb-helpers+branch",
    )

    # 2) bigCard: compute the raw (untranslated) category + any remembered vote.
    src = sub_once(
        src,
        "  const cat=T(opt.catLabel||p.loma_cat||p.cat||'Local');",
        "  const cat=T(opt.catLabel||p.loma_cat||p.cat||'Local');\n"
        "  const _fbcat=opt.catLabel||p.loma_cat||p.cat||'Local';\n"
        "  const _fbv=(typeof lomaGetFb==='function')?lomaGetFb(p.id):'';",
        "bigCard-fbvars",
    )

    # 3) bigCard: render the feedback row inside .bc-bd, below the rating/distance line.
    fb_row = (
        "      <div class=\"bc-fb\" data-nostretch>\n"
        "        <span class=\"bc-fbq\">${T('Good match?')}</span>\n"
        "        <button type=\"button\" class=\"bc-fbb up${_fbv==='up'?' on':''}\" data-fb=\"up\""
        " data-fbprov=\"${p.id}\" data-fbcat=\"${_fbcat}\" data-fbrating=\"${p.rating!=null?p.rating:''}\""
        " data-fbreviews=\"${p.reviews||0}\" data-fbarea=\"${p.area||p.tambon||''}\" aria-label=\"Good recommendation\">\U0001F44D</button>\n"
        "        <button type=\"button\" class=\"bc-fbb down${_fbv==='down'?' on':''}\" data-fb=\"down\""
        " data-fbprov=\"${p.id}\" data-fbcat=\"${_fbcat}\" data-fbrating=\"${p.rating!=null?p.rating:''}\""
        " data-fbreviews=\"${p.reviews||0}\" data-fbarea=\"${p.area||p.tambon||''}\" aria-label=\"Not a good recommendation\">\U0001F44E</button>\n"
        "        <span class=\"bc-fbthx\">${_fbv?T('Thanks — noted'):''}</span>\n"
        "      </div>\n"
    )
    src = sub_once(
        src,
        "        <span class=\"bc-ds\">${p.dist||''}</span>\n      </div>\n    </div>\n  </div>",
        "        <span class=\"bc-ds\">${p.dist||''}</span>\n      </div>\n" + fb_row + "    </div>\n  </div>",
        "bigCard-fbrow",
    )

    io.open(HTML, "w", encoding="utf-8", newline="").write(src)
    print("wired LOMA.html rec-feedback layer:")
    print("  · every recommended provider card -> 'Good match? 👍 👎'")
    print("  · tap logs POST /events {vote, nationality, age, category, provider_id, ...}")
    print("  · vote remembered per provider (localStorage); changeable, each logged")


if __name__ == "__main__":
    main()
