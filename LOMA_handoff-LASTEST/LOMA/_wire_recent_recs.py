#!/usr/bin/env python3
"""One-shot patcher: make "Recent recommendations" show what staff actually shared.

The section was two hardcoded rows — Old Town Herbal Massage and Baan Rim Talay — that
never changed no matter what anyone did. Everything needed to make it real is already
being logged and already queryable:

    GET /events?hotel_id=<partner>&limit=400

  link_shared              -> the recommendation itself: which place, which channel, when
                              (22 events, 19 carry a provider_id)
  provider_card_viewed     -> "opened by tourist"        (41 providers)
  direction_clicked        -> "got directions"           (15)
  contact_clicked          -> "contacted them"           (11)
  provider_confirmed_visit -> "visit confirmed"          (9)
  positive_feedback        -> "left positive feedback"   (9)

Outcome beats share: we show the furthest the guest got, which is the number a concierge
actually cares about.

Idempotent — running twice is a no-op. Run AFTER _wire_loma_signals.py:

    python _wire_real_data.py
    python _wire_loma_signals.py
    python _wire_recent_recs.py
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA recent-recs layer"

src = io.open(HTML, encoding="utf-8").read()
if MARKER in src:
    print("already wired — nothing to do")
    sys.exit(0)
if "LOMA signals layer" not in src:
    raise SystemExit("run _wire_loma_signals.py first")


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


# --------------------------------------------------------------------------------------
# 1) Replace the two hardcoded rows with a live region.
# --------------------------------------------------------------------------------------
OLD_ROWS = """    <div class="h-sec">Recent recommendations</div>
    <div class="prow" data-prov="OTH"><div class="thumb" data-photo="${P('OTH').img}" data-emo="${P('OTH').emo}"></div><div class="info"><h3>Old Town Herbal Massage</h3><div class="m">Shared 2h ago · opened by tourist ✓</div><div class="bd">${localBadge()}<span class="badge b-verified">${I.verified}Verified</span></div></div></div>
    <div class="prow" data-prov="BRT"><div class="thumb" data-photo="${P('BRT').img}" data-emo="${P('BRT').emo}"></div><div class="info"><h3>Baan Rim Talay Local Kitchen</h3><div class="m">Shared yesterday · visit confirmed ✓</div><div class="bd">${localBadge()}<span class="badge b-pick">⭐ Staff pick</span></div></div></div>"""

NEW_ROWS = """    <div class="h-sec">Recent recommendations</div>
    ${_lomaRecentRows()}"""

src = sub_once(src, OLD_ROWS, NEW_ROWS, "recent-rows")

# --------------------------------------------------------------------------------------
# 2) The layer: fetch this partner's events, fold them into a per-provider timeline.
# --------------------------------------------------------------------------------------
LAYER = r"""
/* ===== LOMA recent-recs layer ===================================================
   "Recent recommendations" was two hardcoded rows. It now reflects what this partner
   actually shared, from the log table via GET /events.
================================================================================= */
var _lomaRecent = null;          /* null = not loaded yet, [] = loaded and empty */
var _lomaRecentFor = null;       /* which partner the cache belongs to */

/* Furthest the guest got, best first. A confirmed visit is worth more than an open. */
var _LOMA_OUTCOME = [
  ['positive_feedback',       'left positive feedback ✓'],
  ['provider_confirmed_visit','visit confirmed ✓'],
  ['contact_clicked',         'guest contacted them ✓'],
  ['direction_clicked',       'guest got directions ✓'],
  ['provider_card_viewed',    'opened by tourist ✓'],
  ['link_opened',             'link opened ✓']
];

function _lomaAgo(iso){
  try{
    var t=new Date(iso).getTime(); if(!t) return '';
    var m=Math.max(0,(Date.now()-t)/60000);
    if(m<60)  return Math.round(m)+'m ago';
    if(m<1440) return Math.round(m/60)+'h ago';
    var d=Math.round(m/1440);
    return d===1 ? 'yesterday' : d+'d ago';
  }catch(e){ return ''; }
}

