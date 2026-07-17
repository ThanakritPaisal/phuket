#!/usr/bin/env python3
"""One-shot patcher: make LOMA.html's tourist actions real and DB-connected.

  * Get Directions  -> real Google Maps, using the provider table's mapsUrl / placeId /
                       coordinates (populated by _wire_real_data.py), with a name+area
                       search fallback. Applies to provider cards AND event cards.
  * Contact / Save  -> real tel:/website links and a persistent device save.
  * Share via       -> a real, self-locating link (?p=<id>&ref=<code>) that opens the
                       actual app; the app now handles that incoming link and opens the
                       right card. Native share stays; every send is logged.
  * Referral code   -> the code is carried in the share link and logged end-to-end.
  * Funnel logging  -> share / open / directions / contact POST to the DB (/events),
                       matching the logging-api event taxonomy.

All best-effort — nothing blocks if the API is down. Idempotent (marker-guarded).
Run AFTER _wire_booking_backend.py and _wire_real_data.py:

    python _wire_live_actions.py
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA real-data layer: live actions"

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
# 1) Get Directions — provider card (real maps from the DB provider row) + funnel log.
# --------------------------------------------------------------------------------------
src = sub_once(
    src,
    """<button class="btn btn-coral" onclick="toast('Opening maps…')">${I.nav} ${T('Get Directions')}</button>""",
    """<a class="btn btn-coral" href="${lomaMapsUrl(p)}" target="_blank" rel="noopener" onclick="lomaLog('provider_card_viewed','${p.id}','directions',{action:'directions'})">${I.nav} ${T('Get Directions')}</a>""",
    "directions-provider",
)

# 2) Get Directions — tourist event card.
src = sub_once(
    src,
    """<button class="btn btn-primary" onclick="toast('Opening in Google Maps…')">${I.nav} Get Directions</button>""",
    """<a class="btn btn-primary" href="${lomaEventMapUrl(e)}" target="_blank" rel="noopener">${I.nav} Get Directions</a>""",
    "directions-event-tourist",
)

# 3) Directions — staff event detail.
src = sub_once(
    src,
    """<button class="btn btn-ghost" onclick="toast('Opening in maps…')">${I.nav} Directions</button>""",
    """<a class="btn btn-ghost" href="${lomaEventMapUrl(e)}" target="_blank" rel="noopener">${I.nav} Directions</a>""",
    "directions-event-staff",
)

# 4) Contact — real tel:/website link.
src = sub_once(
    src,
    """<button class="btn btn-ghost" onclick="toast('Contacting provider…')">${I.phone} ${T('Contact')}</button>""",
    """<a class="btn btn-ghost" href="${lomaContactUrl(p)}" onclick="lomaLog('provider_card_viewed','${p.id}','contact',{action:'contact'})">${I.phone} ${T('Contact')}</a>""",
    "contact",
)

# 5) Save — persist to this device for real.
src = sub_once(
    src,
    """<button class="btn btn-line" onclick="toast('Saved to this device')">${I.heart} ${T('Save')}</button>""",
    """<button class="btn btn-line" onclick="lomaSave('${p.id}')">${I.heart} ${T('Save')}</button>""",
    "save",
)

# 6) shareLink — real, self-locating URL that the app can open.
src = sub_once(
    src,
    """function shareLink(id){
  if(id&&EV(id)) return 'https://loma.app/e/'+refFor(id);
  return id==='PLAN' ? 'https://loma.app/r/LOMA-PLAN-'+(1000+(state.filter.mode==='route'?state.routeDest:'plan').length*611%9000) : 'https://loma.app/r/'+refFor(id);}""",
    """function shareLink(id){
  var base; try{ base=(location.protocol==='file:')?'https://loma.app/':(location.origin+location.pathname); }catch(e){ base='https://loma.app/'; }
  if(id&&EV(id)) return base+'?e='+encodeURIComponent(id)+'&ref='+refFor(id);
  if(id==='PLAN') return base+'?plan=1';
  return base+'?p='+encodeURIComponent(id)+'&ref='+refFor(id);}""",
    "shareLink",
)

# 7) Log the share the moment the guest opens a channel (WhatsApp/LINE/SMS/Email).
src = sub_once(
    src,
    """  const openBtn=(label,href,color)=>`<a href="${href}" target="_blank" rel="noopener" class="btn" style="background:${color};color:#fff;margin-top:10px;text-decoration:none">↗ Open in ${label}</a>`;""",
    """  const openBtn=(label,href,color)=>`<a href="${href}" target="_blank" rel="noopener" class="btn" style="background:${color};color:#fff;margin-top:10px;text-decoration:none" onclick="lomaLog('link_shared','${id}','${label}')">↗ Open in ${label}</a>`;""",
    "share-openbtn-log",
)

# 8) Real, scannable QR codes (encode the actual link) — referral card + share preview
#    + the hotel counter standees. Falls back to a QR image service if the shipped lib
#    (data/qrcode.browser.js -> window.LomaQR) isn't loaded.
src = sub_once(src, """<div class="qr">${qrSVG()}</div>""",
               """<div class="qr">${lomaQR(shareLink(p.id))}</div>""", "qr-tourist-ref")
src = sub_once(src, """width:150px;height:150px;margin:0 auto 8px">${qrSVG()}""",
               """width:150px;height:150px;margin:0 auto 8px">${lomaQR(link)}""", "qr-share-preview")
