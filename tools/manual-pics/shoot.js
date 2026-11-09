// Retakes the manual's app pictures (rev 206). Run: NODE_PATH=... node tools/manual-pics/shoot.js  (writes PNGs to ./new; then swap them into MANUAL in preview/next.html)
const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 14 Pro Max'],viewport:{width:430,height:932},deviceScaleFactor:2}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file:///home/claude/inkhorse/preview/next.html'); await p.waitForTimeout(2500);
 await p.evaluate(()=>{ S.tips=false; S.dev='screen'; S.view='auto'; saveSettings(); document.querySelectorAll('#toast').forEach(t=>t.hidden=true); });
 const hideToast=()=>p.evaluate(()=>{ const t=document.querySelector('#toast'); if(t){ t.hidden=true; t.classList.remove('show'); t.style.display='none'; } });
 const el=async(sel,name)=>{ await hideToast(); const h=await p.$(sel); await h.screenshot({path:'new/'+name+'.png'}); };
 fs.mkdirSync('new',{recursive:true});
 // Read screen
 await p.evaluate(()=>{ setTab('read'); goTo({ch:rOrder()[0],i:0}); drawView(); }); await p.waitForTimeout(900); await hideToast();
 await p.screenshot({path:'new/read.png'});
 await el('#read .bar','toolbar'); await el('#read .flip','flip'); { const r=await p.evaluate(()=>{ const b=document.querySelector('#whereBtn').getBoundingClientRect(); return {x:b.left-4,y:b.top-12,width:b.width+8,height:b.height+16}; }); await hideToast(); await p.screenshot({path:'new/where.png',clip:r}); } await el('#deviceSel','devsel');
 // Book Hub
 await p.click('#whereBtn'); await p.waitForTimeout(500); await el('#goto','hub'); await p.click('#gotoDone'); await p.waitForTimeout(300);
 // Aa
 await p.click('#typeBtn'); await p.waitForTimeout(400); await el('#typeSheet','aa'); await p.evaluate(()=>toggleSheet(false));
 // highlighter bar with a highlight
 await p.click('#hlBtn'); await p.waitForTimeout(300);
 await p.evaluate(()=>{ const box=document.querySelector('#spread .ptext[data-ch]'); const ch=box.dataset.ch; const ws=[...box.querySelectorAll('[data-w]')].map(e=>+e.dataset.w); addMark(ch,ws[2],ws[14]); drawView(); });
 await p.waitForTimeout(3500); await hideToast();
 const bb=await p.evaluate(()=>{ const r=document.querySelector('#hlBar').getBoundingClientRect(), s=document.querySelector('#stage').getBoundingClientRect(); return {x:s.left,y:r.top-6,w:s.width,h:300}; });
 await p.screenshot({path:'new/hlbar.png',clip:{x:bb.x,y:bb.y,width:bb.w,height:bb.h}});
 await p.click('#hlBtn'); await p.waitForTimeout(300);
 // player
 await p.click('#listenBtn'); await p.waitForTimeout(600); await p.evaluate(()=>{ if(TTS.playing) ttsPause(); }); await p.waitForTimeout(300); await el('#ttsBar','player');
 await p.click('#listenBtn'); await p.waitForTimeout(300);
 // Compare
 await p.evaluate(()=>setTab('compare')); await p.waitForTimeout(1200); await hideToast(); await p.screenshot({path:'new/compare.png'});
 // Chapters panel full
 await p.evaluate(()=>setTab('write')); await p.click('#chBtn'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ const d=document.querySelector('#drawer'); d.style.position='absolute'; d.style.height='auto'; d.style.maxHeight='none'; d.style.overflow='visible'; d.style.bottom='auto'; d.querySelectorAll('*').forEach(x=>{ const cs=getComputedStyle(x); if(/auto|scroll/.test(cs.overflowY)){ x.style.overflow='visible'; x.style.maxHeight='none'; x.style.height='auto'; } }); });
 await p.waitForTimeout(300); await el('#drawer','chapters');
 console.log('errors',errs.slice(0,3)); await b.close(); })();
