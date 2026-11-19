/* User manual claim checks: "Reading your book", part 1 (Turning pages, The Read tools, the page counter, the Book Hub). rev 246 */
const {chromium,devices,say,mk,book,para,toastText,vis,fs}=require('./common.js');
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; /* rev 267: ONLY=<pattern> runs just those blocks (for proving a check fails on a broken copy) */ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
const read=async pg=>{ await pg.evaluate(()=>setTab('read')); await pg.waitForTimeout(500); };
const loc=pg=>pg.evaluate(()=>({ch:S.rch,i:curIndex(),cur:document.querySelector('#pgCur').textContent,of:document.querySelector('#pgOf').textContent}));
const putCover=(pg,side)=>pg.evaluate(async side=>{ const mk=(w,h,c)=>new Promise(r=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); g.fillStyle=c; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.fillRect(w*0.2,h*0.2,w*0.6,h*0.6); cv.toBlob(r,'image/png'); });
  const id=(side==='coverFront'?'0f1e2d3c4b5a69788796a5b4c3d2e1f0':'1f1e2d3c4b5a69788796a5b4c3d2e1f1'); await __picPut(id,await mk(800,1000,'#7a3b2e'),'image/png'); BOOK.images[id]={w:800,h:1000}; BOOK[side]=id; touchIndex(); PCACHE.clear(); refreshReader(); return id; },side);
/* rev 267: every page of the book in reading order, found by tapping Next from the first page, the way a reader turns them (the expected page numbers come from this, not from the app's own count) */
const walkBook=pg=>pg.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), at=()=>S.rch+':'+curIndex(); S.turn='instant'; countAllNow(); jumpTo({ch:BOOK.order[0],i:0}); await w(300);
     const settle=async b0=>{ for(let t=0;t<60;t++){ await w(50); if(at()!==b0&&!turning) return true; } return false; };
     for(let g=0;g<60&&!document.querySelector('#prev').disabled;g++){ const b0=at(); document.querySelector('#prev').click(); if(!await settle(b0)) break; if(S.rch==='__front'){ const f0=at(); document.querySelector('#next').click(); await settle(f0); break; } }
     /* each tap waits until the page has really turned (up to 3 s: WebKit on a busy machine can take longer than a fixed wait) */
     const seq=[]; for(let g=0;g<600;g++){ if(S.rch==='__back') break; seq.push([S.rch,curIndex()]); const b0=at(); if(document.querySelector('#next').disabled) break; document.querySelector('#next').click();
       let moved=false; for(let t=0;t<60;t++){ await w(50); if(at()!==b0&&!turning){ moved=true; break; } } if(!moved) break; }
     return seq; });
