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
/* Numeric great-circle km — _lomaDist returns a display string, this returns a number
   for the "within 5 km" filter. */
function _lomaKm(aLat,aLng,bLat,bLng){
  if(aLat==null||bLat==null) return Infinity;
  var R=6371,dLat=(bLat-aLat)*Math.PI/180,dLng=(bLng-aLng)*Math.PI/180;
  var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return 2*R*Math.asin(Math.sqrt(x));
}
/* Real social links, derived from the provider's own URL. Google stores a business's
   chosen website in `website` (and links.website); for a Phuket SME that URL is very
   often its Facebook page (308 places) or Instagram (23) — never TikTok (Google does
   not return it). We show a platform's logo ONLY when the real URL points at it, and
   the logo links to that exact URL. An own-domain or aggregator site shows nothing.
   socialRow(p) already renders only the keys present and opens them on tap. */
function _lomaSocial(r){
  var urls=[];
  if(r.website) urls.push(r.website);
  var L=r.links||{};
  ['website','facebook','instagram','tiktok'].forEach(function(k){ if(L[k]) urls.push(L[k]); });
  var out={};
  urls.forEach(function(u){
    var s=String(u).toLowerCase();
    if(!out.facebook  && (s.indexOf('facebook.com')>-1 || s.indexOf('fb.com')>-1)) out.facebook=u;
    if(!out.instagram &&  s.indexOf('instagram.com')>-1) out.instagram=u;
    if(!out.tiktok    &&  s.indexOf('tiktok.com')>-1)    out.tiktok=u;
  });
  return out;
}
/* OUR score, precomputed in Postgres by scripts/compute_score.py:
     score = hiddenness x cultural x quality x confidence^2
   The raw score tops out near 25 (four sub-1.0 multipliers compound), which is fine for
   ordering and misleading to display — so the badge shows the percentile instead. */
function _lomaScore(r){ return r.loma_score || null; }

/* Who is allowed to appear at all.
   The original asked the mockup's own status machine:
       filter(p => p.status==='verified' || p.status==='ai_shortlisted')
   and that machine mints 'verified' from a hardcoded flag and 'ai_shortlisted' from its
   own hidden-gem test — so 916 of 1,220 real providers were invisible, filed 'candidate'.
   Our gate is the one from compute_score.py: a place is out only if recommending it
   would be WRONG (closed, or a high-severity complaint a customer actually wrote).
   Redefined here, after the original — a later function declaration wins.
   `status` itself is left untouched, so verified badges behave exactly as before. */
