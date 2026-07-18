#!/usr/bin/env python3
"""One-shot patcher: wire LOMA.html's community-booking flow to the real DB-backed
FastAPI service (loma-app/logging-api). Idempotent — running twice is a no-op because
each replacement is guarded by a marker. Run:  python _wire_booking_backend.py
"""
import io, sys

HTML = "LOMA.html"
MARKER = "LOMA booking backend"

src = io.open(HTML, encoding="utf-8").read()
if MARKER in src:
    print("already wired — nothing to do")
    sys.exit(0)


def sub_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"[{label}] expected exactly 1 match, found {n}")
    return text.replace(old, new)


# 1) Tourist creates a booking -> route through lomaAddBooking (optimistic + POST).
src = sub_once(
    src,
    "state.myBookings.push({id,dayIdx:+di,round:r,pax:state.bookGuests});",
    "lomaAddBooking(id,+di,r,state.bookGuests);",
    "create",
)

# 2) Tourist cancels -> route through lomaCancelBooking (splice + DELETE).
src = sub_once(
    src,
    "if(cancelb){state.myBookings.splice(+cancelb.dataset.cancelbook,1);toast('Booking cancelled');renderTourist();return;}",
    "if(cancelb){lomaCancelBooking(+cancelb.dataset.cancelbook);toast('Booking cancelled');renderTourist();return;}",
    "cancel",
)

# 3) Host check-in -> also PATCH the booking to attended in the DB.
src = sub_once(
    src,
    "function checkInBooking(b,c){\n  b.status='attended';",
    "function checkInBooking(b,c){\n  b.status='attended';\n  lomaCheckIn(b);",
    "checkin",
)

# 4) Append the API layer + hydrate at the very end of the app script.
API_LAYER = r"""
/* ===== LOMA booking backend =====================================================
   Persists community-experience bookings to the real database via the FastAPI
   service (loma-app/logging-api -> `booking` table). Best-effort: if the API is
   unreachable the app keeps working entirely in-memory, exactly as before.
   Point it at a different host with  window.LOMA_API_BASE  or  ?api=http://host:8000
================================================================================= */
var LOMA_API_BASE = (function(){
  try{ var q=new URLSearchParams(location.search).get('api'); if(q) return q.replace(/\/+$/,''); }catch(e){}
  if(window.LOMA_API_BASE) return String(window.LOMA_API_BASE).replace(/\/+$/,'');
  return 'http://'+(location.hostname||'localhost')+':8000';
})();
function _lomaIso(di){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+di);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _lomaDayIdx(iso){ var t=new Date(iso+'T00:00:00'), n=new Date(); n.setHours(0,0,0,0);
  return Math.round((t-n)/86400000); }
function _lomaHotel(){ try{ return (PARTNER&&PARTNER.name)||'LOMA app'; }catch(e){ return 'LOMA app'; } }
/* Tourist self-books: push locally now (snappy UI), persist to the DB, then adopt the
   server-minted ref so a later cancel/check-in targets the right row. */
function lomaAddBooking(id,di,r,pax){
  var b={id:id,dayIdx:di,round:r,pax:pax,date:_lomaIso(di),status:'confirmed',self:true,hotel:_lomaHotel(),guest:'App guest'};
  state.myBookings.push(b);
  try{ fetch(LOMA_API_BASE+'/bookings',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({community_id:id,date:b.date,round:r,pax:pax,hotel:b.hotel,guest:b.guest,self_serve:true})})
    .then(function(x){return x.ok?x.json():null;})
    .then(function(row){ if(row&&row.ref) b.ref=row.ref; }).catch(function(){}); }catch(e){}
  return b;
}
function lomaCancelBooking(i){
  var b=state.myBookings[i]; state.myBookings.splice(i,1);
  if(b&&b.ref){ try{ fetch(LOMA_API_BASE+'/bookings/'+encodeURIComponent(b.ref),{method:'DELETE'}).catch(function(){}); }catch(e){} }
}
function lomaCheckIn(b){
  if(b&&b.ref){ try{ fetch(LOMA_API_BASE+'/bookings/'+encodeURIComponent(b.ref),{method:'PATCH',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'attended'})}).catch(function(){}); }catch(e){} }
}
/* On load, replace the in-memory bookings with what's really in the DB (only rows for
   communities this build knows about), so a reload — or another device — shows the
   same live bookings. */
function lomaHydrateBookings(){
  try{
    fetch(LOMA_API_BASE+'/bookings').then(function(x){return x.ok?x.json():null;}).then(function(rows){
      if(!Array.isArray(rows)) return;
      var known=(typeof COMM==='function');
      state.myBookings = rows.filter(function(r){ return !known || COMM(r.id); }).map(function(r){
        return {id:r.id,dayIdx:_lomaDayIdx(r.date),round:r.round,pax:r.pax,date:r.date,
                ref:r.ref,status:r.status,hotel:r.hotel,guest:r.guest,self:r['self']};
      });
      if(typeof render==='function') render();
    }).catch(function(){});
  }catch(e){}
}
lomaHydrateBookings();
"""

src = sub_once(src, "\nrender();\n</script>", "\nrender();\n" + API_LAYER + "\n</script>", "append")

io.open(HTML, "w", encoding="utf-8", newline="").write(src)
print("wired LOMA.html to the booking backend (4 edits applied)")
