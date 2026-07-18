#!/usr/bin/env python3
"""One-shot patcher: wire LOMA.html to REAL data.

  1) Demand-partner accounts -> the real Phuket properties from
     loma-app/src/data/accounts.real.json (login credentials preserved).
  2) The tourist "Local experiences, recommended for you" catalog -> hydrated from
     the `provider` table via the FastAPI service (loma-app/logging-api GET /providers),
     best-effort with the bundled catalog as a fallback.

Idempotent — running twice is a no-op (guarded by a marker). Run AFTER
_wire_booking_backend.py (it reuses LOMA_API_BASE when present):

    python _wire_booking_backend.py
    python _wire_real_data.py
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA real-data layer"

src = io.open(HTML, encoding="utf-8").read()
if MARKER in src:
    print("already wired — nothing to do")
    sys.exit(0)


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


# --------------------------------------------------------------------------------------
# 1) Real demand-partner accounts (from accounts.real.json). x/y are the real lat/lng
#    projected onto the stylised map with loma-app's PHUKET_BBOX; housePicks are the
#    nearest well-rated real providers (operator ids present in window.LOMA_DATA).
# --------------------------------------------------------------------------------------
OLD_ACCOUNTS = """/* demand-partner accounts — 3 are pre-approved with working credentials */
const ACCOUNTS = [
  { id:"seabreeze",  name:"Sea Breeze Boutique Hotel", type:"Hotel",           area:"Patong",  user:"seabreeze",   pass:"breeze2026", staff:"Jirawan D.",  staffInit:"JD", staffCount:3, x:58, y:60, status:"approved", level:"verified", kind:"org", inviteCode:"SEABREEZE24", housePicks:["BRT","OTH","PCH"] },
  { id:"kata",       name:"Kata Backpackers Hostel",   type:"Hostel",          area:"Kata",    user:"katahostel",  pass:"kata2026",   staff:"Nattapong S.",staffInit:"NS", staffCount:2, x:50, y:74, status:"approved", level:"verified", kind:"org", inviteCode:"KATA24", housePicks:["RFE","BRT"] },
  { id:"rawai",      name:"Rawai Scooter Rental",      type:"Motorbike rental",area:"Rawai",   user:"rawairental", pass:"rawai2026",  staff:"Som P.",      staffInit:"SP", staffCount:1, x:54, y:82, status:"approved", level:"verified", kind:"org", inviteCode:"RAWAI24", housePicks:["BRT","RFE"] }
];"""

NEW_ACCOUNTS = """/* demand-partner accounts — REAL Phuket properties from accounts.real.json (LOMA
   real-data layer). x/y are the real lat/lng projected onto the stylised map with the
   same PHUKET_BBOX loma-app uses; housePicks are the nearest well-rated real providers.
   The first 3 keep their working demo credentials. */