function liveProviders(){
  return allProviders().filter(function(p){
    if(p.status==='suspended') return false;          /* admin action still wins */
    if(p.loma) return !p.closed && !p.loma.blocked;   /* our gate, for real providers */
    return p.status==='verified'||p.status==='ai_shortlisted';  /* mock rows: unchanged */
  });
}
function _lomaApplySignals(o,r){
  var ls=_lomaScore(r);
  if(ls){
    o.loma=ls;
    o.loma_pct=ls.percentile;
    o.loma_rank=ls.rank;
    /* the mockup's own engine writes these; ours wins */
    if(ls.score!=null){ o.loma_score=ls.percentile; o.overall_loma_score=ls.percentile; }
    o.blockedReason=ls.blocked||'';
    var fx=ls.factors||{};
    o.f_hidden=fx.hiddenness; o.f_cultural=fx.cultural; o.f_quality=fx.quality; o.f_conf=fx.confidence;
    o.is_hidden_gem=(ls.percentile>=90);
  }
  var w=_lomaSetting(r);          if(w) o.weather=w;
  var why=_lomaWhy(r);            if(why){ o.reason=why; o._why=why; }
  var wl=_lomaWhyLocal(r);        if(wl) o.whyLocal=wl;
  var st=_lomaStrengths(r);       if(st.length) o.bestFor=st;
  o.cultural=_lomaCultural(r);
  o.dietary=r.dietary||[];
  o.social=_lomaSocial(r);        /* real FB/IG/TikTok from the provider's own URL */
  o.tambon=r.tambon||'';          /* real subdistrict, for the "Somewhere else" picker */
  o.complaint=_lomaComplaint(r);
  o.closed=_lomaClosed(r) || (ls&&ls.blocked==='closed');
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
# 3b) Adopted providers — apply the signals to them too. On a cold load EVERY provider
#     takes this branch (no mock id matches a DB id), so without this the whole layer
#     only ever fires on the handful of hand-written rows.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "          var op=_lomaProvToOp(r); ops.push(op); byId[op.id]=op; added++;",
    "          var op=_lomaProvToOp(r); _lomaApplySignals(op,r); ops.push(op); byId[op.id]=op; added++;",
    "adopt-signals",
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
    "      /* aiRefresh() just recomputed the mockup's own engine over every op, clobbering\n"
    "         both our score and our note. Restore ours on top — the DB is the authority. */\n"
    "      ops.forEach(function(o){\n"
    "        if(o._why) o.ai_summary=o._why;\n"
    "        if(o.loma && o.loma.percentile!=null){\n"
    "          o.loma_score=o.loma.percentile;\n"
    "          o.overall_loma_score=o.loma.percentile;\n"
    "          o.is_hidden_gem=(o.loma.percentile>=90);\n"
    "          o.quality=Math.round((o.loma.factors.quality||0)*100);\n"
    "          o.locality=Math.round((o.loma.factors.cultural||0)*100);\n"
    "        }\n"
    "      });\n"
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


# --------------------------------------------------------------------------------------
# 6) Chips — reflect the catalog we actually have.
#    Family Friendly matched 28 of 1,214: only the hand-written mock providers carry a
#    "families" tag, and nothing in the provider table produces one. A chip that silently
#    returns almost nothing is worse than no chip.
#    Halal (22) and Vegetarian (264) are real, filterable, and Phuket is ~a third Muslim.
# --------------------------------------------------------------------------------------
# Stop folding at ingest. _lomaCat mapped Seafood and Street Food & Noodles into
# Local Food and renamed Café & Dessert -> Café, so 157 places lost their category on
# the way in and could never be filtered. categories.ts calls its 8 ids the single
# source of truth; pass them through unchanged.
src = sub_once(
    src,
    """function _lomaCat(c){ return ({'Café & Dessert':'Café','Street Food & Noodles':'Local Food','Seafood':'Local Food'})[c] || c || 'Local Food'; }""",
    """/* LOMA signals layer: no folding. The 8 canonical ids in categories.ts are stored
   on every provider; mapping them here only destroyed information. */
function _lomaCat(c){ return c || 'Local Food'; }""",
    "lomaCat-identity",
)

# The 7 canonical categories with a chip (Boat / Sea has 10 places — left out on request),
# plus the real-data filters. Labels/emoji come from categories.ts.
src = sub_once(
    src,
    """const INTENT_MAP = {
  "Local Food":{cat:"Local Food"}, "Massage & Spa":{cat:"Massage & Wellness"},
  "Local Experience":{cat:"Community Experience"}, "Café":{cat:"Café"},
  "Souvenir":{cat:"Souvenir & Local Product"}, "Rainy Day":{rainy:true},
  "Family Friendly":{family:true}, "Open Now":{openNow:true},""",
    """const INTENT_MAP = {
  /* LOMA signals layer: the canonical categories.ts ids, unfolded. "Family Friendly"
     was dropped (it matched only hand-written mock rows); Halal/Vegetarian are real
     data from provider.dietary. */
  "Local Food":{cat:"Local Food"}, "Seafood":{cat:"Seafood"},
  "Street Food":{cat:"Street Food & Noodles"}, "Café":{cat:"Café & Dessert"},
  "Massage & Spa":{cat:"Massage & Wellness"},
  "Souvenir":{cat:"Souvenir & Local Product"},
  "Local Experience":{cat:"Community Experience"},
  "Rainy Day":{rainy:true},
  "Halal":{dietary:"halal"}, "Vegetarian":{dietary:"vegetarian"},
  "Open Now":{openNow:true},""",
    "intent-map",
)

src = sub_once(
    src,
    "const intents=['Local Food 🍜','Massage & Spa 💆','Local Experience 🛶','Café ☕','Souvenir 🎁','Rainy Day 🌧','Family Friendly 👨‍👩‍👧','Open Now 🟢'",
    "const intents=['Local Food 🍜','Seafood 🦐','Street Food 🍲','Café ☕','Massage & Spa 💆','Souvenir 🎁','Local Experience 🛶','Rainy Day 🌧','Halal ☪','Vegetarian 🌱','Open Now 🟢'",
    "intent-chips",
)

# The unfolded ids are new to these lookups; without an entry they silently fall back.
src = sub_once(
    src,
    "const WEATHER_BY_CAT={'Local Food':'mixed','Café':'indoor',",
    "const WEATHER_BY_CAT={'Local Food':'mixed','Café':'indoor','Café & Dessert':'indoor','Seafood':'mixed','Street Food & Noodles':'mixed',",
    "weather-by-cat",
)
src = sub_once(
    src,
    "const DURATION_BY_CAT={'Local Food':'short','Café':'short',",
    "const DURATION_BY_CAT={'Local Food':'short','Café':'short','Café & Dessert':'short','Seafood':'short','Street Food & Noodles':'quick',",
    "duration-by-cat",
)


# --------------------------------------------------------------------------------------
# 7) Align the TOURIST landing with the same canonical categories as the staff chips.
#    It ran on a THIRD taxonomy: the mockup's own lomaCat() invented "Souvenirs & Crafts",
#    "Local Product" and "Wellness", and folded Boat / Sea into Community Experience.
#    "Wellness" rendered a tile with 0 places — nothing in categories.ts maps to it.
#    lomaCat() now returns the stored id unchanged, so loma_cat === cat everywhere.
# --------------------------------------------------------------------------------------
NEW_CATS = (
    '/* LOMA signals layer: the canonical categories.ts ids + emoji, matching the staff\n'
    '   chips exactly. Boat / Sea (15 places) is deliberately left out of the tiles. */\n'
    'const LOMA_CATS=[["Local Food","🍜"],["Seafood","🦐"],["Street Food & Noodles","🍲"],'
    '["Café & Dessert","☕"],["Massage & Wellness","💆"],'
    '["Souvenir & Local Product","🎁"],["Community Experience","🛶"]]'
)
src = sub_once(
    src,
    'const LOMA_CATS=[["Local Food","🍜"],["Café & Dessert","☕"],["Massage & Spa","💆"],'
    '["Souvenirs & Crafts","🎁"],["Local Product","🧺"],["Community Experience","🛶"],["Wellness","🧘"]]',
    NEW_CATS,
    "loma-cats",
)

# loma_cat drives the landing counts; folding it made Seafood/Street Food uncountable.
src = sub_once(
    src,
    "function lomaCat(c){c=c||'';",
    '/* LOMA signals layer: no folding — the stored category IS the canonical id. */\n'
    'function lomaCat(c){ return c || "Local Food"; }\n'
    "function _lomaCatLegacy(c){c=c||'';",
    "lomaCat-identity-tourist",
)

# Subtitle + tile image for the ids the landing has never seen before.
src = sub_once(
    src,
    "CAT_SUB={\n  'Local Food':'Authentic flavors',",
    "CAT_SUB={\n  'Local Food':'Authentic flavors',\n"
    "  'Seafood':'Off the boat, cooked simply',\n"
    "  'Street Food & Noodles':'Bowls, woks and plastic stools',\n"
    "  'Massage & Wellness':'Relax & rejuvenate',\n"
    "  'Souvenir & Local Product':'Handmade with heart',",
    "cat-sub",
)
src = sub_once(
    src,
    "const CAT_IMG={\n  'Local Food':'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=70',",
    "const CAT_IMG={\n  'Local Food':'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=70',\n"
    "  'Seafood':'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=70',\n"
    "  'Street Food & Noodles':'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=70',\n"
    "  'Massage & Wellness':'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=70',\n"
    "  'Souvenir & Local Product':'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=70',",
    "cat-img",
)

# --------------------------------------------------------------------------------------
# 8) Real socials, not fabricated ones. demoSocial() sprinkled hash-random Facebook/
#    Instagram/TikTok *search* URLs onto providers — so the logos linked to a search
#    page, not a profile, and appeared on places with no social presence at all. Replace
#    it so a logo shows ONLY when the provider's own website IS that platform, linking to
#    the real URL. (DB providers already get o.social via _lomaApplySignals; this covers
#    the hand-written mock rows, which reach socials through demoSocial.)
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    """function demoSocial(p){
  if(!p||p.loma_cat==='Community Experience') return null;
  const q=encodeURIComponent((p.name||'')+' Phuket');
  const slug=(p.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const s={};
  if(hsh('fb|'+p.id)%10 < 8) s.facebook ='https://www.facebook.com/search/top?q='+q;
  if(hsh('ig|'+p.id)%10 < 6) s.instagram='https://www.instagram.com/explore/tags/'+slug+'/';
  if(hsh('tk|'+p.id)%10 < 5) s.tiktok   ='https://www.tiktok.com/search?q='+q;
  return Object.keys(s).length? s : null;
}""",
    """/* LOMA signals layer: real socials only. A logo appears iff the provider's own URL
   is that platform, and it links to that exact URL. No hash, no search stubs. */
function demoSocial(p){
  var s=_lomaSocial(p);   /* reads p.website + p.links, returns matched platforms only */
  return Object.keys(s).length ? s : null;
}""",
    "demoSocial",
)

