/* User manual claim checks: "Books, drafts and the safety net", "Compare", "Put Inkhorse on your home screen", "Quick fixes". rev 246 */
const {chromium,devices,say,mk,book,para,toastText,vis,fs,path,REPO,S:TMP}=require('./common.js');
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; /* rev 267: ONLY=<pattern> runs just those blocks (for proving a check fails on a broken copy) */ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
const LONG=k=>[1,2,3,4,5,6,7,8].map(j=>para(k*10+j,90)).join('\n');
const lib=async pg=>{ await pg.evaluate(()=>{ setTab('read'); }); await pg.waitForTimeout(300); await pg.evaluate(()=>{ document.querySelector('#library').hidden=true; document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500); };
const shelf=pg=>pg.evaluate(()=>document.querySelector('#shelf').innerText.replace(/[ \t]+/g,' '));
const click=async(pg,sel,wait)=>{ /* rev 255: find the button and press it in the same breath, trying for up to 10 s; the Library redraws itself as it loads, and a button found a moment ago can be gone by the time it is pressed */ await pg.evaluate(async s=>{ for(let k=0;k<100;k++){ const e=document.querySelector(s); if(e){ e.click(); return; } await new Promise(r=>setTimeout(r,100)); } throw new Error('nothing to press: '+s); },sel); await pg.waitForTimeout(wait||700); };
(async()=>{ const b=await chromium.launch();
 // ---------- Your books
 await run('BD-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await pg.evaluate(()=>{ BOOK.title='The Harbor Book'; touchIndex(); }); await pg.waitForTimeout(400);
   await lib(pg); const s0=await shelf(pg);
   ok(/The Harbor Book[\s\S]*1 ch · 720 words · open/.test(s0),'BD-03a','a book on the shelf shows its chapter and word count, and “open” on the one you’re in: '+JSON.stringify((s0.match(/The Harbor Book[^\n]*\n[^\n]*/)||[''])[0]));
   const slot0=await pg.evaluate(()=>SLOT);
   await click(pg,'[data-wnew]',1500); const nb=await pg.evaluate(()=>({slot:SLOT,n:BOOK.order.length,words:BOOK.order.reduce((t,id)=>t+String(CH.get(id).text||'').split(/\s+/).filter(Boolean).length,0),tab:S.tab}));
   ok(nb.slot!==slot0&&nb.words===0,'BD-01','+ New book starts a book of its own, with its own chapters: '+JSON.stringify(nb));
   await pg.evaluate(()=>{ const id=BOOK.order[0]; CH.get(id).title='Other Start'; CH.get(id).text='Words of the other book.'; touchChapter(CH.get(id)); BOOK.title='Other Book'; touchIndex(); }); await pg.waitForTimeout(400);
   /* rev 267: the other book gets a backup of its own (as the daily backup would make), so "erases its backups" has something to erase */
   await pg.evaluate(async()=>{ await writeBackup('daily'); }); await pg.waitForTimeout(300);
   await lib(pg); const two=await shelf(pg);
   ok(/The Harbor Book/.test(two)&&/Other Book/.test(two),'BD-01b','both books are on the shelf: '+JSON.stringify(two.slice(0,300)));
   await pg.evaluate(s=>document.querySelector(`[data-wopen="${s}"]`).click(),slot0); await pg.waitForTimeout(1500);
   const back=await pg.evaluate(()=>({slot:SLOT,title:BOOK.title,ch:CH.get(BOOK.order[0]).title}));
   ok(back.slot===slot0&&back.title==='The Harbor Book'&&back.ch==='First Light','BD-03b','Open takes you to that book, with its own chapters kept: '+JSON.stringify(back));
   await lib(pg); const other=await pg.evaluate(s0=>{ const b=[...document.querySelectorAll('[data-wdel]')].find(e=>e.dataset.wdel!==s0); return b&&b.dataset.wdel; },slot0);
   await click(pg,`[data-wdel="${other}"]`,300); const once=await shelf(pg); const armed=await pg.evaluate(o=>document.querySelector(`[data-wdel="${o}"]`).textContent,other);
   await click(pg,`[data-wdel="${other}"]`,900); const after=await shelf(pg);
   ok(armed==='Delete?'&&/Recently deleted[\s\S]*Other Book[\s\S]*deleted [A-Z][a-z]{2} \d+/i.test(after)&&!/Recently deleted/i.test(once),'BD-03c','Delete (tap twice) moves the book to Recently deleted, with the date: armed "'+armed+'"');
   await click(pg,`[data-wrest="${other}"]`,1200); await lib(pg); const rest=await shelf(pg);
   ok(!/Recently deleted/i.test(rest)&&/Other Book/.test(rest),'BD-27a','Restore puts it back in Your books, and the Recently deleted heading goes when nothing is in it');
   /* rev 257: the two taps on Delete must land within the five seconds the button stays armed; on a busy test machine they once did not, the book stayed where it was, and the next step found nothing to press. Tap the pair again (up to three times) until the book is in Recently deleted. */
   for(let n=0;n<3;n++){ await click(pg,`[data-wdel="${other}"]`,300); await click(pg,`[data-wdel="${other}"]`,900); if(await pg.evaluate(o=>!!document.querySelector(`[data-wkill="${o}"]`),other)) break; await pg.waitForTimeout(5200); }
   /* rev 267: backups live in IndexedDB, not localStorage: count that book's keys there (and in localStorage) before and after */
   const keysOf=o=>pg.evaluate(o=>new Promise(res=>{ const r=indexedDB.open('pageproof',1); r.onsuccess=()=>{ const q=r.result.transaction('kv','readonly').objectStore('kv').getAllKeys(); q.onsuccess=()=>res({idb:q.result.map(String).filter(k=>k.startsWith('bk:'+o+':')).length,ls:Object.keys(localStorage).filter(k=>k.includes(o)).length}); q.onerror=()=>res(null); }; r.onerror=()=>res(null); }),o);
   const had=await keysOf(other);
   await click(pg,`[data-wkill="${other}"]`,300); const k1=await pg.evaluate(o=>document.querySelector(`[data-wkill="${o}"]`).textContent,other); await click(pg,`[data-wkill="${other}"]`,1200);
   const gone=await pg.evaluate(o=>({shelf:document.querySelector('#shelf').innerText.includes('Other Book')}),other), left=await keysOf(other);
   ok(k1==='Delete forever?'&&!gone.shelf&&had&&had.idb>=2&&left&&left.idb===0&&left.ls===0,'BD-27b','Delete forever (tap twice) erases the book and its backups: '+JSON.stringify({k1,...gone,before:had,after:left}));
   await pg.ctx.close(); });
 await run('BD-02',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await lib(pg);
   const f=path.join(TMP,'ink-write-in.txt'); fs.writeFileSync(f,'The Lantern Book\nby Ada Tester\n\n# The Dock\nA paragraph on the dock.\n\n# The Boat\nA paragraph in the boat.');
   const slot0=await pg.evaluate(()=>SLOT); await pg.setInputFiles('#wbIn',f); await pg.waitForTimeout(2500);
   const r=await pg.evaluate(()=>({slot:SLOT,title:BOOK.title,chs:BOOK.order.map(id=>chListName(id)),rb:!!RB}));
   ok(r.slot!==slot0&&!r.rb&&r.chs.includes('The Dock')&&r.chs.includes('The Boat'),'BD-02','Load a file to write in starts a new writing book from the file: '+JSON.stringify(r));
   await pg.ctx.close(); });
 // ---------- Drafts
 await run('BD-06',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light','One.\nTwo.\nThree.'],['Second Wind','Four.']]); await pg.evaluate(()=>{ BOOK.title='The Harbor Book'; touchIndex(); }); await pg.waitForTimeout(300);
   const home=await pg.evaluate(()=>SLOT); await lib(pg); await click(pg,'[data-dnew]',1500);
   const d=await pg.evaluate(()=>({tab:S.tab,title:CH.get(S.cur).title,text:CH.get(S.cur).text,lib:document.querySelector('#library').hidden}));
   ok(d.tab==='write'&&/^Draft · /.test(d.title)&&!d.text&&d.lib,'BD-06','+ New draft opens a blank draft in Write: '+JSON.stringify(d));
   await pg.evaluate(()=>{ const c=CH.get(S.cur); c.text='The draft line about the lighthouse.'; touchChapter(c); loadEditor(); }); await pg.waitForTimeout(400);
   await lib(pg); const id=await pg.evaluate(()=>document.querySelector('[data-dread]').dataset.dread);
   await click(pg,`[data-dread="${id}"]`,1200); const rd=await pg.evaluate(()=>({tab:S.tab,txt:document.querySelector('#spread').innerText}));
   ok(rd.tab==='read'&&/lighthouse/i.test(rd.txt),'BD-07a','Read shows the draft as pages: '+rd.tab);
   await lib(pg); await click(pg,`[data-dwrite="${id}"]`,1200); const wr=await pg.evaluate(()=>({tab:S.tab,v:document.querySelector('#manuscript').value}));
   ok(wr.tab==='write'&&/lighthouse/.test(wr.v),'BD-07b','Write opens it in Write');
   await lib(pg); await click(pg,`[data-dadd="${id}"]`,500); const q1=await shelf(pg);
   ok(/Which book\?/.test(q1)&&/The Harbor Book/.test(q1),'BD-08','1. Which book?: tap the book the draft belongs in');
   await click(pg,`[data-dbook="${home}"]`,1500); const q2=await shelf(pg);
   ok(/Where in “The Harbor Book”\?/.test(q2)&&/As a new chapter at the end/.test(q2)&&/Titled “Draft · /.test(q2)&&/1\. First Light/.test(q2)&&/2\. Second Wind/.test(q2)&&/Back/.test(q2),'BD-09','2. Where in the book?: a new chapter at the end, titled after the draft, or a chapter to add inside, and Back: '+JSON.stringify(q2.slice(q2.indexOf('Where'),q2.indexOf('Where')+200)));
   /* rev 258 (M-27): Back really goes one question back, and the answer can be given again */
   await click(pg,'[data-dback]',900); const qb=await shelf(pg); ok(/Which book\?/.test(qb)&&!/Where in “The Harbor Book”\?/.test(qb),'M-27','Back goes one question back, to "Which book?": '+JSON.stringify(qb.slice(qb.indexOf('Which'),qb.indexOf('Which')+60)));
   await click(pg,`[data-dbook="${home}"]`,1500);
   const fl=await pg.evaluate(()=>[...document.querySelectorAll('[data-dch]')].find(b=>/First Light/.test(b.innerText)).dataset.dch);
   await click(pg,`[data-dch="${fl}"]`,1200); const q3=await shelf(pg);
   ok(/Where in chapter “First Light”\?/.test(q3)&&/At the end of the chapter/.test(q3)&&/After paragraph 1\s*One\./.test(q3)&&/After paragraph 3\s*Three\./.test(q3),'BD-10a','3. Where in the chapter?: At the end, or After paragraph…, each showing its first words: '+JSON.stringify(q3.slice(q3.indexOf('Where in chapter'),q3.indexOf('Where in chapter')+220)));
   await click(pg,'[data-dpara="0"]',3000); const done=await pg.evaluate(()=>({slot:SLOT,text:CH.get(BOOK.order[0]).text,anchor:S.anchor,tab:S.tab,drafts:typeof DR!=='undefined'?DR.filter(d=>d.words>0).length:null,
     ch:(CH.get(S.tab==='read'?S.rch:S.cur)||{}).title,shown:[...document.querySelectorAll('#spread .face:not(.gone) .ptext')].filter(f=>f.getBoundingClientRect().width>0).map(f=>f.textContent).join(' ').replace(/\s+/g,' ')}));
   ok(done.text==='One.\nThe draft line about the lighthouse.\nTwo.\nThree.','BD-10b','tap one and the draft is added there: '+JSON.stringify(done.text));
   /* rev 267: "the book opens at that spot": the right book, in Read, at chapter "First Light", with the added lines on the page shown */
   ok(done.slot===home&&done.tab==='read'&&done.ch==='First Light'&&/The draft line about the lighthouse/.test(done.shown),'BD-10c','the book opens at that spot: '+JSON.stringify({slot:done.slot,home,tab:done.tab,ch:done.ch,shown:done.shown.slice(0,80)}));
   await lib(pg); const left=await shelf(pg); ok(!/lighthouse/.test(left),'BD-10d','the draft has gone from Drafts once it is in the book (the manual says so since rev 267)');
   await click(pg,'[data-dnew]',1500); await pg.evaluate(()=>{ const c=CH.get(S.cur); c.text='Another draft.'; touchChapter(c); }); await lib(pg); const did=await pg.evaluate(()=>document.querySelector('[data-ddel]').dataset.ddel);
   await click(pg,`[data-ddel="${did}"]`,300); const arm=await pg.evaluate(d=>document.querySelector(`[data-ddel="${d}"]`).textContent,did); await click(pg,`[data-ddel="${did}"]`,900);
   ok(arm==='Delete?'&&!/Another draft/.test(await shelf(pg)),'BD-07c','Delete removes the draft (tap twice): '+arm);
   await pg.ctx.close(); });
 // ---------- Books you've added to read
 await run('BD-13',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]); await lib(pg);
   const r=await pg.evaluate(async()=>{ const m=[...document.querySelectorAll('[data-read]')].find(e=>e.dataset.read==='manual'); m.click(); await new Promise(r=>setTimeout(r,1500)); jumpTo({ch:rOrder()[5],i:0}); await new Promise(r=>setTimeout(r,300)); rememberPos&&rememberPos(); document.querySelector('#libBtn').click(); await new Promise(r=>setTimeout(r,500));
     const row=[...document.querySelectorAll('#shelf .bookrow')].find(r=>/Inkhorse User manual/.test(r.innerText)); return {row:row.innerText.replace(/\s+/g,' '),btn:row.querySelector('[data-read]').textContent}; });
   ok(r.btn==='Reading','BD-13a','an added book’s button says Reading while it is open: '+r.btn);
   ok(/at ch 6\b/.test(r.row),'BD-13b','“at ch N” shows where you left off: '+r.row);
   await pg.ctx.close(); });
 // ---------- Compare
 await run('CP-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); /* rev 267: chapters long enough to fill several tablet pages */ await book(pg,[['First Light',LONG(1)+'\n'+LONG(3)+'\n'+LONG(4)],['Second Wind',LONG(2)+'\n'+LONG(5)+'\n'+LONG(6)]]); await pg.evaluate(()=>{ scheduleCompare(); setTab('compare'); }); await pg.waitForTimeout(2000);
   const r=await pg.evaluate(()=>({t:document.querySelector('#compare').innerText.replace(/\s+/g,' '),rows:[...document.querySelectorAll('#compare [data-dev],#rows [data-dev],#rows button')].length}));
   const names=['Phone','Large phone','Small tablet','Tablet','Paperback 6 × 9 in'];
   /* rev 267: the numbers themselves. Each row's words per page is held against a real page of the book in Read at that device size,
      the bars are drawn to one scale, a bigger text size changes the numbers, and the whole-book estimates are held against the real page count in Read */
   const rowsOf=()=>pg.evaluate(()=>[...document.querySelectorAll('#rows [data-dev]')].map(e=>({dev:e.dataset.dev,name:e.querySelector('.nm').textContent,words:+((e.querySelector('.cap').textContent.match(/[\d,]+/)||['0'])[0].replace(/,/g,'')),meter:parseFloat(e.querySelector('.meter i').style.width)})));
   const rows1=await rowsOf(), W1=Object.fromEntries(rows1.map(x=>[x.dev,x.words])), max1=Math.max(...rows1.map(x=>x.words));
   const real=await pg.evaluate(async devs=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), out={}, sel=document.querySelector('#deviceSel'); setTab('read'); await w(300);
     for(const d of devs){ sel.value=d; sel.dispatchEvent(new Event('change',{bubbles:true})); await w(600); const id=BOOK.order[0]; jumpTo({ch:id,i:1}); await w(300);
       /* words on each full page in the middle of the chapter (not its opening page, not its last), one face at a time; the middle value */
       const id1=BOOK.order[0], n=pag(id1).pages.length, per=[]; for(let i=1;i<n-1;i++){ jumpTo({ch:id1,i}); await w(120); for(const f of document.querySelectorAll('#spread .face:not(.gone)')){ const ref=f.querySelector('.ptext'); if(!ref) continue; const ws=new Set(); f.querySelectorAll('.ptext [data-w]').forEach(e=>ws.add(e.dataset.w)); if(ws.size) per.push(ws.size); } }
       per.sort((a,b)=>a-b); out[d]={face:per.length?per[per.length>>1]:0,n:per.length,book:BOOK.order.reduce((t,c)=>t+pag(c).pages.length,0)}; }
     sel.value='screen'; sel.dispatchEvent(new Event('change',{bubbles:true})); await w(400); setTab('compare'); await w(300); return out; },['phone','tablet','print']);
   const near=(a,b,p)=>Math.abs(a-b)<=Math.max(1,b*p);
   const fsChange=await pg.evaluate(async()=>{ const f=document.querySelector('#fs'), v0=f.value; f.value=String(+v0+6); f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); scheduleCompare(); await new Promise(r=>setTimeout(r,2000)); return v0; });
   const rows2=await rowsOf(), W2=Object.fromEntries(rows2.map(x=>[x.dev,x.words]));
   await pg.evaluate(async v0=>{ const f=document.querySelector('#fs'); f.value=v0; f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); scheduleCompare(); await new Promise(r=>setTimeout(r,1500)); },fsChange);
   const okA=names.every(n=>rows1.some(x=>x.name===n))&&W1.phone<W1.phonelg&&W1.phonelg<W1.tabsm&&W1.tabsm<=W1.tablet&&rows1.every(x=>Math.abs(x.meter-Math.round(x.words/max1*100))<=1)
     &&['phone','tablet','print'].every(d=>near(W1[d],real[d].face,0.12))&&['phone','phonelg','tablet','print'].every(d=>W2[d]<W1[d]);
   ok(okA,'CP-01a','Words per page lists each phone, tablet and paperback size, measured at your current type settings and drawn to the same scale: '+JSON.stringify({compare:W1,realPage:Object.fromEntries(Object.entries(real).map(([k,v])=>[k,v.face])),bars:rows1.map(x=>x.meter),bigger:W2}));
   const est=(r.t.match(/≈ (\d+) phone pages ≈ (\d+) tablet pages ≈ (\d+) paperback pages/)||[]).slice(1).map(Number);
   ok(est.length===3&&near(est[0],real.phone.book,0.15)&&near(est[1],real.tablet.book,0.15)&&near(est[2],real.print.book,0.15)&&est[0]>est[1],'CP-01b','Whole book estimates the pages on a phone, a tablet and a 6 × 9 paperback: '+JSON.stringify({estimate:est,realInRead:[real.phone.book,real.tablet.book,real.print.book]}));
   const tap=await pg.evaluate(async()=>{ const d0=S.dev; const row=[...document.querySelectorAll('#rows [data-dev],#rows button,#compare [data-dev]')].find(e=>/Tablet/.test(e.innerText)&&!/Small/.test(e.innerText)); if(!row) return 'no row'; row.click(); await new Promise(r=>setTimeout(r,800)); return {tab:S.tab,dev:S.dev,d0}; });
   ok(tap&&tap.tab==='read'&&tap.dev==='tablet','CP-01c','tap a device: your book opens in Read at that screen size: '+JSON.stringify(tap));
   const stay=await pg.evaluate(async()=>{ setTab('write'); await new Promise(r=>setTimeout(r,300)); setTab('read'); await new Promise(r=>setTimeout(r,300)); const kept=S.dev;
     const sel=document.querySelector('#deviceSel'); sel.value='screen'; sel.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); return {kept,back:S.dev}; });
   ok(stay.kept==='tablet'&&stay.back==='screen','CP-01d','the book stays at that size until you pick Fit my screen in the Device menu: '+JSON.stringify(stay));
   await pg.ctx.close(); });
 // ---------- Put Inkhorse on your home screen
 /* rev 267: HS-01a/b read the page under test and the files it points to (before, they read the live app.html from disk and matched any icon);
    HS-01c watches the opening screen as the Home Screen app shows it; HS-16 catches the call Inkhorse makes at start-up. */
 await run('HS-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   const r=await pg.evaluate(async()=>{ const q=s=>document.querySelector(s), out={};
     out.capable=(q('meta[name="apple-mobile-web-app-capable"]')||{}).content||''; out.mcapable=(q('meta[name="mobile-web-app-capable"]')||{}).content||'';
     /* the page is installed as /app.html (the preview is copied there when Steve approves it), so its links are read as they will be there */
     const L=q('link[rel="manifest"]'), ml=L?{href:new URL(L.getAttribute('href'),location.origin+'/app.html').href}:null, man=ml?await (await fetch(ml.href,{cache:'no-store'})).json():null; out.display=man&&man.display;
     const dims=async src=>{ try{ const bl=await (await fetch(src,{cache:'no-store'})).blob(); const im=await createImageBitmap(bl); return [im.width,im.height,bl.type]; }catch(e){ return null; } };
     out.icons=man?await Promise.all(man.icons.map(async i=>({src:i.src,sizes:i.sizes,got:await dims(new URL(i.src,ml.href).href)}))):[];
     const at=q('link[rel="apple-touch-icon"]'); out.touch=at?await dims(at.href):null;
     const b64=async src=>{ const bl=await (await fetch(src,{cache:'no-store'})).blob(); const a=new Uint8Array(await bl.arrayBuffer()); let h=0; for(const x of a) h=(h*31+x)>>>0; return a.length+':'+h; };
     out.touchSum=at?await b64(at.href):''; out.touchFile=await b64(new URL('/icons/apple-touch-icon.png',location.href).href);
     /* the same horse on every icon: the 512 icon drawn down to 180 matches the iPhone icon */
     try{ const A=await createImageBitmap(await (await fetch(new URL(man.icons.find(i=>i.sizes==='512x512'&&i.purpose!=='maskable').src,ml.href).href)).blob()), B=await createImageBitmap(await (await fetch(at.href)).blob());
       const px=im=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); g.drawImage(im,0,0,64,64); return g.getImageData(0,0,64,64).data; }; const a=px(A), bb=px(B); let d=0; for(let k=0;k<a.length;k+=4) d+=Math.abs(a[k]-bb[k])+Math.abs(a[k+1]-bb[k+1])+Math.abs(a[k+2]-bb[k+2]); out.diff=+(d/(64*64*3)).toFixed(1); }catch(e){ out.diff=999; }
     return out; });
   const iconsOk=r.icons.length>=2&&r.icons.every(i=>i.got&&i.sizes===i.got[0]+'x'+i.got[1]&&i.got[2]==='image/png')&&r.icons.some(i=>i.sizes==='512x512');
   ok(r.display==='standalone'&&r.mcapable==='yes'&&iconsOk&&r.diff<25,'HS-01a','it installs like an app: its own icon, full screen with no browser bars: '+JSON.stringify({display:r.display,icons:r.icons.map(i=>i.sizes+'='+(i.got||[]).slice(0,2).join('x')),sameHorse:r.diff}));
   ok(r.capable==='yes'&&r.touch&&r.touch[0]===180&&r.touch[1]===180&&r.touchSum===r.touchFile,'HS-01b','iPhone: Add to Home Screen gets the horse icon (the approved icons/apple-touch-icon.png, 180 × 180) and opens without Safari’s bars: '+JSON.stringify({capable:r.capable,touch:r.touch,same:r.touchSum===r.touchFile}));
   await pg.ctx.close(); });
 await run('HS-01c',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true}); }catch(_){ }
       window.__hid=false; try{ Object.defineProperty(document,'hidden',{get:()=>window.__hid,configurable:true}); }catch(_){ }
       const t0=performance.now(); window.__spl=[]; setInterval(()=>{ const s=document.getElementById('splash'); if(s) window.__spl.push([Math.round(performance.now()-t0),!s.hidden&&getComputedStyle(s).opacity!=='0'&&s.style.opacity!=='0']); },100); } });
   await pg.waitForTimeout(5500);
   const first=await pg.evaluate(()=>{ const on=window.__spl.filter(x=>x[1]).map(x=>x[0]); return {from:on[0],to:on[on.length-1],motto:(()=>{ const s=document.getElementById('splash'), im=s&&s.querySelector('img'), bg=s?getComputedStyle(s).backgroundImage:''; return (im&&im.complete&&im.naturalWidth>0?im.alt:'NO PICTURE')+' | '+(/navy|rgb\(2[0-9], 3[0-9], 4[0-9]\)|rgb\(1[0-9], 2[0-9], 3[0-9]\)/.test(bg)?'navy':'not navy:'+bg.slice(0,60)); })(),now:window.__spl[window.__spl.length-1]}; });
   const away=async ms=>{ await pg.evaluate(()=>{ window.__spl=[]; window.__hid=true; document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForTimeout(ms);
     await pg.evaluate(()=>{ window.__hid=false; document.dispatchEvent(new Event('visibilitychange')); }); await pg.waitForTimeout(5000);
     return pg.evaluate(()=>{ const s=window.__spl, back=s.findIndex((x,k)=>k>0&&x[1]&&!s[k-1][1]); const on=s.filter(x=>x[1]).map(x=>x[0]); return on.length?{shown:true,secs:+((on[on.length-1]-on[0])/1000).toFixed(1)}:{shown:false}; }); };
   const quick=await away(1000), long=await away(3500);
   const secs=(first.to-first.from)/1000;
   ok(secs>=3.4&&secs<=4.8&&/^Inkhorse\. The power to get it done, and then some! \| navy$/.test(first.motto)&&!quick.shown&&long.shown&&long.secs>=3.4&&long.secs<=4.8,'HS-01c','the opening screen (the horse, the name Inkhorse and the motto, one picture on navy, loaded) shows for about four seconds when opened from the icon, and again when you come back after a while (not after a moment away): '+JSON.stringify({openSecs:+secs.toFixed(1),back1s:quick,back3_5s:long}));
   await pg.ctx.close(); });
 await run('HS-16',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:()=>{ window.__persist=[]; try{ const st=navigator.storage; const o=st.persist&&st.persist.bind(st); st.persist=function(){ window.__persist.push(new Error().stack||'call'); return o?o():Promise.resolve(true); }; }catch(_){ } }});
   const r=await pg.evaluate(()=>({calls:window.__persist.length,voice:S.ttsVoice||'',kok:!!(S.kokHave)}));
   ok(r.calls>=1&&!/^kokoro:/.test(r.voice)&&!r.kok,'HS-16','Inkhorse asks your phone to keep its saved data when it opens (no natural voice chosen): '+JSON.stringify(r)); await pg.ctx.close(); });
 // ---------- Quick fixes
 await run('QF-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)]]);
   const t=await pg.evaluate(()=>{ const t=document.querySelector('#toolsBtn').getBoundingClientRect(), w=document.querySelector('#write').getBoundingClientRect(); return {right:Math.round(w.right-t.right),top:Math.round(t.top-w.top),wW:Math.round(w.width)}; });
   /* rev 267: right side AND the top row of Write (its top within the first 80 px), and in view */
   ok(t.right<t.wW*0.3&&t.top>=0&&t.top<80&&await vis(pg,'#toolsBtn'),'QF-03','the Tools button is at the top right of the Write tab: '+JSON.stringify(t));
   const st=await pg.evaluate(()=>document.querySelector('#saveNote,#status,#statusText')&&[...document.querySelectorAll('#saveNote,#status,#statusText')].map(e=>e.textContent+'|'+(e.title||'')+'|'+(e.getAttribute('aria-label')||'')).join(' ; '));
   ok(/device only/i.test(st),'QF-04','the save status says “device only” in this copy: '+st);
   await pg.evaluate(()=>{ setTab('read'); }); await pg.click('#maxBtn'); await pg.waitForTimeout(500);
   const back=await pg.evaluate(async()=>{ const st=document.querySelector('#stage').getBoundingClientRect(); const el=document.elementFromPoint(st.x+st.width/2,st.y+st.height/2); const ev=t=>new PointerEvent(t,{clientX:st.x+st.width/2,clientY:st.y+st.height/2,bubbles:true,pointerId:3,pointerType:'touch',isPrimary:true}); el.dispatchEvent(ev('pointerdown')); el.dispatchEvent(ev('pointerup')); el.click(); await new Promise(r=>setTimeout(r,900)); return document.body.classList.contains('immersive'); });
   ok(!back,'QF-01','controls vanished in Full screen: a tap in the middle of the page brings them back: immersive='+back);
   await pg.ctx.close(); });
 await run('QF-06',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light','Some words in a chapter.']]);
   await pg.click('#chBtn'); await pg.waitForTimeout(300);
   const r=await pg.evaluate(async()=>{ navigator.clipboard.writeText=()=>Promise.reject(new Error('blocked')); document.execCommand=()=>false; await copyChapterFromList(document.querySelector(`[data-copy="${BOOK.order[0]}"]`)); await new Promise(r=>setTimeout(r,500));
     const box=[...document.querySelectorAll('textarea[readonly]')].find(t=>t.offsetParent); return {tab:S.tab,box:!!box,val:box&&box.value}; });
   ok(r.tab==='write'&&r.box&&/Some words in a chapter/.test(r.val||''),'QF-06','when a browser blocks Copy on a chapter row, Inkhorse shows the chapter in a box in Write: '+JSON.stringify(r));
   await pg.ctx.close(); });
 await b.close(); })();
