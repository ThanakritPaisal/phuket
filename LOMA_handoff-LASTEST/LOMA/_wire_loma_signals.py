#!/usr/bin/env python3
"""One-shot patcher: surface the signals we already store on every provider.

GET /providers returns the full `provider.data` JSONB — 43 keys — but the existing
real-data layer maps ~15 of them and drops the rest on the floor. Everything below is
already in Postgres and already paid for; this just stops throwing it away.

  business_status  -> closed shops are removed from the catalog (106 of them)
  review_analysis
    .why_visit     -> o.reason        the "why we picked this" slot, evidence-grounded
    .cultural_
      locality     -> o.cultural      thai_traditional / international / ...
    .per_review
      .aspects     -> o.bestFor       top positive aspects, counted not asserted
      .complaint   -> o.complaint     worst severity actually reported by a customer
  setting          -> o.weather       per-place indoor/outdoor, replacing a category guess
  dietary          -> o.dietary       halal / vegetarian, filterable

Idempotent — running twice is a no-op (guarded by a marker). Run AFTER _wire_real_data.py:

    python _wire_booking_backend.py
    python _wire_real_data.py
    python _wire_loma_signals.py
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA signals layer"

src = io.open(HTML, encoding="utf-8").read()
if MARKER in src:
    print("already wired — nothing to do")
    sys.exit(0)
if "LOMA real-data layer" not in src:
    raise SystemExit("run _wire_real_data.py first — this patch extends its mapper")


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


# --------------------------------------------------------------------------------------
# 1) Helpers — read the signals off a raw provider row.
# --------------------------------------------------------------------------------------
HELPERS = r"""
/* ===== LOMA signals layer =======================================================
   Reads the fields the real-data mapper was discarding. All of this is already on
   every row returned by GET /providers.
================================================================================= */
/* Per-place indoor/outdoor beats WEATHER_BY_CAT's per-category guess. 61% of the
   catalog is resolved from review text; the rest stays unknown and falls back. */
function _lomaSetting(r){
  var s=r.setting;
  return (s==='indoor'||s==='outdoor'||s==='mixed') ? s : '';
}
/* The grounded visit note — every one cites the reviews it came from. 823 places. */
function _lomaWhy(r){
  var ra=r.review_analysis||{}, wv=ra.why_visit;
  return (wv && wv.text) ? String(wv.text) : '';
}
/* What the place actually serves, judged from named dishes in the reviews. */
function _lomaCultural(r){
  var cl=((r.review_analysis||{}).cultural_locality)||{};
  return cl.verdict||'';
}
/* A plain-English local line, built from the dishes the model cited as evidence. */
function _lomaWhyLocal(r){
  var cl=((r.review_analysis||{}).cultural_locality)||{};
  var ev=(cl.evidence||[]).slice(0,3);
  if(cl.verdict==='thai_traditional'&&ev.length) return 'Reviewers name '+ev.join(', ')+'.';
  if(cl.verdict==='thai_modern'&&ev.length) return 'Thai, contemporary — '+ev.join(', ')+'.';
  return '';
}
/* Top positive aspects, counted across reviews — not asserted. Fills bestFor. */
function _lomaStrengths(r){
  var pr=((r.review_analysis||{}).per_review)||[], c={};
  pr.forEach(function(p){ (p.aspects||[]).forEach(function(a){
    if(a && a.polarity==='positive' && a.aspect) c[a.aspect]=(c[a.aspect]||0)+1;
  });});
  var LABEL={food_quality:'great food',service:'good service',value:'good value',
             atmosphere:'nice atmosphere',cleanliness:'clean',authenticity:'authentic',
             wait_time:'quick',staff_language:'English spoken'};
  return Object.keys(c).sort(function(a,b){return c[b]-c[a];})
               .slice(0,3).map(function(k){return LABEL[k]||k;});
}
/* Worst complaint severity a real customer actually reported. */
function _lomaComplaint(r){
  var pr=((r.review_analysis||{}).per_review)||[], worst='';
  pr.forEach(function(p){
    var s=p.complaint&&p.complaint.severity;
    if(s==='high') worst='high';
    else if(s==='medium'&&worst!=='high') worst='medium';
    else if(s==='low'&&!worst) worst='low';
  });
  return worst;
}
/* A closed shop cannot be visited — no score redeems that. 106 in the catalog. */
function _lomaClosed(r){
  var b=r.business_status;
  return b==='CLOSED_PERMANENTLY'||b==='CLOSED_TEMPORARILY';
}
/* Straight-line distance from the signed-in property — the mapper left dist:'' so every
   adopted card rendered "undefined ·". Same haversine the rest of the app uses. */