# --------------------------------------------------------------------------------------
# 9) "WHERE?" — real Phuket subdistricts, and a real 5 km radius.
#    (a) The chips were a mix: Patong/Karon/Rawai/Chalong are tambon, but Kata, Old Town,
#        Bang Tao and Nai Yang are beaches/neighbourhoods. Replace with the 12 real
#        subdistricts (tambon) that have >=40 providers, centroids projected onto the
#        stylised map with the mockup's own formula, and match "Somewhere else" on the
#        provider's real `tambon` field.
#    (b) "Around this property" had NO distance filter — it showed the whole island.
#        Restrict it to within 5 km of the signed-in hotel (haversine on real coords).
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    'AREA_XY = {Patong:[58,60],Kata:[50,74],Karon:[52,70],Rawai:[54,82],Chalong:[60,72],"Old Town":[62,46],"Bang Tao":[44,34],"Nai Yang":[40,20]}',
    '/* LOMA signals layer: the 12 real Phuket subdistricts (tambon) with >=40 providers,\n'
    '   centroids from the provider table projected with the same _lomaProject formula. */\n'
    'AREA_XY = {"Talat Yai":[41,72],"Talat Nuea":[40,73],"Patong":[16,70],"Wichit":[36,75],'
    '"Karon":[16,83],"Rawai":[23,90],"Choeng Thale":[16,51],"Ratsada":[40,67],'
    '"Chalong":[30,80],"Si Sunthon":[29,53],"Thep Krasattri":[27,39],"Kathu":[23,69]}',
    "area-xy",
)

