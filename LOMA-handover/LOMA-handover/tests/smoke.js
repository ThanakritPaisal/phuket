const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(fs.readFileSync('LOMA-prototype.html','utf8'),{runScripts:'dangerously',url:'http://x/',virtualConsole:vc});
const w=dom.window,d=w.document;
const click=el=>el&&el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const PT=n=>[...d.querySelectorAll('#personaTabs button')].find(b=>b.dataset.persona===n);
setTimeout(()=>{
  let bad=0;
  const chk=(who,s,h)=>{ if(h.length<200){console.log(' ⚠ '+who+'/'+s+' thin ('+h.length+')');bad++;}
    if(/undefined|NaN/.test(h)){console.log(' ⚠ '+who+'/'+s+' contains undefined/NaN');bad++;} };
  click(PT('staff'));
  d.getElementById('loginUser').value='seabreeze';d.getElementById('loginPass').value='breeze2026';
  click(d.querySelector('[data-login]'));
  click(d.querySelector('[data-go="saved"]')); click(d.querySelector('[data-passiveqr]'));
  ['home','assist','results','detail','recent','saved','impact','reviews','settings','hotelinfo','route','halfday','qrlink'].forEach(s=>{
    try{ w.eval("state.staff='"+s+"';renderStaff()"); chk('staff',s,d.getElementById('staffScroll').innerHTML); }catch(e){console.log(' ✗ staff/'+s+': '+e.message);bad++;}});
  ['reclist','card','selfserve','community','communityDetail','bookings','chat','feedback','thanks','ref','route'].forEach(s=>{
    try{ w.eval("state.tourist='"+s+"';renderTourist()"); chk('tourist',s,d.getElementById('touristScroll').innerHTML); }catch(e){console.log(' ✗ tourist/'+s+': '+e.message);bad++;}});
  ['overview','candidates','shortlist','queue','approved','communities','impact','funnel','providers','partners','category','map','verify','partnerapps','integrity','feedback'].forEach(s=>{
    try{ w.eval("state.admin='"+s+"';renderAdmin()"); chk('admin',s,d.getElementById('adminMain').innerHTML); }catch(e){console.log(' ✗ admin/'+s+': '+e.message);bad++;}});
  click(PT('provider'));
  d.getElementById('pvUser').value='baanrimtalay';d.getElementById('pvPass').value='kitchen2026';
  click([...d.querySelectorAll('#providerScroll button')].find(b=>/sign in/i.test(b.textContent)));
  ['home','leads','confirm','done','reviews','profile','edit'].forEach(s=>{
    try{ w.eval("state.provider='"+s+"';renderProvider()"); chk('provider',s,d.getElementById('providerScroll').innerHTML); }catch(e){console.log(' ✗ provider/'+s+': '+e.message);bad++;}});
  console.log('\nJS errors on load:',errs.length, errs.slice(0,2));
  console.log('Screens with problems:',bad);
  console.log(bad===0&&errs.length===0 ? '\n✅ SMOKE CLEAN — 47 screens render across 4 personas' : '\n⚠ see above');
},1500);