function _lomaDist(o){
  try{
    var a=(typeof PARTNER!=='undefined'&&PARTNER)?PARTNER:null;
    if(!a||a.lat==null||o.lat==null) return '';
    var R=6371,dLat=(o.lat-a.lat)*Math.PI/180,dLng=(o.lng-a.lng)*Math.PI/180;
    var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(o.lat*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    var km=2*R*Math.asin(Math.sqrt(x));
    return km<1 ? Math.round(km*1000)+' m' : (km<10?km.toFixed(1):Math.round(km))+' km';
  }catch(e){ return ''; }
}
function _lomaApplySignals(o,r){
  var w=_lomaSetting(r);          if(w) o.weather=w;
  var why=_lomaWhy(r);            if(why){ o.reason=why; o._why=why; }
  var wl=_lomaWhyLocal(r);        if(wl) o.whyLocal=wl;
  var st=_lomaStrengths(r);       if(st.length) o.bestFor=st;
  o.cultural=_lomaCultural(r);
  o.dietary=r.dietary||[];
  o.complaint=_lomaComplaint(r);
  o.closed=_lomaClosed(r);
  return o;
}
"""

# Anchor on the real-data layer's own last line, NOT rfind("</script>"). The final
# </script> in this file closes <script src="data/qrcode.browser.js"> — a tag with a
# src attribute, whose inline content the browser ignores completely. Appending there
# looks fine, patches cleanly, and silently never executes.
src = sub_once(src, "\nlomaHydrateProviders();", HELPERS + "\nlomaHydrateProviders();", "helpers")

# --------------------------------------------------------------------------------------
# 2) Adopted providers — carry the signals through the mapper.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "    pick:false, bestFor:[], img:_lomaAsset(r.photo),\n"
    "    reason:'', whyLocal:'', note:r.address||'', sum:r.summary||'',",
    "    pick:false, bestFor:_lomaStrengths(r), img:_lomaAsset(r.photo),\n"
    "    reason:_lomaWhy(r), whyLocal:_lomaWhyLocal(r), note:r.address||'', sum:r.summary||'',\n"
    "    /* LOMA signals layer — see helpers at the end of this script */\n"
    "    weather:_lomaSetting(r), dietary:(r.dietary||[]), cultural:_lomaCultural(r),\n"
    "    complaint:_lomaComplaint(r), closed:_lomaClosed(r),",
    "mapper",
)

# --------------------------------------------------------------------------------------
# 3) Existing catalog entries — refresh the signals too, not just name/rating.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "          if(r.phone!=null) o.phone=r.phone;\n          refreshed++;",
    "          if(r.phone!=null) o.phone=r.phone;\n"
    "          _lomaApplySignals(o,r);   /* LOMA signals layer */\n"
    "          refreshed++;",
    "refresh",
)

# --------------------------------------------------------------------------------------
# 4) Drop closed shops once hydration lands, and report what the signals cover.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "      try{ console.info('[LOMA] providers hydrated from DB — '+refreshed+' refreshed, '+added+' new ('+ops.length+' total)'); }catch(e){}",
    "      /* LOMA signals layer: a closed shop must never be recommendable. */\n"
    "      var before=ops.length;\n"
    "      var live=ops.filter(function(o){return !o.closed;});\n"
    "      if(live.length!==ops.length){ ops.length=0; Array.prototype.push.apply(ops,live); }\n"
    "      /* Providers adopted from the DB never went through the scoring pass — it runs\n"
    "         once at load, long before this fetch resolves. Without it every adopted card\n"
    "         renders 'LOMA undefined' and an empty AI curation note. */\n"
    "      ops.forEach(function(o){ if(!o.weather)o.weather=(typeof WEATHER_BY_CAT!=='undefined'&&WEATHER_BY_CAT[o.cat])||'mixed';\n"
    "                               if(!o.duration)o.duration=(typeof DURATION_BY_CAT!=='undefined'&&DURATION_BY_CAT[o.cat])||'short';\n"
    "                               if(!o.dist)o.dist=_lomaDist(o); });\n"
    "      try{ if(typeof aiRefresh==='function') aiRefresh(); }catch(e){}\n"
    "      /* our grounded note beats the template-generated one where we have it */\n"
    "      ops.forEach(function(o){ if(o._why) o.ai_summary=o._why; });\n"
    "      var withWhy=ops.filter(function(o){return o.reason;}).length;\n"
    "      var withSet=ops.filter(function(o){return o.weather;}).length;\n"
    "      try{ console.info('[LOMA] providers hydrated from DB — '+refreshed+' refreshed, '+added+' new ('+ops.length+' live, '+(before-ops.length)+' closed removed)');\n"
    "           console.info('[LOMA] signals — '+withWhy+' with a why-visit note, '+withSet+' with a real indoor/outdoor setting'); }catch(e){}",
    "closed-filter",
)

# --------------------------------------------------------------------------------------
# 5) filterCatalog — the one funnel every list goes through.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "  const f=Object.assign({},state.filter,opts||{});\n  let list=OPS.slice();",
    "  const f=Object.assign({},state.filter,opts||{});\n"
    "  /* LOMA signals layer: closed shops and serious complaints are never listed. */\n"
    "  let list=OPS.slice().filter(o=>!o.closed && o.complaint!=='high');\n"
    "  if(f.dietary) list=list.filter(o=>(o.dietary||[]).includes(f.dietary));\n"
    "  if(f.cultural) list=list.filter(o=>o.cultural==='thai_traditional'||o.cultural==='thai_modern');",
    "filterCatalog",
)

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html signals layer:")
print("  · closed shops removed from every list (business_status)")
print("  · why_visit -> the 'why we picked this' slot")
print("  · cultural_locality -> whyLocal + o.cultural (filterable)")
print("  · aspects -> bestFor (top positive, counted)")
print("  · setting -> o.weather (per-place, beats WEATHER_BY_CAT)")
print("  · dietary -> o.dietary (filterable: halal / vegetarian)")
print("  · high-severity complaints never listed")