src = sub_once(
    src,
    "if(f.place==='elsewhere'&&f.destArea){const m=list.filter(o=>String(o.area).toLowerCase().includes(f.destArea.toLowerCase())); if(m.length)list=m;}",
    "/* LOMA signals layer: property = within 5 km of the hotel; elsewhere = exact subdistrict. */\n"
    "  if(f.place==='property' && typeof PARTNER!=='undefined' && PARTNER && PARTNER.lat!=null){\n"
    "    list=list.filter(o=>o.lat!=null && _lomaKm(PARTNER.lat,PARTNER.lng,o.lat,o.lng)<=5);\n"
    "  } else if(f.place==='elsewhere' && f.destArea){\n"
    "    const m=list.filter(o=>o.tambon===f.destArea || String(o.area).toLowerCase().includes(f.destArea.toLowerCase()));\n"
    "    if(m.length)list=m;\n"
    "  }",
    "place-filter",
)

# --------------------------------------------------------------------------------------
# 10) Real maps. Every ".mapbox" was a stylised SVG with pins positioned by a fake
#     projection. Leaflet (bundled locally in data/) + OpenStreetMap tiles replace it.
#     Each ".pin" already carries data-prov, so we look the operator up by id for its
#     real lat/lng — no per-screen edits, all 7 map surfaces upgrade at once.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    "<head>",
    '<head>\n'
    '<link rel="stylesheet" href="data/leaflet.css">\n'
    '<script src="data/leaflet.js"></script>\n'
    '<style>.mapbox .leaflet-container{height:100%;width:100%;background:#dbe7e4}\n'
    '  .mapbox .maptag{z-index:1000!important;pointer-events:none}</style>',
    "leaflet-head",
)