src = sub_once(src, """width:152px;height:152px;margin:14px auto">${qrSVG()}""",
               """width:152px;height:152px;margin:14px auto">${lomaQR(lomaShareBase())}""", "qr-standee")
src = sub_once(src, """padding:10px;border:1px solid var(--line)">${qrSVG()}""",
               """padding:10px;border:1px solid var(--line)">${lomaQR(lomaShareBase())}""", "qr-reclist")

# Load the shipped QR library so lomaQR can render a real, scannable code.
src = sub_once(src, "</body>",
               """<script src="data/qrcode.browser.js"></script>\n</body>""", "qr-lib")

# --------------------------------------------------------------------------------------
# 9) Append the live-actions JS layer (helpers + inbound deep-link + logging).
# --------------------------------------------------------------------------------------
LAYER = r"""
/* ===== LOMA real-data layer: live actions ======================================
   Real Google Maps directions from the provider table, real share/referral links,
   and DB funnel logging (/events). Best-effort — nothing blocks if the API is down.
================================================================================= */
function _lomaApiBase(){
  try{ if(typeof _LOMA_API_BASE!=='undefined' && _LOMA_API_BASE) return _LOMA_API_BASE; }catch(e){}
  try{ if(typeof LOMA_API_BASE!=='undefined' && LOMA_API_BASE) return LOMA_API_BASE; }catch(e){}
  return 'http://'+(location.hostname||'localhost')+':8000';
}
function lomaSession(){
  try{ var k='loma_sid', v=localStorage.getItem(k);
    if(!v){ v='ts_'+Math.abs((Date.now()^(location.href.length*2654435761))>>>0).toString(36)
              +Math.floor((typeof performance!=='undefined'?performance.now():0)).toString(36);
            localStorage.setItem(k,v); }
    return v;
  }catch(e){ return 'ts_anon'; }
}
/* POST one funnel event to the DB (fire-and-forget). Shapes match logging-api EventIn. */
function lomaLog(type, provider_id, channel, meta){
  try{
    var body={ event_type:type, tourist_session_id:lomaSession(),
      hotel_id:(typeof PARTNER!=='undefined'&&PARTNER&&PARTNER.id)||null,
      provider_id:provider_id||null, channel:channel||null, metadata:meta||{} };
    fetch(_lomaApiBase()+'/events',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body), keepalive:true}).catch(function(){});
  }catch(e){}
}
/* Real Google Maps URL for a provider operator, straight from the provider table:
   mapsUrl -> place_id search -> lat/lng directions -> name+area search. */
function lomaMapsUrl(o){
  if(o){
    if(o.mapsUrl) return o.mapsUrl;
    if(o.placeId) return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.name||'')+'&query_place_id='+encodeURIComponent(o.placeId);
    if(o.lat!=null&&o.lng!=null) return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(o.lat+','+o.lng);
  }
  var q=[o&&o.name, o&&o.area, 'Phuket'].filter(Boolean).join(' ');
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q||'Phuket');
}
function lomaEventMapUrl(e){ return lomaMapsUrl({ name:(e&&e.venue)||'', area:(e&&e.area)||'' }); }
/* The app's own base URL (so QR codes / share links point back to this deployment). */
function lomaShareBase(){
  try{ return (location.protocol==='file:')?'https://loma.app/':(location.origin+location.pathname); }
  catch(e){ return 'https://loma.app/'; }
}
/* A real, scannable QR that encodes `text`. Uses the shipped QR lib (window.LomaQR);
   falls back to a QR image service if the lib didn't load. */
function lomaQR(text){
  var t=text||lomaShareBase();
  try{
    if(window.LomaQR && LomaQR.create){
      var qr=LomaQR.create(t,{errorCorrectionLevel:'M'}), d=qr.modules.data, n=qr.modules.size, cells='';
      for(var y=0;y<n;y++)for(var x=0;x<n;x++){ if(d[y*n+x]) cells+='<rect x="'+x+'" y="'+y+'" width="1" height="1"/>'; }
      return '<svg viewBox="0 0 '+n+' '+n+'" width="100%" height="100%" fill="#0A3A73" shape-rendering="crispEdges">'+cells+'</svg>';
    }
  }catch(e){}
  return '<img alt="QR code" src="https://api.qrserver.com/v1/create-qr-code/?margin=0&size=220x220&data='+encodeURIComponent(t)+'" style="width:100%;height:100%;object-fit:contain"/>';
}
/* Real contact link — phone, else website, else maps. */
function lomaContactUrl(o){
  if(o&&o.phone) return 'tel:'+String(o.phone).replace(/[^+0-9]/g,'');
  if(o&&o.website) return o.website;
  return lomaMapsUrl(o);
}
/* Persist a saved pick on this device (survives reloads). */
function lomaSave(id){
  try{ var k='loma_saved', a=JSON.parse(localStorage.getItem(k)||'[]');
    if(a.indexOf(id)<0){ a.push(id); localStorage.setItem(k,JSON.stringify(a)); }
    if(typeof SAVED!=='undefined'&&SAVED&&SAVED.add) SAVED.add(id);
  }catch(e){}
  if(typeof toast==='function') toast('Saved to this device');
}
/* Incoming share/referral link: ?p=<providerId>&ref=<code> (or ?e=<eventId>). Opens the
   matching card as a tourist and logs received + opened. Runs once; retried while the
   provider catalog finishes hydrating from the DB. */
function lomaApplyIncomingLink(){
  if(window._lomaLinkApplied) return;
  var qs; try{ qs=new URLSearchParams(location.search); }catch(e){ return; }
  var pid=qs.get('p'), eid=qs.get('e'), ref=qs.get('ref');
  if(!pid && !eid) return;
  var meta=ref?{ref:ref}:{};
  if(pid && typeof P==='function' && P(pid)){
    window._lomaLinkApplied=true;
    try{ state.persona='tourist'; state.curProv=pid; state.tourist='card'; }catch(e){}
    lomaLog('link_received', pid, null, meta);
    lomaLog('link_opened', pid, null, meta);
    if(typeof render==='function') render();
  } else if(eid && typeof EV==='function' && EV(eid)){
    window._lomaLinkApplied=true;
    lomaLog('link_received', null, null, {event:eid, ref:ref||''});
    lomaLog('link_opened', null, null, {event:eid, ref:ref||''});
  }
}
try{ lomaApplyIncomingLink(); }catch(e){}
if(!window._lomaLinkApplied){
  try{
    var _lomaQ=new URLSearchParams(location.search);
    if(_lomaQ.get('p')||_lomaQ.get('e')){
      var _lomaLinkTries=0;
      var _lomaLinkIv=setInterval(function(){
        _lomaLinkTries++;
        try{ lomaApplyIncomingLink(); }catch(e){}
        if(window._lomaLinkApplied || _lomaLinkTries>20) clearInterval(_lomaLinkIv);
      }, 500);
    }
  }catch(e){}
}
"""

idx = src.rfind("</script>")
if idx == -1:
    raise SystemExit("[live-actions] no </script> found")
src = src[:idx] + LAYER + "\n" + src[idx:]

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html live actions (directions/contact/save/share/referral + logging)")
