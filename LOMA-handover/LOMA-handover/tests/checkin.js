const {JSDOM}=require('jsdom');const fs=require('fs');
const dom=new JSDOM(fs.readFileSync('LOMA-prototype.html','utf8'),{runScripts:'dangerously',url:'http://x/'});
const w=dom.window,d=w.document;
const click=el=>{if(!el)throw new Error('missing el');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
const q=s=>d.querySelector(s),qa=s=>[...d.querySelectorAll(s)];
const PT=n=>qa('#personaTabs button').find(b=>b.dataset.persona===n);
const HP=()=>d.getElementById('providerScroll').innerHTML;
const toast=()=>d.getElementById('toast').textContent;
let p=0,f=0;const T=(n,c)=>{c?(p++,console.log('  ✓ '+n)):(f++,console.log('  ✗ FAIL '+n));};
setTimeout(()=>{try{
console.log('━━ tourist books a community round ━━');
click(PT('tourist'));
w.eval("state.curComm='bangrong';state.bookDate=0;state.bookGuests=4;state.tourist='communityDetail';renderTourist()");
click(q('#touristScroll [data-book]'));
console.log('  bookings:', w.eval('JSON.stringify(state.myBookings)'));
T('booking created', w.eval('state.myBookings.length')===1);
T('starts as NOT attended', w.eval("state.myBookings[0].status")!=='attended');
const e0=w.eval("econTotals().exact");
T('฿0 counted before check-in (a booking is not a visit)', e0===0);
console.log('  econ before check-in:', w.eval('JSON.stringify(econTotals())'));

console.log('\n━━ community host signs in and scans the guest ━━');
click(PT('provider'));
d.getElementById('pvUser').value='bangrong';d.getElementById('pvPass').value='bangrong2026';
click(q('[data-pvlogin]'));
T('lands on the community Home', HP().includes('Hotels are sending'));
click(qa('[data-chgo]').find(b=>b.dataset.chgo==='checkin'));
T('scan-QR button exists (like other providers)', !!q('[data-commscan]') && HP().includes("Scan the guest's QR code"));
T('guest row awaiting check-in', HP().includes('Awaiting check-in'));
T('per-guest Check in button', !!q('[data-checkin]'));
T('per-guest No-show button', !!q('[data-noshow]'));
T('code shown for the guest', /LOMA-[A-Z0-9]{4}/.test(HP()));
const c0=w.eval('impactCredits()');
click(q('[data-commscan]'));
T('scanning checks the guest in', HP().includes('✓ Checked in'));
T('toast shows income recorded', /local income recorded/.test(toast()));
T('confirmed-visit event fired', w.eval("TRACKING_EVENTS.filter(e=>e.event_type==='provider_confirmed_visit'&&e.community_id==='bangrong').length")===1);
T('hotel earned credits (×1.5 community)', w.eval('impactCredits()')>c0);
console.log('  credits', c0, '→', w.eval('impactCredits()'), '| toast:', toast());

console.log('\n━━ only NOW does it count as money ━━');
const t2=JSON.parse(w.eval('JSON.stringify(econTotals())'));
console.log('  econ after check-in:', JSON.stringify(t2));
T('exact impact recorded', t2.exact>0 && t2.nx===1);
T('valued at pax × published price', t2.exact===4*w.eval("priceMid({priceText:COMM('bangrong').priceFrom})"));

console.log('\n━━ no-show is worth ฿0 ━━');
click(q('[data-undoattend]'));
click(q('[data-noshow]'));
T('marked no-show', HP().includes('No-show'));
T('฿0 counted', w.eval('econTotals().exact')===0);
T('counted in the no-show stat', w.eval('econTotals().noshows')===1);

console.log('\n━━ admin panel is honest about it ━━');
click(PT('admin')); click(q('[data-ap="econ"]'));
const h=d.getElementById('adminMain').innerHTML;
T('"A booking is not a visit" on screen', h.includes('A booking is not a visit'));
T('shows pending (not counted)', h.includes('not yet checked in'));
T('shows no-shows at ฿0', h.includes('No-shows · ฿0 counted'));
}catch(e){f++;console.log('  ✗ EXCEPTION: '+e.message);}
console.log('\n  PASS '+p+'  FAIL '+f);
},1500);