MAPS = r"""
/* ===== LOMA real maps ===========================================================
   Upgrade every .mapbox from a stylised SVG to a Leaflet + OpenStreetMap map. Pins
   carry data-prov, so we resolve each to its operator's real lat/lng; the hotel comes
   from PARTNER. Re-runs on every render (innerHTML replacement wipes the maps).
================================================================================= */
(function(){
  if(typeof L!=='undefined'){
    L.Icon.Default.mergeOptions({
      iconUrl:'data/images/marker-icon.png', iconRetinaUrl:'data/images/marker-icon-2x.png',
      shadowUrl:'data/images/marker-shadow.png'});
  }
})();
function _lomaLL(id){
  var ops=(window.LOMA_DATA&&window.LOMA_DATA.operators)||[];
  for(var i=0;i<ops.length;i++){ if(ops[i].id===id && ops[i].lat!=null) return {lat:ops[i].lat,lng:ops[i].lng,name:ops[i].name}; }
  if(typeof COMM==='function'){ var c=COMM(id); if(c&&c.lat!=null) return {lat:c.lat,lng:c.lng,name:c.name}; }
  return null;
}
function _lomaInitMaps(){
  if(typeof L==='undefined') return;
  var boxes=document.querySelectorAll('.mapbox');
  for(var b=0;b<boxes.length;b++){
    var box=boxes[b];
    if(box._lmap || !box.offsetHeight) continue;      /* already upgraded, or hidden (desktop) */
    var pts=[], seen={};
    var pins=box.querySelectorAll('.pin[data-prov]');
    for(var i=0;i<pins.length;i++){
      var id=pins[i].getAttribute('data-prov'); if(seen[id]) continue; seen[id]=1;
      var ll=_lomaLL(id); if(ll) pts.push({ll:ll, sel:pins[i].className.indexOf('sel')>-1});
    }
    var hotel=(typeof PARTNER!=='undefined'&&PARTNER&&PARTNER.lat!=null)?PARTNER:null;
    if(!pts.length && !hotel) continue;               /* nothing real — keep the stylised map */
    box._lmap=true;
    /* Keep the caption TEXT only ("Local Food picks · 10 of 77"). The original maptag
       embeds an inline <svg> that has no size and balloons in the Leaflet context. */
    var tag=box.querySelector('.maptag');
    var tagTxt=tag?(tag.textContent||'').replace(/\s+/g,' ').trim():'';
    box.innerHTML='';
    var map=L.map(box,{zoomControl:true,attributionControl:false,scrollWheelZoom:false,dragging:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,crossOrigin:true}).addTo(map);
    var bounds=[];
    for(var j=0;j<pts.length;j++){
      var p=pts[j].ll;
      var mk=L.marker([p.lat,p.lng]).addTo(map);
      if(p.name) mk.bindPopup(p.name);
      if(pts[j].sel) mk.openPopup();
      bounds.push([p.lat,p.lng]);
    }
    if(hotel){
      var h=L.circleMarker([hotel.lat,hotel.lng],{radius:7,weight:2,color:'#fff',fillColor:'#0A3A73',fillOpacity:1}).addTo(map);
      h.bindPopup((hotel.name||'Your property')); bounds.push([hotel.lat,hotel.lng]);
    }
    if(bounds.length>1) map.fitBounds(bounds,{padding:[26,26],maxZoom:15});
    else map.setView(bounds[0],14);
    if(tagTxt) box.insertAdjacentHTML('beforeend','<div class="maptag">📍 '+tagTxt+'</div>');
    (function(m){ setTimeout(function(){ m.invalidateSize(); },80); })(map);
  }
}
/* Re-init on every render (the app replaces innerHTML wholesale). Debounced so Leaflet's
   own tile churn doesn't loop; the box._lmap guard makes re-scans cheap. */
(function(){
  var t=null; function go(){ if(t)clearTimeout(t); t=setTimeout(_lomaInitMaps,140); }
  if(window.MutationObserver) new MutationObserver(go).observe(document.body,{childList:true,subtree:true});
  if(document.readyState!=='loading') go(); else document.addEventListener('DOMContentLoaded',go);
})();
"""
src = sub_once(src, "\nlomaHydrateProviders();", MAPS + "\nlomaHydrateProviders();", "maps-layer")

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html signals layer:")
print("  · closed shops removed from every list (business_status)")
print("  · why_visit -> the 'why we picked this' slot")
print("  · cultural_locality -> whyLocal + o.cultural (filterable)")
print("  · aspects -> bestFor (top positive, counted)")
print("  · setting -> o.weather (per-place, beats WEATHER_BY_CAT)")
print("  · dietary -> o.dietary (filterable: halal / vegetarian)")
print("  · high-severity complaints never listed")
print("  · loma_score (ours, precomputed) overrides the mockup engine")
print("  · chips: +Halal +Vegetarian, -Family Friendly (no data behind it)")