const LONG=k=>[1,2,3,4,5,6,7,8].map(j=>para(k*10+j,90)).join('\n');
(async()=>{ const b=await chromium.launch();
 // ---------- Turning pages
 await run('RB-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg);
   await pg.evaluate(()=>{ S.turn='instant'; }); const r=await pg.evaluate(()=>{ const e=document.querySelector('#stage').getBoundingClientRect(); return {x:e.x,y:e.y,w:e.width,h:e.height}; });
   const a=await loc(pg); await pg.mouse.click(r.x+r.w*0.88,r.y+r.h*0.5); await pg.waitForTimeout(900); const b1=await loc(pg);
   await pg.mouse.click(r.x+r.w*0.12,r.y+r.h*0.5); await pg.waitForTimeout(900); const c=await loc(pg);
   ok(b1.i===a.i+1&&c.i===a.i,'RB-01a','a tap on the right side turns forward, the left side back: '+[a.i,b1.i,c.i].join(' → '));
   const sw=async(x0,x1)=>{ await pg.evaluate(([x0,x1,y])=>{ const el=document.elementFromPoint(x0,y), t=(x)=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
       el.dispatchEvent(new TouchEvent('touchstart',{touches:[t(x0)],changedTouches:[t(x0)],bubbles:true,cancelable:true}));
       for(let k=1;k<=6;k++) el.dispatchEvent(new TouchEvent('touchmove',{touches:[t(x0+(x1-x0)*k/6)],changedTouches:[t(x0+(x1-x0)*k/6)],bubbles:true,cancelable:true}));
       el.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[t(x1)],bubbles:true,cancelable:true})); },[x0,x1,r.y+r.h*0.5]); await pg.waitForTimeout(1200); };
   const cdp=await require('./common.js').finger(pg); const swipe=async(x0,x1)=>{ const y=r.y+r.h*0.5; await cdp.start(x0,y); for(let k=1;k<=8;k++){ await cdp.move(x0+(x1-x0)*k/8,y); await pg.waitForTimeout(16); } await cdp.end(); await pg.waitForTimeout(1200); };
   await swipe(r.x+r.w*0.7,r.x+r.w*0.2); const d=await loc(pg);
   const ptr=async(x0,x1)=>{ await pg.mouse.move(x0,r.y+r.h*0.5); await pg.mouse.down(); for(let k=1;k<=8;k++) await pg.mouse.move(x0+(x1-x0)*k/8,r.y+r.h*0.5); await pg.mouse.up(); await pg.waitForTimeout(1200); };
   await ptr(r.x+r.w*0.95,r.x+r.w*0.3); const e=await loc(pg);
   ok(d.i===c.i+1&&e.i===d.i+1,'RB-01b','a swipe and a page dragged from its edge each turn the page: swipe '+c.i+' → '+d.i+', drag → '+e.i);
   const p=await pg.evaluate(async()=>{ const w=()=>new Promise(r=>setTimeout(r,900)); const a=document.querySelector('#prev'), n=document.querySelector('#next'); const s0=curIndex(); n.click(); await w(); const s1=curIndex(); a.click(); await w(); const s2=curIndex(); return [s0,s1,s2]; });
   await pg.waitForTimeout(300); ok(p[1]===p[0]+1&&p[2]===p[0],'RB-12','Previous / Next page turn back or forward one page: '+p.join(' → '));
   await pg.ctx.close(); });
 await run('RB-02',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await putCover(pg,'coverFront'); await putCover(pg,'coverBack'); await read(pg);
   const r=await pg.evaluate(async()=>{ S.turn='instant'; jumpTo({ch:BOOK.order[0],i:0}); await new Promise(r=>setTimeout(r,500)); document.querySelector('#prev').click(); await new Promise(r=>setTimeout(r,900)); const front=S.rch;
     /* rev 267: the face actually on show (never a .gone one left over from the turn), and the cover picture itself (img.cvimg), not whatever img comes first */
     const shown=()=>[...document.querySelectorAll('#stage .face:not(.gone)')].filter(f=>{ const r=f.getBoundingClientRect(), cs=getComputedStyle(f); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'; });
     const pageBox=()=>{ const f=shown(); if(f.length!==1) return ['faces',f.length]; const r=f[0].getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; };
     const fb=pageBox(); const face=shown()[0], im=face&&face.querySelector('img.cvimg'); const ir=im?im.getBoundingClientRect():null, pr=face?face.getBoundingClientRect():null;
     const nat=im&&im.naturalWidth?im.naturalWidth/im.naturalHeight:0, drawn=ir&&ir.height?ir.width/ir.height:0;
     const whole=!!(ir&&ir.width>0&&ir.left>=pr.left-1&&ir.right<=pr.right+1&&ir.top>=pr.top-1&&ir.bottom<=pr.bottom+1&&getComputedStyle(im).objectFit!=='cover'&&nat&&Math.abs(drawn-nat)<0.01&&(Math.abs(ir.width-pr.width)<2||Math.abs(ir.height-pr.height)<2));
     const last=BOOK.order[BOOK.order.length-1]; jumpTo({ch:last,i:nPages(last)-1}); await new Promise(r=>setTimeout(r,300)); const pb=pageBox(); document.querySelector('#next').click(); await new Promise(r=>setTimeout(r,900));
     return {front,back:S.rch,fb,pb,whole,ir:ir&&[ir.left-pr.left,ir.top-pr.top,ir.width,ir.height].map(Math.round),face:pr&&[pr.width,pr.height].map(Math.round),nat:+nat.toFixed(3),drawn:+drawn.toFixed(3)}; });
   ok(r.front==='__front'&&r.back==='__back','RB-02a','the front cover shows before the first page and the back cover after the last: '+r.front+' / '+r.back);
   ok(JSON.stringify(r.fb)===JSON.stringify(r.pb),'RB-02b','a cover is the same size as a page: cover '+r.fb+' page '+r.pb);
   ok(r.whole,'RB-02c','the whole cover picture is shown inside the page, its own shape kept (not cut off or stretched), as big as the page allows: picture '+r.ir+' in face '+r.face+', shape '+r.drawn+' vs '+r.nat);
   await pg.ctx.close(); });
 // ---------- The Read tools
 await run('RB-05',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.click('#libBtn'); await pg.waitForTimeout(500); const t=await pg.evaluate(()=>{ const l=document.querySelector('#library'); return {open:!l.hidden,text:l.innerText.slice(0,2000)}; });
   ok(t.open&&/Your books/i.test(t.text)&&/Drafts/i.test(t.text)&&/added to read/i.test(t.text),'RB-05','Library opens the shelf: your books, drafts and books added to read');
   await pg.ctx.close(); });
 await run('RB-06',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   const o=await pg.evaluate(()=>[...document.querySelectorAll('#deviceSel option')].map(o=>o.textContent.replace(/ · .*$/,'').trim()));
   ok(JSON.stringify(o)===JSON.stringify(['Fit my screen','Phone','Large phone','Small tablet','Tablet','Paperback 6 × 9 in','Custom size']),'RB-06a','Device menu offers the seven sizes in order, Fit my screen first: '+o.join(', '));
   const d=await pg.evaluate(()=>S.dev); ok(d==='screen','RB-06b','Fit my screen is the starting choice: '+d);
   const c=await pg.evaluate(async()=>{ const s=document.querySelector('#deviceSel'); s.value='custom'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,300)); const box=document.querySelector('#customBox'); const shown=!box.hidden&&!!box.closest('#typeSheet'); const lab=box.innerText;
     s.value='phone'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); return {shown,lab,hid:box.hidden}; });
   ok(c.shown&&/W/.test(c.lab)&&/H/.test(c.lab)&&/Margin/i.test(c.lab)&&c.hid,'RB-06c','Custom size shows W, H and Margin boxes in the Aa panel, and only for a custom size: '+JSON.stringify(c.lab.replace(/\s+/g,' ')));
   await pg.ctx.close(); });
 await run('RB-07',async()=>{ const pg=await mk(b,{viewport:{width:1400,height:900},deviceScaleFactor:1}); await book(pg,[['One',LONG(1)]]); await read(pg);
   /* rev 267: count the pages actually drawn side by side (visible faces with a box), not the app's own "two" switch; on the second page of the chapter, so a spread has a left and a right page */
   const faces=`[...document.querySelectorAll('#spread .face:not(.gone)')].filter(f=>{ const r=f.getBoundingClientRect(), cs=getComputedStyle(f); return r.width>50&&r.height>50&&cs.visibility!=='hidden'&&cs.display!=='none'&&r.right>0&&r.left<innerWidth; }).map(f=>Math.round(f.getBoundingClientRect().left))`;
   const r=await pg.evaluate(async F=>{ const out={}; S.turn='instant'; for(const k of ['vAuto','v1','v2']){ document.querySelector('#'+k).click(); await new Promise(r=>setTimeout(r,500)); jumpTo({ch:BOOK.order[0],i:2}); await new Promise(r=>setTimeout(r,500)); const L=eval(F); out[k]=L.length===2&&L[0]!==L[1]?true:L.length===1?false:'faces '+L.join(','); } return out; },faces);
   ok(r.vAuto===true&&r.v1===false&&r.v2===true,'RB-07a','on a computer, Auto shows two pages, One page shows one, Two-page spread shows two: '+JSON.stringify(r));
   await pg.ctx.close();
   const ph=await mk(b,'iPhone 14 Pro Max'); await book(ph,[['One',LONG(1)]]); await read(ph); const r2=await ph.evaluate(async F=>{ S.turn='instant'; document.querySelector('#vAuto').click(); await new Promise(r=>setTimeout(r,400)); jumpTo({ch:BOOK.order[0],i:2}); await new Promise(r=>setTimeout(r,500)); const L=eval(F); return L.length===2?true:L.length===1?false:'faces '+L.join(','); },faces);
   ok(r2===false,'RB-07b','on an upright phone Auto picks one page: two='+r2); await ph.ctx.close(); });
 await run('RB-08',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.click('#typeBtn'); await pg.waitForTimeout(300); ok(await vis(pg,'#typeSheet'),'RB-08','Aa opens the type panel');
   await pg.ctx.close(); });
 await run('RB-09',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.click('#listenBtn'); await pg.waitForTimeout(500); ok(await vis(pg,'#ttsBar'),'RB-09','Read aloud opens the listening player');
   await pg.ctx.close(); });
 await run('RB-10',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   const before=await pg.evaluate(()=>getComputedStyle(document.querySelector('#hlBtn')).backgroundColor);
   await pg.click('#hlBtn'); await pg.waitForTimeout(300);
   const r=await pg.evaluate(()=>{ const bt=document.querySelector('#hlBtn'), bar=document.querySelector('#hlBar'); const bb=bar.getBoundingClientRect(); const pt=document.querySelector('#stage .ptext')||document.querySelector('#stage');
     const tr=pt.getBoundingClientRect(); const cs=getComputedStyle(bt); return {bg:cs.backgroundColor,on:bt.getAttribute('aria-pressed')||bt.className,bar:!bar.hidden,btns:bar.innerText.replace(/\s+/g,' ').trim(),barBottom:Math.round(bb.bottom),textTop:Math.round(tr.top)}; });
   const lime=s=>{ const m=s.match(/\d+/g); if(!m) return false; const [R,G,B]=m.map(Number); return G>150&&G>B+60&&R<G; };
   ok(lime(r.bg)&&!lime(before),'RB-10a','the Highlighter button goes lime when it is on: off '+before+', on '+r.bg);
   ok(r.bar&&/Copy/.test(r.btns)&&/Clear page/.test(r.btns)&&r.barBottom<=r.textTop+1,'RB-10b','Copy and Clear page float over the top margin only, not the words: '+JSON.stringify(r));
   await pg.ctx.close(); });
 // ---------- Short screen goes full screen by itself
 await run('RB-11',async()=>{ const pg=await mk(b,{...devices['iPhone 14 Pro Max'],viewport:{width:932,height:430}}); await book(pg,[['One',LONG(1)]]); await read(pg); await pg.waitForTimeout(500); /* rev 255: give it up to 5 s on a busy machine instead of exactly half a second */ await pg.waitForFunction(()=>document.body.classList.contains('immersive'),null,{timeout:5000}).catch(()=>{});
   const im=await pg.evaluate(()=>document.body.classList.contains('immersive')); ok(im,'RB-11','on a short screen, like a phone turned sideways, Read goes full screen by itself: '+im);
   await pg.ctx.close(); });
 // ---------- Page counter
 await run('RB-13',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg);
   /* rev 267: the expected numbers are worked out by the test itself, by turning every page of the book with the Next button, the way a reader would,
      instead of from countAllNow(), which is where the counter gets its own numbers */
   const walk=await walkBook(pg);
   const id2=await pg.evaluate(()=>BOOK.order[1]), posOf=(ch,i)=>walk.findIndex(([c,k])=>c===ch&&k===i)+1, chPages=walk.filter(([c])=>c===id2).length;
   const r=await pg.evaluate(async()=>{ const id=BOOK.order[1]; jumpTo({ch:id,i:1}); await new Promise(r=>setTimeout(r,400)); const bi=countAllNow();
     const foot=[...document.querySelectorAll('#stage .folio,#stage .pf,#stage [class*=folio]')].map(e=>e.textContent.trim()).filter(Boolean);
     return {cur:document.querySelector('#pgCur').textContent,of:document.querySelector('#pgOf').textContent,lab:document.querySelector('#chLab').textContent,bk:document.querySelector('#bookPg').textContent,info:document.querySelector('#pageInfo').textContent,
       exp:(bi.off[id]||0)+2,t:bi.t,np:nPages(id),words:bookWords?bookWords():null,foot,bars:[document.querySelector('#progBar'),document.querySelector('#bookBar')].map(e=>e&&e.style.width),
       faceWords:(()=>{ const f=[...document.querySelectorAll('#spread .face:not(.gone)')].filter(f=>f.getBoundingClientRect().width>0); const ws=new Set(); f.forEach(x=>x.querySelectorAll('.ptext [data-w]').forEach(e=>ws.add(e.dataset.w))); return ws.size; })(),hub:document.querySelector('#whereBtn').innerText.split('\n')[0]}; });
   const expCur=posOf(id2,1), expT=walk.length;
   ok(+r.cur===expCur&&r.of===`of ${expT}`&&chPages===r.np,'RB-13a','one page number counted from the start of the book, like “312 of 840”: '+r.cur+' '+r.of+' (counted by turning every page: '+expCur+' of '+expT+'; this chapter '+chPages+' pages)');
   ok(/Second Wind/.test(r.lab),'RB-13b','the line above names the chapter: '+r.lab);
   ok(r.foot.includes(String(r.exp)),'RB-13c','the same number is printed at the foot of the page: foot '+JSON.stringify(r.foot));
   ok(new RegExp(`^Chapter page 2 of ${r.np} · [\\d,]+ words$`).test(r.bk),'RB-13d','the small line says “Chapter page 2 of N” and the words in the whole book: '+r.bk);
   { const left=chPages-2, m=r.info.match(/^(?:(\d+) pages? left in chapter|Last page of chapter) · ([\d,]+) words? on this page$/);
     ok(!!m&&(left>0?+m[1]===left:m[1]===undefined)&&+m[2].replace(/,/g,'')===r.faceWords&&r.faceWords>20,'RB-13e','a third line says the pages left in the chapter and the words on this page: '+r.info+' (expected '+left+' left, '+r.faceWords+' words counted on the page shown)'); }
   /* the two thin lines: read at two places, each must grow and match the share of the chapter and of the book read so far */
   const bars2=await pg.evaluate(async()=>{ const id=BOOK.order[1]; jumpTo({ch:id,i:4}); await new Promise(r=>setTimeout(r,400)); return [document.querySelector('#progBar').style.width,document.querySelector('#bookBar').style.width]; });
   const pc=(a,b)=>Math.round(a/b*100)+'%', wantA=[pc(2,chPages),pc(expCur,expT)], wantB=[pc(5,chPages),pc(posOf(id2,4),expT)];
   ok(JSON.stringify(r.bars)===JSON.stringify(wantA)&&JSON.stringify(bars2)===JSON.stringify(wantB)&&parseFloat(bars2[0])>parseFloat(r.bars[0])&&parseFloat(bars2[1])>parseFloat(r.bars[1]),'RB-13f','two thin lines fill as you read, the chapter and the whole book: page 2 '+r.bars+' then page 5 '+bars2+' (expected '+wantA+' then '+wantB+')');
   ok(/Book Hub/i.test(r.hub),'RB-13g','the counter is marked Book Hub at the top: '+r.hub);
   const wb=await pg.evaluate(()=>BOOK.order.reduce((t,id)=>t+CH.get(id).text.split(/\s+/).filter(Boolean).length,0));
   ok(r.bk.endsWith(`${wb.toLocaleString('en-US')} words`),'RB-13h','the word count is the whole book’s: '+wb);
   await pg.click('#whereBtn'); await pg.waitForTimeout(400); ok(await vis(pg,'#goto'),'RB-13i','tapping the counter opens the Book Hub');
   await pg.ctx.close(); });
 // ---------- Book Hub
 await run('RB-15',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await putCover(pg,'coverFront'); await read(pg);
   await pg.evaluate(()=>{ BOOK.title='The Harbor Book'; BOOK.author='Ada Tester'; const id=BOOK.order[1]; addMark(id,10,15); addMark(id,200,204); touchIndex(); refreshReader(); });
   /* rev 267: where each highlight really is: turn every page and note the book page on which its first word shows highlighted */
   const walk=await walkBook(pg), hlPage=await pg.evaluate(async seq=>{ const out={}; for(let k=0;k<seq.length;k++){ const [c,i]=seq[k]; if(c!==BOOK.order[1]) continue; jumpTo({ch:c,i}); await new Promise(r=>setTimeout(r,150));
       for(const w of [10,200]){ if(out[w]) continue; const e=[...document.querySelectorAll('#spread .face:not(.gone) .ptext [data-w="'+w+'"]')].find(x=>x.classList.contains('hlm')); if(e) out[w]=k+1; } } return out; },walk);
   await pg.click('#whereBtn'); await pg.waitForTimeout(400);
   const r=await pg.evaluate(()=>{ const g=document.querySelector('#goto'); return {book:document.querySelector('#gotoBook').textContent,rows:[...g.querySelectorAll('.hlrow')].map(r=>r.innerText.replace(/\s+/g,' ')),list:document.querySelector('#gotoList').innerText.replace(/\s+/g,' '),marks:GMARKS.map(m=>m.page)}; });
   ok(r.book==='The Harbor Book','RB-15a','the Book Hub names the book it is in, under the words Book Hub: '+r.book);
   const want=[hlPage[10],hlPage[200]];
   ok(r.rows.length===2&&want.every(Boolean)&&r.rows.every((t,k)=>new RegExp('Page '+want[k]+'(?!\\d)').test(t))&&r.list.indexOf('Highlights')<r.list.indexOf('First Light'),'RB-15b','highlights are listed above the chapters, each with the page it is on: '+r.rows.map(t=>t.slice(0,60)).join(' | ')+' (found on pages '+want.join(', ')+' by turning the pages)');
   const go=await pg.evaluate(async()=>{ document.querySelector('[data-hgo="1"]').click(); await new Promise(r=>setTimeout(r,400));
     const on=[...document.querySelectorAll('#spread .face:not(.gone) .ptext .hlm')].filter(e=>e.getBoundingClientRect().width>0).map(e=>+e.dataset.w);
     return {now:+document.querySelector('#pgCur').textContent,hub:document.querySelector('#goto').hidden,lit:on}; });
   ok(go.now===want[1]&&go.hub&&[200,201,202,203].every(w=>go.lit.includes(w)),'RB-15c','tap a highlight to go straight to it: the page shown has those highlighted words on it: '+JSON.stringify(go));
   await pg.click('#whereBtn'); await pg.waitForTimeout(300);
   await pg.click('[data-hn="0"]'); await pg.fill('.hlnoteed input','add the 1966 birth date here'); await pg.click('.hlnoteed button'); await pg.waitForTimeout(400);
   const n=await pg.evaluate(()=>({note:GMARKS[0]&&GMARKS[0].r.m.note,btn:(document.querySelector('[data-hn="0"]')||{}).textContent}));
   ok(n.note==='add the 1966 birth date here'&&n.btn==='Edit note','RB-15d','Note adds a short reminder, then the button says Edit note: '+JSON.stringify(n));
   const cp=await pg.evaluate(async()=>{ document.querySelector('[data-hc="0"]').click(); await new Promise(r=>setTimeout(r,300)); return {clip:await navigator.clipboard.readText(),page:GMARKS[0].page}; });
   ok(/^“.+”\n— The Harbor Book, Ada Tester, page \d+/.test(cp.clip)&&cp.clip.includes('page '+cp.page),'RB-15e','Copy copies the words with the book’s title and page number: '+JSON.stringify(cp.clip.slice(0,120)));
   const sh=await pg.evaluate(async()=>{ let got=null; navigator.share=async d=>{ got=d; }; document.querySelector('[data-hs="0"]').click(); await new Promise(r=>setTimeout(r,200)); return got; });
   ok(sh&&/The Harbor Book/.test(sh.text||''),'RB-15f','Share sends them to another app (the share sheet): '+JSON.stringify(sh));
   const cl=await pg.evaluate(async()=>{ document.querySelector('[data-hx="0"]').click(); await new Promise(r=>setTimeout(r,300)); return marksOf(BOOK.order[1]).length; });
   ok(cl===1,'RB-15g','Clear removes that highlight: '+cl+' left');
   const gp=await pg.evaluate(async()=>{ if(document.querySelector('#goto').hidden) openGoto(); const i=document.querySelector('#gotoNum'); i.value='3'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await new Promise(r=>setTimeout(r,400)); return {now:document.querySelector('#pgCur').textContent,hub:document.querySelector('#goto').hidden}; });
   ok(gp.now==='3'&&gp.hub,'RB-15h','Go to page: type a number and press Return, and the book opens there: '+JSON.stringify(gp));
   const rows=await pg.evaluate(seq=>{ openGoto(); return {list:[...document.querySelectorAll('#gotoList [data-go]')].map(b=>b.innerText.replace(/\s+/g,' ')),exp:BOOK.order.map(id=>{ const k=seq.map(x=>x[0]).indexOf(id), m=seq.map(x=>x[0]).lastIndexOf(id); return [k+1,m+1]; })}; },walk);
   const chRows=rows.list.filter(t=>/First Light|Second Wind/.test(t));
   ok(chRows.length===2&&chRows.every((t,k)=>t.includes(`Pages ${rows.exp[k][0]}–${rows.exp[k][1]}`)),'RB-15i','the chapter list shows the pages each chapter runs: '+chRows.join(' | ')+' (counted by turning the pages: '+JSON.stringify(rows.exp)+')');
   const tap=await pg.evaluate(async()=>{ const bt=[...document.querySelectorAll('#gotoList [data-go]')].find(b=>/Second Wind/.test(b.innerText)); bt.click(); await new Promise(r=>setTimeout(r,400)); return {ch:CH.get(S.rch)&&CH.get(S.rch).title,i:curIndex()}; });
   ok(tap.ch==='Second Wind'&&tap.i===0,'RB-15j','tap a chapter to open it at its first page: '+JSON.stringify(tap));
   const cov=await pg.evaluate(()=>{ openGoto(); const t=document.querySelector('#gotoList').innerText.replace(/\s+/g,' '); return {front:/Front cover Tap to open/.test(t),back:/Back cover No cover art yet Add art/.test(t)}; });
   ok(cov.front&&cov.back,'RB-15k','the Book Hub lists the front and back cover, and a cover with no picture shows Add art: '+JSON.stringify(cov));
   const sl=await pg.evaluate(async()=>{ const rg=document.querySelector('#gotoRange'); rg.value=String(+rg.min+1+11); /* the 12th position after the front cover = book page 12 */ rg.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,300)); const mid=document.querySelector('#gotoNow').innerText.replace(/\s+/g,' ');
     rg.value='0'; rg.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,300)); const c=document.querySelector('#gotoNow').innerText.replace(/\s+/g,' '); return {mid,c}; });
   { const words=await pg.evaluate(()=>BOOK.order.reduce((t,id)=>t+CH.get(id).text.split(/\s+/).filter(Boolean).length,0)), ch12=await pg.evaluate(id=>CH.get(id).title,walk[11][0]);
     const m=sl.mid.match(/^Book page (\d+) of (\d+)\b/), c=sl.c.replace(/,/g,'');
     sl.want={page:12,ch:ch12,pages:walk.length,words};
     ok(!!m&&+m[1]===12&&+m[2]===walk.length&&sl.mid.includes(ch12)&&new RegExp('\\b'+walk.length+' pages').test(c)&&new RegExp('\\b'+words+' words').test(c),'RB-15l','as you slide it shows the book page and chapter; on a cover, the pages and words of the whole book: '+JSON.stringify(sl));
   }
   await pg.ctx.close(); });
 await run('RB-15m',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   const r=await pg.evaluate(async()=>{ const m=BUILTIN[0]; openLibBook(m.id||'manual'); await new Promise(r=>setTimeout(r,1500)); jumpTo({ch:rOrder()[4],i:0}); await new Promise(r=>setTimeout(r,400)); return {lab:document.querySelector('#chLab').textContent,rb:!!RB}; });
   ok(r.rb&&/^Inkhorse User manual · /.test(r.lab),'RB-13j','for a book added to read, the line above names the book first: '+r.lab);
   await pg.ctx.close(); });
 await b.close(); })();
