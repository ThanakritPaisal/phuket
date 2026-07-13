const {JSDOM}=require('jsdom');const fs=require('fs');
const dom=new JSDOM(fs.readFileSync('LOMA-prototype.html','utf8'),{runScripts:'dangerously',url:'http://x/'});
const w=dom.window,d=w.document;
let p=0,f=0;const T=(n,c,got)=>{c?(p++,console.log('  ✓ '+n)):(f++,console.log('  ✗ FAIL '+n+(got?'  → got: '+got.slice(0,70):'')));};
setTimeout(()=>{
const ask=q=>w.eval('botAnswer('+JSON.stringify(q)+')');
console.log('━━ Thai questions ━━');
const cases=[
 ['ไวไฟคือรหัสไหน','staylocal2026'],
 ['รหัสไวไฟ','staylocal2026'],
 ['อาหารเช้ากี่โมง','07:00'],
 ['เช็คเอาต์กี่โมง','12:00'],
 ['เช็คอินกี่โมง','14:00'],
 ['สระว่ายน้ำเปิดกี่โมง','07:00'],
 ['เบอร์แผนกต้อนรับ','+66 76'],
 ['สูบบุหรี่ได้ไหม','กฎของโรงแรม'],
 ['ยิมอยู่ไหน','ยิม'],
 ['ฝากกระเป๋าได้ไหม','ฝากกระเป๋า'],
 ['มีที่จอดรถไหม','ที่จอดรถ'],
 ['ซักผ้าได้ไหม','ซักรีด'],
 ['แถวนี้กินอะไรดี','สำรวจ'],
 ['อยากไปนวด','สำรวจ'],
 ['ที่เที่ยวแนะนำ','สำรวจ'],
];
cases.forEach(([q,expect])=>{const a=ask(q);T('"'+q+'"', a.includes(expect), a);});
console.log('\n━━ English typos (the "restuarant" bug) ━━');
[['nearby restuarant','Explore'],['restarant near me','Explore'],['wify password','staylocal2026'],['brekfast','07:00'],['where to eat','Explore']]
 .forEach(([q,e])=>{const a=ask(q);T('"'+q+'"', a.includes(e), a);});
console.log('\n━━ replies come back in the right language ━━');
T('Thai question → Thai answer', /[฀-๿]/.test(ask('รหัสไวไฟ')));
T('English question → English answer', !/[฀-๿]/.test(ask('wifi password')));
T('unknown Thai → Thai fallback', /[฀-๿]/.test(ask('มีเตารีดไหม')));
T('unknown English → English fallback', !/[฀-๿]/.test(ask('do you have an iron')));
w.eval("state.lang='ไทย'");
T('UI set to Thai → English question still answered in Thai', /[฀-๿]/.test(ask('wifi')));
T('Thai quick-reply chips', w.eval("faqChips()[0][0]").includes('อาหารเช้า'));
w.eval("state.lang='EN'");
T('English chips restored', w.eval("faqChips()[0][0]").includes('Breakfast'));
console.log('\n  PASS '+p+'  FAIL '+f);
},1200);
