/* User manual claim checks: "Reading your book", part 2 (Fix it right on the page, Full screen, Type settings). rev 246 */
const {chromium,devices,say,mk,book,para,toastText,vis,fs}=require('./common.js');
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; /* rev 267: ONLY=<pattern> runs just those blocks (for proving a check fails on a broken copy) */ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
const read=async pg=>{ await pg.evaluate(()=>setTab('read')); await pg.waitForTimeout(500); };
const LONG=k=>[1,2,3,4,5,6,7,8].map(j=>para(k*10+j,90)).join('\n');
const {finger}=require('./common.js');
const hold=async(pg,cdp,x,y,ms)=>{ await cdp.start(x,y); await pg.waitForTimeout(ms); await cdp.end(); await pg.waitForTimeout(400); };
const tap=async(pg,cdp,x,y)=>hold(pg,cdp,x,y,40);
const wordPt=(pg,n)=>pg.evaluate(n=>{ const sp=[...document.querySelectorAll('#spread .ptext [data-w]')][n]; const r=sp.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:sp.textContent}; },n);
(async()=>{ const b=await chromium.launch();
 // ---------- Fix it right on the page, with a real finger
 await run('RB-20',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await read(pg); const cdp=await finger(pg);
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:1}); }); await pg.waitForTimeout(500);
   const w=await wordPt(pg,20); await tap(pg,cdp,w.x,w.y); const quick=await pg.evaluate(()=>({fix:!document.querySelector('#fixBox').hidden,i:curIndex()}));
   ok(!quick.fix,'RB-20a','a quick tap on a word does not open it for fixing: '+JSON.stringify(quick));
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:1}); }); await pg.waitForTimeout(400);
   const w2=await wordPt(pg,20); await hold(pg,cdp,w2.x,w2.y,620);
   const r=await pg.evaluate(()=>{ const t=document.querySelector('#fixText'); return {open:!document.querySelector('#fixBox').hidden,sel:t.value.slice(t.selectionStart,t.selectionEnd),font:getComputedStyle(t).fontFamily,page:getComputedStyle(document.querySelector('#spread .ptext')||document.body).fontFamily}; });
   ok(r.open&&r.sel===w2.w,'RB-20b','press and hold a word for about half a second: the page opens for fixing with that word selected: '+JSON.stringify({open:r.open,sel:r.sel,word:w2.w}));
   ok(r.font===r.page,'RB-20c','the text you fix is in the book’s own type: '+r.font+' / '+r.page);
   /* rev 267: the same finger as RB-20a, tapping where a page turns (right side, left side, the very edge), wherever the fixing box lies; afterwards (below) the same taps with the box closed must turn the page, so a tap that never turns anything cannot pass */
   const edges=await pg.evaluate(()=>{ const st=document.querySelector('#stage').getBoundingClientRect(); return [[st.left+st.width*0.92,st.top+st.height*0.5],[st.left+st.width*0.08,st.top+st.height*0.5],[st.right-2,st.top+st.height*0.6]]; });
   const i0=await pg.evaluate(()=>curIndex()); for(const [x,y] of edges){ await tap(pg,cdp,x,y); await pg.waitForTimeout(500); }
   const keep=await pg.evaluate(i0=>({i0,i:curIndex(),open:!document.querySelector('#fixBox').hidden}),i0); keep.taps=edges.length;
   ok(keep.i===keep.i0&&keep.open,'RB-20d','while the page is open for fixing, taps around it don’t turn the page: '+JSON.stringify(keep));
   const done=await pg.evaluate(async()=>{ const t=document.querySelector('#fixText'); /* rev 267: RB-20d's taps above land in the fixing box and move its cursor; put the selection back on the pressed word first */ t.focus(); t.setSelectionRange(ED.sel[0],ED.sel[1]); t.setRangeText('Mended',t.selectionStart,t.selectionEnd,'end'); t.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,1500));
     const savedTyping=CH.get(S.rch).text.includes('Mended'); document.querySelector('#fixDone').click(); await new Promise(r=>setTimeout(r,600));
     setTab('write'); await new Promise(r=>setTimeout(r,300)); const inWrite=document.querySelector('#manuscript').value.includes('Mended'); setTab('read'); await new Promise(r=>setTimeout(r,400));
     return {savedTyping,i:curIndex(),shown:document.querySelector('#spread').innerText.includes('Mended'),inWrite,closed:document.querySelector('#fixBox').hidden}; });
   ok(done.closed&&done.i===1&&done.shown,'RB-20f','Done: the page becomes a book page again, on the same page, with the fix in it: '+JSON.stringify(done));
   ok(done.inWrite,'RB-20g','the fix shows in Write too');
   { await pg.evaluate(()=>{ S.turn='instant'; jumpTo({ch:BOOK.order[0],i:1}); }); await pg.waitForTimeout(500); const a=await pg.evaluate(()=>curIndex()); await tap(pg,cdp,edges[0][0],edges[0][1]); await pg.waitForTimeout(700); const c=await pg.evaluate(()=>curIndex());
     ok(c===a+1,'RB-20d','(control) the same tap with the fixing box closed does turn the page: '+a+' → '+c); }
   /* rev 267: "saved as you type": type in the fixing box, never tap Done, and reload the app; the words must still be there */
   { await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:1}); }); await pg.waitForTimeout(400); const w4=await wordPt(pg,25); await hold(pg,cdp,w4.x,w4.y,620);
     const typed=await pg.evaluate(async()=>{ const t=document.querySelector('#fixText'); if(document.querySelector('#fixBox').hidden) return 'not open'; t.focus(); return t.selectionEnd>t.selectionStart; });
     if(typed===true) await pg.keyboard.type('Patched',{delay:20}); await pg.waitForTimeout(3000);
     /* as if the phone killed the app: the save-on-leaving handlers (pagehide, unload, hidden) are stopped, so only what was saved while typing survives */
     await pg.evaluate(()=>{ const stop=e=>e.stopImmediatePropagation(); for(const t of ['pagehide','beforeunload','unload']) window.addEventListener(t,stop,true); document.addEventListener('visibilitychange',stop,true); });
     await pg.reload(); await pg.waitForFunction(()=>{ try{ return typeof S==='object'&&typeof LIB!=='undefined'&&LIB.some(b=>b.id==='manual')&&CH.size>0; }catch(e){ return false; } },null,{timeout:30000}).catch(()=>{}); await pg.waitForTimeout(800);
     const after=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id)&&CH.get(id).text).join('\n'));
     ok(typed===true&&/\bPatched\b/.test(after),'RB-20e','your fix is saved as you type: typed in the fixing box, never tapped Done, the app was stopped without its leaving-saves and reloaded, and the fix is still in the chapter: '+JSON.stringify({typed,kept:/\bPatched\b/.test(after)})); }
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:1}); setHl(true); }); await pg.waitForTimeout(400);
   const w3=await wordPt(pg,30); await hold(pg,cdp,w3.x,w3.y,700); const hl=await pg.evaluate(()=>({open:!document.querySelector('#fixBox').hidden})); await pg.evaluate(()=>setHl(false));
   ok(!hl.open,'RB-20h','press and hold doesn’t fix while the Highlighter is on: '+JSON.stringify(hl));
   await pg.ctx.close(); });
 await run('RB-21',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light','A first paragraph that is long enough to read.\n# The Truck\nA second paragraph after the heading.\n* * *\nA third paragraph after the break.']]); await read(pg);
   const r=await pg.evaluate(async()=>{ jumpTo({ch:BOOK.order[0],i:0}); await new Promise(r=>setTimeout(r,300)); const sp=[...document.querySelectorAll('#spread .ptext [data-w]')].find(e=>e.textContent.replace(/\u00ad/g,'')==='second'); fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w});
     const t=document.querySelector('#fixText'); const v=t.value; t.setRangeText('SECOND',ED.sel[0],ED.sel[1],'end'); t.dispatchEvent(new Event('input',{bubbles:true})); fixDone(); await new Promise(r=>setTimeout(r,500)); return {v,text:CH.get(S.rch).text}; });
   ok(!/# The Truck/.test(r.v)&&/^A first[\s\S]*\n# The Truck\nA SECOND paragraph[\s\S]*\n\* \* \*\nA third/.test(r.text),'RB-21a','headings and scene breaks on the page stay as they are when you fix: '+JSON.stringify(r.text));
   const tt=await pg.evaluate(async()=>{ jumpTo({ch:BOOK.order[0],i:0}); await new Promise(r=>setTimeout(r,300)); const before=CH.get(S.rch).text;
     for(const word of ['Light','Truck']){ const sp=[...document.querySelectorAll('#spread .ptext [data-w]')].find(e=>e.textContent===word); fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w});
       const t=document.querySelector('#fixText'); if(document.querySelector('#fixBox').hidden) return 'did not open for '+word; if(t.selectionStart!==t.selectionEnd) return 'selected '+JSON.stringify(t.value.slice(t.selectionStart,t.selectionEnd))+' for '+word; fixDone(); await new Promise(r=>setTimeout(r,400)); }
     return CH.get(S.rch).text===before?'same':'changed'; });
   ok(tt==='same','RB-21c','pressing a word in the chapter title or a heading selects nothing, so typing never replaces other words: '+tt);
   ok(/\n\n/.test(r.v),'RB-21b','paragraphs are separated by a blank line in the fixing box: '+JSON.stringify(r.v.slice(0,90)));
   await pg.ctx.close(); });
 /* rev 267: real reading (Listen, with the device voice kept talking since the test browser has no sound), then a real press and hold on a word.
    Before, the test switched TTS.playing on by hand and passed if a pause function was merely called. */
 await run('RB-22',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]);
   await pg.evaluate(()=>{ try{ speechSynthesis.speak=()=>{}; }catch(_){ } }); await read(pg); const cdp=await finger(pg);
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:1}); }); await pg.waitForTimeout(400);
   await pg.click('#listenBtn'); await pg.waitForTimeout(900);
   const before=await pg.evaluate(()=>({playing:!!TTS.playing,where:document.querySelector('#ttsWhere').textContent}));
   const w=await wordPt(pg,30); await hold(pg,cdp,w.x,w.y,620); await pg.waitForTimeout(300);
   const after=await pg.evaluate(()=>({fix:!document.querySelector('#fixBox').hidden,playing:!!TTS.playing,where:document.querySelector('#ttsWhere').textContent}));
   ok(before.playing&&/^Reading/.test(before.where)&&after.fix&&after.playing===false&&/^Paused/.test(after.where),'RB-22','if the book is being read aloud, the voice pauses while you fix: before '+JSON.stringify(before)+', after press and hold '+JSON.stringify(after));
   if(pg.errs.length) say('FAULT','RB-22x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 await run('RB-23',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await read(pg);
   /* rev 267: every control on screen in Read is listed first (nav tabs, the Read toolbar, the bar under the book); in full screen none of them may still show, only the corner button */
   const seen=`[...document.querySelectorAll('button,[role=button],nav,select,input')].filter(e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth; }).map(e=>e.id||e.tagName+'.'+e.className)`;
   const pre=await pg.evaluate(F=>eval(F),seen);
   await pg.click('#maxBtn'); await pg.waitForTimeout(600);
   const left=await pg.evaluate(F=>eval(F),seen);
   const r=await pg.evaluate(()=>({im:document.body.classList.contains('immersive'),tabs:[...document.querySelectorAll('nav button,#pagebar,#rows,.rtools,#readTools')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'; }).map(e=>e.id||e.className).slice(0,5),exit:(()=>{ const e=document.querySelector('#exitMax'); const r=e.getBoundingClientRect(); return !e.hidden&&r.width>0; })()}));
   const need=['NAV.tabs','libBtn','typeBtn','listenBtn','hlBtn','maxBtn','prev','whereBtn','next'];
   ok(r.im&&r.exit&&need.every(x=>pre.includes(x))&&JSON.stringify(left)==='["exitMax"]','RB-23a','Full screen hides the controls, leaving the page and a corner button: on screen before '+pre.length+' controls ('+need.filter(x=>pre.includes(x)).length+' of the '+need.length+' expected), in full screen '+JSON.stringify(left));
   await pg.click('#exitMax'); await pg.waitForTimeout(500); const out=await pg.evaluate(()=>document.body.classList.contains('immersive'));
   ok(!out,'RB-23b','the corner button brings the controls back: immersive='+out);
   await pg.click('#maxBtn'); await pg.waitForTimeout(500);
   const p=await pg.evaluate(async()=>{ document.querySelector('#listenBtn').click(); await new Promise(r=>setTimeout(r,500)); return {player:(()=>{ const e=document.querySelector('#ttsBar'); const r=e.getBoundingClientRect(); return !e.hidden&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'; })()}; });
   const p2=await pg.evaluate(async()=>{ if(!document.body.classList.contains('immersive')) setImmersive(true); await new Promise(r=>setTimeout(r,500)); const e=document.querySelector('#ttsBar'); const r=e.getBoundingClientRect(); return {visible:!e.hidden&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'&&r.bottom>0&&r.top<innerHeight,on:TTS.on}; });
   ok(p2.on&&!p2.visible,'RB-23c','while reading aloud in full screen, the player hides too: '+JSON.stringify(p2));
   await pg.ctx.close(); });
 // ---------- Type settings (Aa)
 await run('RB-30',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg); await pg.click('#typeBtn'); await pg.waitForTimeout(300);
   const sz=await pg.evaluate(async()=>{ const f=document.querySelector('#fs'); const set=async v=>{ f.value=v; f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,600)); return {px:parseFloat(getComputedStyle(document.querySelector('#spread .ptext')).fontSize),pages:nPages(BOOK.order[0])}; };
     const a=await set(16), c=await set(24); await set(18); return {a,c}; });
   ok(sz.c.px>sz.a.px&&sz.c.pages>sz.a.pages,'RB-30a','Size: bigger text, fewer words per page (more pages): '+JSON.stringify(sz));
   const sp=await pg.evaluate(()=>[...document.querySelectorAll('#lh option')].map(o=>o.textContent));
   ok(JSON.stringify(sp)===JSON.stringify(['Tight','Snug','Normal','Relaxed','Double']),'RB-30b','Spacing: Tight, Snug, Normal, Relaxed or Double: '+sp.join(', '));
   const lhs=await pg.evaluate(async()=>{ const s=document.querySelector('#lh'), o={}; for(const v of ['1.3','2']){ s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); const p=document.querySelector('#spread .ptext p'); o[v]=parseFloat(getComputedStyle(p).lineHeight)/parseFloat(getComputedStyle(p).fontSize); } s.value='1.55'; s.dispatchEvent(new Event('change',{bubbles:true})); return o; });
   ok(lhs['2']>lhs['1.3']+0.5,'RB-30c','Spacing changes the room between lines: '+JSON.stringify(lhs));
   const tf=await pg.evaluate(async()=>{ const s=[...document.querySelectorAll('#typeSheet select')].find(s=>[...s.options].some(o=>/Garamond/.test(o.textContent))); if(!s) return null; const opts=[...s.options].map(o=>o.textContent);
     const v=[...s.options].find(o=>/Baskerville/.test(o.textContent)).value; s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,500)); const ff=getComputedStyle(document.querySelector('#spread .ptext')).fontFamily; return {opts,ff}; });
   ok(tf&&tf.opts.includes('Garamond')&&/Baskerville/.test(tf.ff),'RB-30d','Typeface: choose the book font, like Garamond: '+JSON.stringify(tf&&{n:tf.opts.length,ff:tf.ff}));
   await pg.ctx.close(); });
 await run('RB-31',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',para(1,90)+'\n# The Truck\n'+para(2,40)+'\n# The Road\n'+para(3,40)]]); await read(pg);
   const mid0=null; const r=await pg.evaluate(async()=>{ const c=document.querySelector('#secPage'); const off=c.checked; const n0=nPages(BOOK.order[0]);
     c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,500)); const pages=pag(BOOK.order[0]).pages.length;
     const starts=[]; for(let i=0;i<nPages(BOOK.order[0]);i++){ jumpTo({ch:BOOK.order[0],i}); await new Promise(r=>setTimeout(r,120)); const h=document.querySelector('#spread .ptext h2:not(.cht)'); const first=document.querySelector('#spread .ptext > *:not(.rh):not(.folio)'); starts.push(h?(h===first||h.previousElementSibling===null||/rh|folio/.test((h.previousElementSibling||{}).className||''))?'top:'+h.textContent:'mid:'+h.textContent:'-'); }
     c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); return {off,n0,pages,starts}; });
   /* rev 250: every section heading is read (before, only the first on each page), and a heading that opens a page is not a fault when the page before
      had no room left for it and two lines of its text: that is an ordinary page break, and where it falls differs by a word or two between browsers. Such a heading is marked "fit:". */
   const mid=await pg.evaluate(async()=>{ const o=[]; let free=1e9; for(let i=0;i<nPages(BOOK.order[0]);i++){ jumpTo({ch:BOOK.order[0],i}); await new Promise(r=>setTimeout(r,120)); const pt=document.querySelector('#spread .ptext'), B=pt.getBoundingClientRect(), lh=parseFloat(getComputedStyle(pt).lineHeight)||24;
       for(const h of pt.querySelectorAll('h2:not(.cht)')){ const p=h.previousElementSibling; let tag=(p&&p.tagName==='P')?'mid:':'top:'; if(tag==='top:'){ const cs=getComputedStyle(h), need=h.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom)+2*lh; if(free<need) tag='fit:'; } o.push(tag+h.textContent); }
       const ks=[...pt.children].filter(e=>e.matches('h2,p,figure')), last=ks[ks.length-1]; free=last?B.bottom-last.getBoundingClientRect().bottom:1e9; } return o; });
   ok(!r.off&&mid.length===2&&mid.every(x=>/^(mid|fit):/.test(x))&&mid.some(x=>/^mid:/.test(x)),'RB-31a','unchecked to start, and sections carry on down the same page under the text before them: '+JSON.stringify(mid));
   ok(r.pages>=3&&r.starts.filter(s=>/^top:/.test(s)).length===2,'RB-31b','checked, every section starts on a fresh page: '+JSON.stringify(r.starts));
   await pg.ctx.close(); });
 await run('RB-32',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await read(pg);
   const r=await pg.evaluate(async()=>{ const s=document.querySelector('#themeSel'); const opts=[...s.options].map(o=>o.textContent); s.value='sepia'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,300));
     return {opts,bodyBg:getComputedStyle(document.body).backgroundColor,stored:JSON.stringify(localStorage).includes('sepia')}; });
   ok(JSON.stringify(r.opts)===JSON.stringify(['Match my device','Light','StyleKnight','Sepia','Sky','Choose my own…']),'RB-32a','Colors: Match my device, Light, StyleKnight, Sepia, Sky, Choose my own…: '+r.opts.join(', '));
   await pg.reload(); await pg.waitForTimeout(2200); const after=await pg.evaluate(()=>({sel:document.querySelector('#themeSel').value,theme:document.documentElement.dataset.theme||document.body.dataset.theme||document.documentElement.className}));
   ok(after.sel==='sepia','RB-32b','Inkhorse remembers the colors on this device: '+JSON.stringify(after));
   const app=await pg.evaluate(()=>{ const x=e=>getComputedStyle(e).backgroundColor; return {body:x(document.body),nav:x(document.querySelector('nav')||document.body)}; });
   await pg.evaluate(()=>{ const s=document.querySelector('#themeSel'); s.value='light'; s.dispatchEvent(new Event('change',{bubbles:true})); });
   const app2=await pg.evaluate(()=>{ const x=e=>getComputedStyle(e).backgroundColor; return {body:x(document.body),nav:x(document.querySelector('nav')||document.body)}; });
   ok(app.body!==app2.body,'RB-32c','it changes the whole app, not just the page: sepia '+JSON.stringify(app)+' light '+JSON.stringify(app2));
   const cu=await pg.evaluate(async()=>{ const s=document.querySelector('#themeSel'); s.value='custom'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,300)); const box=document.querySelector('#customColors');
     const shown=box&&!box.hidden; const pIn=document.querySelector('#cPage'), tIn=document.querySelector('#cText'); pIn.value='#eeeeee'; pIn.dispatchEvent(new Event('input',{bubbles:true})); tIn.value='#e6e6e6'; tIn.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
     const warn=document.querySelector('#cWarn'); const w1=warn&&!warn.hidden&&warn.textContent; tIn.value='#111111'; tIn.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); const w2=warn&&!warn.hidden;
     return {shown,types:[pIn.type,tIn.type],w1,w2}; });
   ok(cu.shown&&cu.types.join()==='color,color'&&/Hard to read/.test(cu.w1||'')&&!cu.w2,'RB-32d','Choose my own… opens Page and Text color pickers, and a “Hard to read” warning shows when they are too close: '+JSON.stringify(cu));
   const ni=await pg.evaluate(async()=>{ const s=document.querySelector('#nightSel'); const opts=[...s.options].map(o=>o.textContent.replace('’',"'")); const t0=document.querySelector('#nightTimes').hidden; s.value='dark'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
     return {opts,first:s.options[0].textContent,t0,t1:document.querySelector('#nightTimes').hidden,from:document.querySelector('#nightFrom').value,to:document.querySelector('#nightTo').value,own:opts.includes('My own colors')}; });
   ok(/Don.t switch/.test(ni.first)&&ni.t0&&!ni.t1&&ni.from==='20:00'&&ni.to==='07:00'&&ni.own,'RB-32e','At night: Don’t switch to start; picking a look shows from/to times starting 8 PM to 7 AM; My own colors is offered: '+JSON.stringify(ni));
   const wm=await pg.evaluate(async()=>{ const w=document.querySelector('#warm'); w.value='0'; w.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,100)); const off=document.querySelector('#warmVal').textContent; w.value='40'; w.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,100)); return {off,v:document.querySelector('#warmVal').textContent}; });
   ok(/Off/.test(wm.off)&&/40\s*%/.test(wm.v),'RB-32f','Night warmth: 0 is Off, and it shows the percentage next to the slider: '+JSON.stringify(wm));
   await pg.ctx.close(); });
 await run('RB-33',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg); await pg.click('#typeBtn'); await pg.waitForTimeout(300);
   const r=await pg.evaluate(async()=>{ const sel=document.querySelector('#justSel'), note=()=>document.querySelector('#justNote').textContent, ta=()=>getComputedStyle(document.querySelector('#spread .ptext p')).textAlign;
     const set=async(fs,mode)=>{ if(mode){ sel.value=mode; sel.dispatchEvent(new Event('change',{bubbles:true})); } const f=document.querySelector('#fs'); f.value=fs; f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(z=>setTimeout(z,700)); return {note:note(),ta:ta()}; };
     const o={opts:[...sel.options].map(o=>o.textContent).join(','),start:sel.value};
     o.big=await set(24); o.small=await set(12); o.on=await set(24,'on'); o.off=await set(12,'off'); await set(18,'auto'); return o; });
   ok(r.opts==='Auto,On,Off'&&r.start==='auto','RB-33a','Justify offers Auto, On and Off, and starts on Auto: '+r.opts+' / '+r.start);
   ok(r.big.ta==='left'&&r.big.note==='left-aligned at this size'&&r.small.ta==='justify'&&r.small.note==='justified at this size','RB-33b','Auto: big text left-aligned, small text justified, and it says which next to the menu: '+JSON.stringify({big:r.big,small:r.small}));
   ok(r.on.ta==='justify'&&r.off.ta==='left'&&!r.on.note&&!r.off.note,'RB-33c','On justifies at every size; Off is always left-aligned: '+JSON.stringify({on:r.on,off:r.off}));
   await pg.ctx.close(); });
 await b.close(); })();