const ACCOUNTS = [
  { id:"seabreeze", name:"Istanbul Boutique Hotel", type:"Hotel", area:"Patong", user:"seabreeze", pass:"breeze2026", staff:"Jirawan D.", staffInit:"JD", staffCount:3, x:15, y:72, lat:7.8848849, lng:98.2936939, status:"approved", level:"verified", kind:"org", inviteCode:"SEABREEZE24", housePicks:["b1_0082", "b1_0731", "b1_0726"] },
  { id:"kata", name:"Tall Tree Kata Phuket", type:"Hostel", area:"Kata", user:"katahostel", pass:"kata2026", staff:"Nattapong S.", staffInit:"NS", staffCount:2, x:19, y:85, lat:7.8192936, lng:98.30835569999999, status:"approved", level:"verified", kind:"org", inviteCode:"KATA24", housePicks:["b1_0043", "b1_0440", "b1_0853"] },
  { id:"rawai", name:"RentaBikePhuket.com", type:"Motorbike rental", area:"Rawai", user:"rawairental", pass:"rawai2026", staff:"Somchai P.", staffInit:"SP", staffCount:1, x:22, y:94, lat:7.772522299999999, lng:98.3180797, status:"approved", level:"verified", kind:"org", inviteCode:"RAWAI24", housePicks:["b1_0339", "b1_0853", "b1_0440"] },
  { id:"bangtao", name:"Diamond Resort Phuket", type:"Hotel", area:"Bang Tao", user:"bangtaohotel", pass:"bangtao2026", staff:"", staffInit:"", staffCount:0, x:16, y:52, lat:7.9920757, lng:98.2991548, status:"approved", level:"org", kind:"org", inviteCode:"", housePicks:["b1_0350", "b1_0773", "b1_0696"] },
  { id:"naiyang", name:"Nai Yang Beach Resort & Spa", type:"Resort hotel", area:"Nai Yang", user:"naiyangresort", pass:"naiyang2026", staff:"", staffInit:"", staffCount:0, x:16, y:33, lat:8.0882963, lng:98.297945, status:"approved", level:"org", kind:"org", inviteCode:"", housePicks:["b1_0429", "b1_0385", "b1_0876"] }
];"""

src = sub_once(src, OLD_ACCOUNTS, NEW_ACCOUNTS, "accounts")


# --------------------------------------------------------------------------------------
# 2) Provider catalog hydrated from the `provider` table (GET /providers). Appended at
#    the end of the app script (after the booking layer, whose LOMA_API_BASE it reuses).
# --------------------------------------------------------------------------------------
PROVIDER_LAYER = r"""
/* ===== LOMA real-data layer: provider catalog ===================================
   The tourist "Local experiences, recommended for you" lists are driven by
   window.LOMA_DATA.operators; here we refresh that catalog from the `provider` table
   via the FastAPI service (loma-app/logging-api GET /providers) on load. Best-effort:
   existing shops get their live name/rating/reviews/open state refreshed from the DB,
   and any provider not in the bundled catalog is adopted (shape-adapted). If the API
   is unreachable the bundled catalog is used, exactly as before.
================================================================================= */
var _LOMA_API_BASE = (function(){
  try{ if(typeof LOMA_API_BASE!=='undefined' && LOMA_API_BASE) return LOMA_API_BASE; }catch(e){}
  try{ var q=new URLSearchParams(location.search).get('api'); if(q) return q.replace(/\/+$/,''); }catch(e){}
  if(window.LOMA_API_BASE) return String(window.LOMA_API_BASE).replace(/\/+$/,'');
  return 'http://'+(location.hostname||'localhost')+':8000';
})();
var LOMA_ASSET_BASE = 'https://storage.googleapis.com/gradient-digital-group-loma-assets';
function _lomaAsset(p){ if(!p) return p; return /^https?:\/\//.test(p) ? p : LOMA_ASSET_BASE+(p.charAt(0)==='/'?p:'/'+p); }
function _lomaProject(lat,lng){
  var x=((lng-98.24)/0.36)*100, y=((8.26-lat)/0.52)*100;
  return {x:Math.min(96,Math.max(4,Math.round(x))), y:Math.min(94,Math.max(6,Math.round(y)))};
}
function _lomaCat(c){ return ({'Café & Dessert':'Café','Street Food & Noodles':'Local Food','Seafood':'Local Food'})[c] || c || 'Local Food'; }
function _lomaPrice(r){ if(r.price) return r.price; return ({budget:'฿',moderate:'฿฿',premium:'฿฿฿'})[r.price_range] || '฿฿'; }
/* Adapt a raw DB provider row (providers.json shape) to the operator shape the tourist
   catalog renders. Used only for providers not already in the bundled catalog. */
function _lomaProvToOp(r){
  var pos=(r.lat!=null&&r.lng!=null)?_lomaProject(r.lat,r.lng):{x:30,y:50};
  var conf=({HIGH:92,MEDIUM:82,LOW:72})[String(r.confidence||'').toUpperCase()]||80;
  var hours=Array.isArray(r.hours)?'':(r.hours||'');
  return {
    id:r.id, name:r.name, cat:_lomaCat(r.category), emo:r.emo||'📍', area:r.area||'',
    mapX:pos.x, mapY:pos.y, dist:'', price:_lomaPrice(r), priceText:r.price_range||'',
    open:!!r.openNow, hours:hours, local:true,
    verified:(r.verification_status==='verified'), vettingStatus:r.verification_status||'pending',
    quality:conf, locality:conf, readiness:conf, safety:conf, loma_score:conf,
    rating:r.rating, reviews:r.reviews, branches:1, lang:'', booking:'', contact:r.phone||'',
    pick:false, bestFor:[], img:_lomaAsset(r.photo),
    reason:'', whyLocal:'', note:r.address||'', sum:r.summary||'',
    social:r.social||{}, leads:0, opens:0, visits:0,
    /* real map + contact data straight from the provider table (for Get Directions etc.) */
    mapsUrl:r.mapsUrl||'', placeId:r.placeId||'', lat:(r.lat!=null?r.lat:null), lng:(r.lng!=null?r.lng:null),
    address:r.address||'', website:r.website||'', phone:r.phone||''
  };
}
/* Pull the catalog from the DB and reconcile it with the in-memory operators, then
   re-render so "Local experiences, recommended for you" reflects the provider table. */
function lomaHydrateProviders(){
  try{
    fetch(_LOMA_API_BASE+'/providers').then(function(x){return x.ok?x.json():null;}).then(function(rows){
      if(!Array.isArray(rows)||!rows.length) return;
      var ops=(window.LOMA_DATA&&window.LOMA_DATA.operators)||[];
      var byId={}; ops.forEach(function(o){ byId[o.id]=o; });
      var refreshed=0, added=0;
      rows.forEach(function(r){
        if(!r||!r.id) return;
        var o=byId[r.id];
        if(o){
          if(r.name!=null) o.name=r.name;
          if(r.rating!=null) o.rating=r.rating;
          if(r.reviews!=null) o.reviews=r.reviews;
          if(r.area!=null) o.area=r.area;
          if(r.openNow!=null) o.open=!!r.openNow;
          /* real map + contact data from the provider table */
          if(r.mapsUrl!=null) o.mapsUrl=r.mapsUrl;
          if(r.placeId!=null) o.placeId=r.placeId;
          if(r.lat!=null) o.lat=r.lat;
          if(r.lng!=null) o.lng=r.lng;
          if(r.address!=null) o.address=r.address;
          if(r.website!=null) o.website=r.website;
          if(r.phone!=null) o.phone=r.phone;
          refreshed++;
        } else {
          var op=_lomaProvToOp(r); ops.push(op); byId[op.id]=op; added++;
        }
      });
      try{ console.info('[LOMA] providers hydrated from DB — '+refreshed+' refreshed, '+added+' new ('+ops.length+' total)'); }catch(e){}
      if(typeof render==='function') render();
    }).catch(function(){});
  }catch(e){}
}
lomaHydrateProviders();
"""

# Append the provider layer at the very end of the app script (before its </script>).
idx = src.rfind("</script>")
if idx == -1:
    raise SystemExit("[providers] no </script> found")
src = src[:idx] + PROVIDER_LAYER + "\n" + src[idx:]

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html to real data (accounts + provider catalog)")
