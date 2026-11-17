// Retakes the manual's whole-screen pictures (Write, Read, Compare) and the Highlighter picture (rev 261: the new horse in the header sign).
// Run from the repo root with a local server on 8765:  NODE_PATH=... node tools/manual-pics/shoot-screens.js <out-folder> [page]
// then:  python3 -I tools/manual-pics/swap.py <out-folder> preview/next.html
const { chromium, devices } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const out=process.argv[2]||'new', page=process.argv[3]||'preview/next.html'; fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 14 Pro Max'],viewport:{width:430,height:932},deviceScaleFactor:2,colorScheme:'light'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8765/'+page); await p.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.some(x=>x.id==='manual'),null,{timeout:30000}); await p.waitForTimeout(2500);
 await p.evaluate(()=>{ S.tips=false; S.dev='screen'; S.view='auto'; saveSettings(); });
 const quiet=()=>p.evaluate(()=>{ const t=document.querySelector('#toast'); if(t){ t.hidden=true; t.classList.remove('show'); t.style.display='none'; } });
 const shot=async name=>{ await quiet(); await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:82}); };
 await p.evaluate(()=>{ setTab('write'); selectChapter(BOOK.order[0]); setTools(false); const ta=document.querySelector('#manuscript'); ta.blur(); ta.scrollTop=0; window.scrollTo(0,0); }); await p.waitForTimeout(900); await shot('write');
 await p.evaluate(()=>{ setTab('read'); goTo({ch:BOOK.order[0],i:0}); drawView(); window.scrollTo(0,0); }); await p.waitForTimeout(1200); await shot('read');
 await p.evaluate(()=>{ document.querySelector('#hlBtn').click(); }); await p.waitForTimeout(400);
 await p.evaluate(()=>{ const box=document.querySelector('#spread .face:not(.gone) .ptext[data-ch]'); const ch=box.dataset.ch; const ws=[...new Set([...box.querySelectorAll('[data-w]')].map(e=>+e.dataset.w))]; addMark(ch,ws[2],ws[14]); drawView(); }); await p.waitForTimeout(3500); await quiet();
 const c=await p.evaluate(()=>{ const r=document.querySelector('#hlBar').getBoundingClientRect(), s=document.querySelector('#stage').getBoundingClientRect(); const lit=[...document.querySelectorAll('#spread .face:not(.gone) .hlm')].map(e=>e.getBoundingClientRect().bottom); const bottom=Math.min(Math.max(...lit)+40,s.bottom,innerHeight); return {x:s.left,y:r.top-6,width:s.width,height:bottom-(r.top-6),lit:lit.length}; });
 await p.screenshot({path:path.join(out,"hlbar.jpg"),type:"jpeg",quality:86,clip:{x:c.x,y:c.y,width:c.width,height:c.height}});
 await p.evaluate(()=>{ const box=document.querySelector('#spread .face:not(.gone) .ptext[data-ch]'); const ch=box.dataset.ch; marksOf(ch).slice().forEach(m=>{ try{ delMark(ch,m); }catch(_){ } }); document.querySelector('#hlBtn').click(); }); await p.waitForTimeout(300);
 await p.evaluate(()=>{ setTab('compare'); window.scrollTo(0,0); }); await p.waitForTimeout(1500); await shot('compare');
 console.log('highlighted pieces in the picture:',c.lit,'| page errors:',errs.slice(0,3)); await b.close(); })();