/* Two fetches, and the split matters. /events returns the LATEST n by row_id, so a
   single broad fetch silently misses older shares — seabreeze has 3,113 events and its
   link_shared rows are hundreds deep. Ask for the shares BY TYPE (correct by
   construction, tiny), then pull recent activity for the outcomes. */
function _lomaLoadRecent(){
  var pid=(typeof PARTNER!=='undefined'&&PARTNER&&PARTNER.id)||null;
  if(!pid || _lomaRecentFor===pid) return;
  _lomaRecentFor=pid;
  var q='hotel_id='+encodeURIComponent(pid);
  Promise.all([
    fetch(_LOMA_API_BASE+'/events?event_type=link_shared&'+q+'&limit=50').then(function(x){return x.ok?x.json():null;}),
    fetch(_LOMA_API_BASE+'/events?'+q+'&limit=5000').then(function(x){return x.ok?x.json():null;})
  ]).then(function(res){
      var shareEvs=(res[0]&&res[0].events)||[];
      var allEvs=(res[1]&&res[1].events)||[];
      var shares={}, outcomes={};
      shareEvs.forEach(function(e){
        if(!e.provider_id) return;
        var s=shares[e.provider_id];
        if(!s || e.server_ts>s.ts) shares[e.provider_id]={ts:e.server_ts, channel:e.channel||''};
      });
      allEvs.forEach(function(e){
        if(!e.provider_id || e.event_type==='link_shared') return;
        (outcomes[e.provider_id]=outcomes[e.provider_id]||{})[e.event_type]=e.server_ts;
      });
      var out=Object.keys(shares).map(function(id){
        var got=outcomes[id]||{}, label='shared, no activity yet';
        for(var i=0;i<_LOMA_OUTCOME.length;i++){
          if(got[_LOMA_OUTCOME[i][0]]){ label=_LOMA_OUTCOME[i][1]; break; }
        }
        return {id:id, ts:shares[id].ts, channel:shares[id].channel, outcome:label};
      });
      out.sort(function(a,b){ return a.ts<b.ts?1:-1; });
      _lomaRecent=out.slice(0,4);
      try{ console.info('[LOMA] recent recommendations — '+out.length+' shared by '+pid); }catch(e){}
      if(typeof render==='function') render();
    })
    .catch(function(){ _lomaRecent=[]; });
}

/* Renders into the same .prow markup the hardcoded rows used. */
function _lomaRecentRows(){
  _lomaLoadRecent();
  if(_lomaRecent===null)
    return '<div class="prow"><div class="info"><div class="m">Loading recent recommendations…</div></div></div>';
  if(!_lomaRecent.length)
    return '<div class="prow"><div class="info"><div class="m">Nothing shared yet. Pick a place and send a guest a QR — it will show up here.</div></div></div>';
  return _lomaRecent.map(function(r){
    var p=(typeof P==='function')?P(r.id):null;
    var name=(p&&p.name)||r.id;
    var img=(p&&p.img)||'';
    var emo=(p&&p.emo)||'📍';
    var badge=(p&&p.loma&&p.loma.percentile>=90)?'<span class="badge b-gem">💎 Hidden Gem</span>'
             :((typeof localBadge==='function')?localBadge():'');
    var via=r.channel?(' via '+r.channel):'';
    return '<div class="prow" data-prov="'+r.id+'">'
         + '<div class="thumb" data-photo="'+img+'" data-emo="'+emo+'"></div>'
         + '<div class="info"><h3>'+name+'</h3>'
         + '<div class="m">Shared '+_lomaAgo(r.ts)+via+' · '+r.outcome+'</div>'
         + '<div class="bd">'+badge+'</div></div></div>';
  }).join('');
}
"""

src = sub_once(src, "\nlomaHydrateProviders();", LAYER + "\nlomaHydrateProviders();", "recent-layer")

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html recent-recs layer:")
print("  · 'Recent recommendations' now reads GET /events?hotel_id=<partner>")
print("  · link_shared defines the list; the furthest outcome is shown per place")
print("  · empty and loading states handled")
