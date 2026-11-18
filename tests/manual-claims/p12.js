/* User manual claim checks, rev 258: second part of the promises the Nov 13 review found had NO check
   (docs/reviews/manual-claims-review-2026-11-13.md, "MISSING"). Ids are M-<number in that list>. */
const {chromium,devices,say,mk,book,para,toastText,vis,fs,path,REPO,S:TMP}=require('./common.js');
const JSZip=require('jszip');
let pdfjs; { const w=console.warn,l=console.log; console.warn=console.log=()=>{}; pdfjs=require(path.join(process.env.PDFJS_DIR,'..','legacy','build','pdf.js')); console.warn=w; console.log=l; }
const run=async(id,fn)=>{ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
const dl=async(pg,sel)=>{ const [d]=await Promise.all([pg.waitForEvent('download',{timeout:90000}), pg.evaluate(s=>document.querySelector(s).click(),sel)]); return fs.readFileSync(await d.path()); };
const noErr=(pg,id)=>{ if(pg.errs&&pg.errs.length) say('FAULT',id+'x','the page reported an error: '+pg.errs[0].slice(0,160)); };
const read=async pg=>{ await pg.evaluate(()=>setTab('read')); await pg.waitForTimeout(500); };
const URL_=process.env.MURL||'http://127.0.0.1:8765/preview/next.html';
(async()=>{ const b=await chromium.launch();

 // ---------- 6: Spelling on just the selected words, and Fix all
 await run('M-06',async()=>{ const ctx=await b.newContext({...devices['iPhone 14 Pro Max']});
   await ctx.addInitScript(()=>{ window.__asked=[]; const sample={json:async p=>{ window.__asked.push(p); const t=p.slice(p.lastIndexOf('TEXT:')); const out=[]; if(/recieve/.test(t)) out.push({word:'recieve',fix:'receive'}); if(/\bteh\b/.test(t)) out.push({word:'teh',fix:'the'}); if(/alot/.test(t)) out.push({word:'alot',fix:'a lot'}); return out; }};
     let own=null; Object.defineProperty(window,'claude',{configurable:true,get(){ return {use:async k=>k==='sample'?sample:(own?own.use(k):null)}; },set(v){ own=v; }}); });
   const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); await pg.goto(URL_); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.some(x=>x.id==='manual'),null,{timeout:30000}); await pg.waitForTimeout(1200);
   const T='I will recieve teh letter. We walked alot that day. Then teh rain came and I did recieve it.';
   await book(pg,[['One',T]]);
   const sel=await pg.evaluate(async T=>{ const ta=document.querySelector('#manuscript'); const a=T.indexOf('We walked'), e=T.indexOf('Then'); ta.focus(); ta.setSelectionRange(a,e); document.querySelector('#spellBtn').click(); await new Promise(r=>setTimeout(r,700));
     const asked=window.__asked[window.__asked.length-1]||''; const body=asked.slice(asked.lastIndexOf('TEXT:')); const rows=[...document.querySelectorAll('#assistBody .fix')].map(e=>e.querySelector('.w').textContent);
     return {sentOnlySelection:/We walked alot/.test(body)&&!/recieve/.test(body)&&!/Then teh/.test(body),rows}; },T);
   ok(sel.sentOnlySelection&&sel.rows.join()==='alot','M-06a','with words selected, Spelling checks just those words: '+JSON.stringify(sel));
   const all=await pg.evaluate(async()=>{ const ta=document.querySelector('#manuscript'); ta.setSelectionRange(0,0); document.querySelector('#spellBtn').click(); await new Promise(r=>setTimeout(r,700));
     const btn=document.querySelector('#assistBody [data-fixall]'); const lab=btn?btn.textContent:''; const before=ta.value; if(btn) btn.click(); await new Promise(r=>setTimeout(r,400)); return {lab,before,after:ta.value}; });
   ok(/Fix all 3/.test(all.lab)&&all.after==='I will receive the letter. We walked a lot that day. Then the rain came and I did receive it.','M-06b','Fix all corrects every word found, every place it appears, and changes nothing else: '+JSON.stringify({button:all.lab,after:all.after})); noErr(pg,'M-06'); await ctx.close(); });

 // ---------- 11: the backup-file reminder comes when you open a book that has writing, once a day; never for an empty book
 await run('M-11',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:6},(_,k)=>para(k,90)).join('\n')]]);
   await pg.evaluate(()=>{ BOOK.title='Reminder Book'; touchIndex(); S.fileBk={t:Date.now()-8*864e5,c:1,w:500}; S.fbkNudge=''; saveSettings(); }); await pg.waitForTimeout(2600);
   const open=async()=>{ await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&typeof BOOK!=='undefined',null,{timeout:30000}); let seen=''; for(let k=0;k<22;k++){ await pg.waitForTimeout(400); const t=await toastText(pg); if(/backup file/i.test(t)){ seen=t; break; } } return seen; };
   const first=await open(); const title=await pg.evaluate(()=>BOOK.title); const second=await open();
   ok(title==='Reminder Book'&&/Save a backup file/.test(first)&&second==='','M-11a','eight days after the last backup file, opening the book shows the reminder; opening it again the same day does not: '+JSON.stringify({first:first.slice(0,60),second}));
   await pg.evaluate(()=>{ BOOK.order.forEach(id=>{ const c=CH.get(id); c.text='Just a line.'; touchChapter(c); }); touchIndex(); S.fbkNudge=''; saveSettings(); }); await pg.waitForTimeout(2600);
   const empty=await open(); ok(empty==='','M-11b','a book with hardly any writing in it gets no reminder: "'+empty+'"'); noErr(pg,'M-11'); await pg.context().close(); });

 // ---------- 15: the Highlighter works in books you've added to read and in the manual, and never changes the book's text
 await run('M-15',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const f=TMP+'/read-me.txt'; fs.writeFileSync(f,'Chapter One\n\n'+Array.from({length:8},(_,k)=>para(k,90)).join('\n\n'));
   await pg.evaluate(()=>{ setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500);
   await pg.setInputFiles('#libIn',f); await pg.waitForFunction(()=>LIB.some(x=>!['manual','standard','publishing'].includes(x.id)),null,{timeout:20000}); await pg.waitForTimeout(600);
   const id=await pg.evaluate(()=>LIB.find(x=>!['manual','standard','publishing'].includes(x.id)).id);
   await pg.evaluate(async id=>{ await openLibBook(id,true); setTab('read'); },id); await pg.waitForTimeout(900);
   const r=await pg.evaluate(async()=>{ const ch=rOrder().find(c=>!isCover(c)&&getCh(c).text.length>500); jumpTo({ch,i:0}); await new Promise(r=>setTimeout(r,400)); const t0=getCh(ch).text; addMark(ch,12,18); refreshReader(); await new Promise(r=>setTimeout(r,400));
     return {ch,same:getCh(ch).text===t0,len:t0.length,lit:document.querySelectorAll('#spread .face:not(.gone) .hlm').length,marks:marksOf(ch).length,stored:JSON.stringify(JSON.parse(localStorage.getItem(RMK)||'{}')[RB.id]||null)}; });
   ok(r.lit>=4&&r.marks===1&&r.same&&r.stored!=='null','M-15a','in a book added to read, a highlight shows on the page, is kept beside the book on this device, and the book\'s own text is unchanged: '+JSON.stringify({lit:r.lit,marks:r.marks,textSame:r.same,stored:r.stored.slice(0,60)}));
   await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.length>3,null,{timeout:30000}); await pg.waitForTimeout(1200);
   const again=await pg.evaluate(async([id,ch])=>{ await openLibBook(id,true); setTab('read'); await new Promise(r=>setTimeout(r,700)); jumpTo({ch,i:0}); await new Promise(r=>setTimeout(r,500)); return {lit:document.querySelectorAll('#spread .face:not(.gone) .hlm').length,len:getCh(ch).text.length}; },[id,r.ch]);
   ok(again.lit>=4&&again.len===r.len,'M-15b','close and reopen: the highlight is still there and the book is the same length: '+JSON.stringify(again));
   const man=await pg.evaluate(async()=>{ await openLibBook('manual',true); setTab('read'); await new Promise(r=>setTimeout(r,700)); const ch=rOrder().find(c=>!isCover(c)&&!/%%toc/.test(getCh(c).text)&&getCh(c).text.length>800); jumpTo({ch,i:1}); await new Promise(r=>setTimeout(r,500)); const w=pag(ch).pages[1][0]; addMark(ch,w+5,w+9); refreshReader(); await new Promise(r=>setTimeout(r,400)); return document.querySelectorAll('#spread .face:not(.gone) .hlm').length; });
   ok(man>=3,'M-15c','the Highlighter works in the manual too: '+man+' words lit'); noErr(pg,'M-15'); await pg.context().close(); });

 // ---------- 16: pictures on the page stay as they are when you fix
 await run('M-16',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const PIC='[[image 0123456789abcdef0123456789abcdef | inline | 60% | center | A caption for the picture]]';
   await book(pg,[['First Light','A first paragraph that is long enough to read.\n'+PIC+'\nA second paragraph after the picture.']]); await read(pg);
   const r=await pg.evaluate(async()=>{ let sp=null; for(let i=0;i<nPages(BOOK.order[0])&&!sp;i++){ jumpTo({ch:BOOK.order[0],i}); await new Promise(r=>setTimeout(r,350)); sp=[...document.querySelectorAll('#spread .face:not(.gone) .ptext [data-w]')].find(e=>e.textContent.replace(/[^a-z]/gi,'')==='second'); } fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w});
     const t=document.querySelector('#fixText'); const v=t.value; t.setRangeText('SECOND',ED.sel[0],ED.sel[1],'end'); t.dispatchEvent(new Event('input',{bubbles:true})); fixDone(); await new Promise(r=>setTimeout(r,500)); return {v,text:CH.get(S.rch).text}; });
   ok(!r.v.includes('[[image')&&r.text==='A first paragraph that is long enough to read.\n'+PIC+'\nA SECOND paragraph after the picture.','M-16','a picture on the page stays exactly as it is when you fix a word near it: '+JSON.stringify({box:r.v.slice(0,60),text:r.text.slice(40,150)})); noErr(pg,'M-16'); await pg.context().close(); });

 // ---------- 17: exported books always let sections carry on, even with "New page for each section" checked
 await run('M-17',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const body=k=>para(k,70)+'\n# A section '+k+'\n'+para(k+1,70)+'\n# Another section '+k+'\n'+para(k+2,70);
   await book(pg,[['First Light',body(1)],['Second Wind',body(5)]]); await pg.evaluate(()=>{ BOOK.title='Section Book'; BOOK.author='Ada Tester'; touchIndex(); });
   const pagesOf=raw=>(raw.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g)||[]).length;
   const epubText=async raw=>{ const z=await JSZip.loadAsync(raw); const out=[]; for(const n of Object.keys(z.files).sort()){ if(/\.(xhtml|css)$/.test(n)) out.push(n+'\n'+await z.files[n].async('string')); } return out.join('\n'); };
   const setSec=on=>pg.evaluate(on=>{ const c=document.querySelector('#secPage'); if(c.checked!==on){ c.checked=on; c.dispatchEvent(new Event('change',{bubbles:true})); } },on);
   await setSec(false); await pg.waitForTimeout(400); const screen0=await pg.evaluate(()=>BOOK.order.reduce((t,id)=>t+nPages(id),0));
   await pg.evaluate(()=>openDrawer()); await pg.waitForTimeout(300); const pdf0=pagesOf(await dl(pg,'#expPdf')); const ep0=await epubText(await dl(pg,'#expEpub'));
   await setSec(true); await pg.waitForTimeout(600); const screen1=await pg.evaluate(()=>BOOK.order.reduce((t,id)=>t+nPages(id),0));
   const pdf1=pagesOf(await dl(pg,'#expPdf')); const ep1=await epubText(await dl(pg,'#expEpub'));
   ok(screen1>screen0&&pdf0>1&&pdf1===pdf0&&ep1===ep0&&ep0.length>2000,'M-17','with the box checked the screen starts each section on a new page ('+screen0+' → '+screen1+' pages) but the print PDF ('+pdf0+' → '+pdf1+' pages) and the EPUB (same chapters and styles: '+(ep1===ep0)+') are unchanged'); noErr(pg,'M-17'); await pg.context().close(); });

 // ---------- 25: a PDF longer than 300 pages always comes in as text
 await run('M-25',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const D=process.env.PDFJS_DIR;
   await pg.context().route(/pdf\.min\.js(\?.*)?$/,r=>r.fulfill({body:fs.readFileSync(path.join(D,'pdf.min.js')),contentType:'application/javascript'}));
   await pg.context().route(/pdf\.worker\.min\.js(\?.*)?$/,r=>r.fulfill({body:fs.readFileSync(path.join(D,'pdf.worker.min.js')),contentType:'application/javascript',headers:{'access-control-allow-origin':'*'}}));
   const {jsPDF}=require('jspdf'); const mkPdf=n=>{ const d=new jsPDF({unit:'pt',format:[432,648]}); for(let p=0;p<n;p++){ if(p) d.addPage(); d.setFontSize(12); if(p%20===0){ d.setFontSize(18); d.text('Chapter '+(p/20+1),60,90); d.setFontSize(12); } for(let l=0;l<8;l++) d.text('Page '+(p+1)+' line '+(l+1)+' of the long book walks on steadily.',60,130+l*18); } return Buffer.from(d.output('arraybuffer')); };
   const add=async(file,n)=>{ fs.writeFileSync(file,mkPdf(n)); await pg.evaluate(()=>{ setTab('read'); document.querySelector('#library').hidden=true; document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500); const n0=await pg.evaluate(()=>LIB.length);
     await pg.setInputFiles('#libIn',file); await pg.waitForSelector('[data-way="pages"]',{timeout:15000}); await pg.evaluate(()=>document.querySelector('[data-way="pages"]').click());
     await pg.waitForFunction(n=>LIB.length>n,n0,{timeout:240000}); await pg.waitForTimeout(800); const want=path.basename(file,'.pdf'); return pg.evaluate(w=>{ const m=LIB.find(x=>x.title===w)||{}; return {title:m.title,pics:!!m.pageMode,keys:Object.keys(m).join(','),note:document.querySelector('#libNote').textContent}; },want); };
   const small=await add(TMP+'/short-book.pdf',12); const big=await add(TMP+'/long-book.pdf',301);
   ok(small.title==='short-book'&&big.title==='long-book'&&small.pics===true&&big.pics===false,'M-25','asked for "Pages exactly as printed": a 12-page PDF comes in as pictures of its pages, a 301-page PDF comes in as text: '+JSON.stringify({short:small.pics,long:big.pics,note:big.note.slice(0,90),keys:(small.keys||'').slice(0,120)})); noErr(pg,'M-25'); await pg.context().close(); });

 // ---------- 29: words found in your book come with the book wherever it goes
 await run('M-29',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const T='We met at the Rimmon Club on Kelley Street. The Rimmon Club was loud that night, and Kelley Street was dark.\n'+para(1,80);
   await book(pg,[['First Light',T]]); await pg.evaluate(()=>{ BOOK.title='Travel Book'; touchIndex(); });
   const here=await pg.evaluate(()=>hpVocab().map(v=>v.w)); await pg.click('#chBtn'); await pg.waitForTimeout(300);
   const raw=await dl(pg,'#fbkSave'); const f=TMP+'/travel.inkhorse'; fs.writeFileSync(f,raw); await pg.context().close();
   const p2=await mk(b,'iPhone 14 Pro Max'); await book(p2,[['Empty','Nothing here yet.']]); const before=await p2.evaluate(()=>hpVocab().map(v=>v.w));
   await p2.click('#chBtn'); await p2.waitForTimeout(300); await p2.setInputFiles('#fbkIn',f); await p2.waitForTimeout(700); await p2.evaluate(()=>document.querySelector('#fbkGo').click()); await p2.waitForTimeout(1800);
   const there=await p2.evaluate(()=>({title:BOOK.title,v:hpVocab().map(v=>v.w)}));
   const has=a=>a.some(w=>/Rimmon/.test(w))&&a.some(w=>/Kelley/.test(w));
   ok(has(here)&&!has(before)&&there.title==='Travel Book'&&has(there.v),'M-29','the names Hoofprint found in the book are known again on another device once the book\'s backup file is restored there: '+JSON.stringify({here:here.slice(0,4),freshDevice:before.slice(0,3),afterRestore:there.v.slice(0,4)})); noErr(p2,'M-29'); await p2.context().close(); });

 // ---------- 3 (rest): F11, the browser's own full screen, hides Inkhorse's controls while reading, and leaving it brings them back
 await run('M-03j',async()=>{ const pg=await mk(b,{viewport:{width:1280,height:800},screen:{width:1280,height:900}}); await book(pg,[['One',Array.from({length:12},(_,k)=>para(k,90)).join('\n')]]); await read(pg);
   const touch=await pg.evaluate(()=>navigator.maxTouchPoints||0);
   if(touch>0){ say('NOTE','M-03j','this browser stand-in says it is a touch screen (set so for the phone checks), so the computer-only F11 rule cannot be tried here; it is checked in Chromium'); await pg.context().close(); return; }
   /* the test browser makes its pretend screen follow the window, so the screen is pinned at 1280x900 here, as a real monitor is */
   await pg.evaluate(()=>{ Object.defineProperty(Screen.prototype,'height',{get(){ return 900; },configurable:true}); Object.defineProperty(Screen.prototype,'width',{get(){ return 1280; },configurable:true}); });
   const c0=await pg.evaluate(()=>document.body.classList.contains('immersive'));
   await pg.setViewportSize({width:1280,height:900}); await pg.waitForTimeout(500); const c1=await pg.evaluate(()=>document.body.classList.contains('immersive'));
   await pg.setViewportSize({width:1280,height:800}); await pg.waitForTimeout(500); const c2=await pg.evaluate(()=>document.body.classList.contains('immersive'));
   ok(!c0&&c1&&!c2,'M-03j','when the window fills the whole screen (F11) Inkhorse hides its controls, and brings them back when it no longer does: '+JSON.stringify({before:c0,full:c1,after:c2})); noErr(pg,'M-03j'); await pg.context().close(); });

 // ---------- 9, 14: every small cover is 2:3; a cover of another shape shows whole on the page, with its own edge colours carried on around it
 await run('M-09',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:6},(_,k)=>para(k,90)).join('\n')]]);
   const f=TMP+'/cov-two-tone.png'; const d=await pg.evaluate(()=>{ const cv=document.createElement('canvas'); cv.width=1200; cv.height=1200; const g=cv.getContext('2d'); g.fillStyle='rgb(200,30,30)'; g.fillRect(0,0,600,1200); g.fillStyle='rgb(30,40,200)'; g.fillRect(600,0,600,1200); return cv.toDataURL('image/png').split(',')[1]; }); fs.writeFileSync(f,Buffer.from(d,'base64'));
   await pg.click('#chBtn'); await pg.waitForTimeout(250); await pg.setInputFiles('#covFrontIn',f); await pg.waitForTimeout(1800);
   const ratio=sel=>pg.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); return r.height>0?+(r.width/r.height).toFixed(3):0; },sel);
   const set=await ratio('#covFrontImg'); await pg.evaluate(()=>{ document.querySelector('#drawer').hidden=true; setTab('read'); }); await pg.waitForTimeout(500);
   await pg.evaluate(()=>{ if(document.querySelector('#goto').hidden) openGoto(); }); await pg.waitForTimeout(500); const hub=await ratio('.grow2 .gt.cvbox'); await pg.evaluate(()=>closeGoto());
   await pg.evaluate(()=>{ document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(700); const libs=await pg.evaluate(()=>[...document.querySelectorAll('.bookrow .thumb')].map(e=>{ const r=e.getBoundingClientRect(); return +(r.width/r.height).toFixed(3); })); await pg.evaluate(()=>{ document.querySelector('#library').hidden=true; });
   const near=x=>x!=null&&Math.abs(x-2/3)<0.02;
   ok(near(set)&&near(hub)&&libs.length>=3&&libs.every(near),'M-09','with a square cover picture, every small cover is still 2:3: Book settings '+set+', Book Hub '+hub+', Library '+JSON.stringify(libs));
   await pg.evaluate(()=>{ jumpTo({ch:'__front',i:0}); }); await pg.waitForTimeout(1500);
   const cov=await pg.evaluate(()=>{ const f=document.querySelector('#spread .face:not(.gone)'), fr=f.getBoundingClientRect(); const imgs=[...f.querySelectorAll('img')].map(i=>{ const r=i.getBoundingClientRect(); return {w:r.width,h:r.height,in:r.left>=fr.left-1&&r.right<=fr.right+1&&r.top>=fr.top-1&&r.bottom<=fr.bottom+1,fit:getComputedStyle(i).objectFit}; });
     const styles=[f,...f.querySelectorAll('*')].map(e=>(e.getAttribute('style')||'')+' '+getComputedStyle(e).backgroundImage).join(' ; '); const grads=styles.match(/linear-gradient\((?:[^()]|\([^()]*\))*\)/g)||[]; const g=grads.find(x=>/90deg/.test(x)&&/rgb/.test(x))||''; const cols=[...g.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)].map(m=>[+m[1],+m[2],+m[3]]);
     return {face:[Math.round(fr.width),Math.round(fr.height)],imgs,bands:grads.length,first:cols[0],last:cols[cols.length-1]}; });
   const whole=cov.imgs.some(i=>i.in&&Math.abs(i.w-i.h)<3&&Math.abs(i.w-cov.face[0])<3);
   ok(whole&&cov.bands>=2&&cov.first&&cov.last&&cov.first[0]>150&&cov.first[2]<90&&cov.last[2]>150&&cov.last[0]<90,'M-14','on the page the square cover shows whole, and the space above and below carries on the colours of its own edge (red at the left, blue at the right): '+JSON.stringify({face:cov.face,whole,bands:cov.bands,left:cov.first,right:cov.last})); noErr(pg,'M-09'); await pg.context().close(); });

 // ---------- 23: Settings shows how much is ready ahead
 await run('M-23',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:12},(_,k)=>para(k,60)).join('\n')]]); await read(pg);
   const r=await pg.evaluate(async()=>{ S.ttsVoice='kokoro:af_heart'; S.boost=false; S.kokAhead=true; S.ttsRate=1; const pl=kokAheadList(); const blob=new Blob([new Uint8Array(4000)],{type:'audio/wav'}); let n=0;
     for(const c of pl.list.slice(0,10)){ await kokBank.put(kokId()+'|1|'+c.text,blob,40); n++; }
     if(document.querySelector('#ttsBar').hidden) document.querySelector('#listenBtn').click(); await new Promise(r=>setTimeout(r,300)); ttsSetOpen(true); ttsUI(); await new Promise(r=>setTimeout(r,300));
     const e=document.querySelector('#kokReadyTxt'), box=e.getBoundingClientRect(); return {n,on:kokOn(),txt:e.textContent,shown:box.width>0&&box.height>0,ready:Math.round(kokReady())}; });
   ok(r.on&&r.n===10&&(r.ready===400||r.ready===360)&&r.txt==='Ready ahead now: 6 min.'&&r.shown,'M-23','with ten sentences of 40 seconds each saved ahead (400 s, or 360 s not counting the one being read), Settings says "Ready ahead now: 6 min.": '+JSON.stringify(r)); noErr(pg,'M-23'); await pg.context().close(); });

 // ---------- 24: Boost: Test key plays a short hello and shows how fast it was; a sentence made online is saved and plays again with no connection
 await run('M-24',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','She reads this line online first. Then the rest of the page follows on.']]); await read(pg);
   const mp3=fs.readFileSync(path.join(REPO,'tests','fixtures','boost-3s.mp3')).toString('base64');
   const r=await pg.evaluate(async b64=>{ const bin=atob(b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
     const keep=window.fetch; let calls=0, online=true; window.fetch=(u,o)=>{ if(!/deepinfra/.test(String(u))) return keep(u,o); calls++; return online?Promise.resolve(new Response(new Blob([u8],{type:'audio/mpeg'}),{status:200,headers:{'content-type':'audio/mpeg'}})):Promise.reject(new TypeError('Failed to fetch')); };
     localStorage.setItem(BOOST_KEY,'test-key-0123456789abcdefghij'); S.ttsVoice='kokoro:af_heart'; S.boost=true; S.kokAhead=false; KOK.boostDown=false; boostUI();
     let played=0; KOK.audio={play(){ played++; return Promise.resolve(); },pause(){},setAttribute(){},src:'',paused:true,ended:false,currentTime:0,duration:3};
     ttsSetOpen(true);
     document.querySelector('#boostTest').click(); await new Promise(r=>setTimeout(r,900)); const status=document.querySelector('#boostStatus').textContent; const testPlayed=played, testCalls=calls;
     const c={start:0,end:6,p:0,text:'She reads this line online first.'}; c.words=c.text.split(' '); const key=kokId()+'|1|'+c.text;
     const first=await kokClip(c); await new Promise(r=>setTimeout(r,400)); const banked=kokBank.has(key); const madeOnline=calls-testCalls;
     KOK.clips.clear(); online=false; const before=calls; const again=await kokClip(c); const offlineCalls=calls-before;
     return {status,testPlayed,testCalls,first:{boost:!!first.boost,secs:+first.secs.toFixed(2)},banked,madeOnline,again:{saved:!!again.saved,secs:+again.secs.toFixed(2)},offlineCalls}; },mp3);
   ok(/^It works: 3\.\d s of speech in \d+\.\d s\./.test(r.status)&&r.testPlayed===1&&r.testCalls===1,'M-24a','Test key plays a short hello and shows how fast it was: "'+r.status.slice(0,70)+'" (played '+r.testPlayed+')');
   ok(r.first.boost&&r.madeOnline===1&&r.banked&&r.again.saved&&r.offlineCalls===0&&Math.abs(r.again.secs-r.first.secs)<0.05,'M-24b','a sentence made online is saved on the device, and plays again from there with no connection and no call to the server: '+JSON.stringify(r)); noErr(pg,'M-24'); await pg.context().close(); });

 // ---------- 8: the four chapter openings are the same in Read, the print PDF and the EPUB
 await run('M-08',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',[1,2,3].map(k=>para(k,90)).join('\n')],['Second Wind',[4,5].map(k=>para(k,90)).join('\n')]]);
   await pg.evaluate(()=>{ BOOK.title='Styles'; BOOK.author='Ada Tester'; touchIndex(); });
   const NM=Object.fromEntries(Object.entries(pdfjs.OPS).map(([k,v])=>[v,k]));
   const pdfPage=async raw=>{ const doc=await pdfjs.getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise;
     for(let n=1;n<=doc.numPages;n++){ const p=await doc.getPage(n), tc=await p.getTextContent(); const it=tc.items.filter(i=>i.str.trim()).map(i=>({s:i.str.trim(),h:i.height,y:i.transform[5]})); const title=it.find(i=>i.s==='Second Wind'&&i.h>=14); if(!title) continue;
       const ops=await p.getOperatorList(); let fill=[0,0,0], stroke=[0,0,0]; const lines=[], fills=[]; ops.fnArray.forEach((f,k)=>{ const nm=NM[f], a=ops.argsArray[k]; if(nm==='setFillRGBColor') fill=[a[0],a[1],a[2]]; if(nm==='setStrokeRGBColor') stroke=[a[0],a[1],a[2]]; if(nm==='constructPath'){ const next=NM[ops.fnArray[k+1]]; const ys=a[1].filter((_,q)=>q%2===1); if(next==='stroke') lines.push({y:ys[0],flat:ys.every(y=>Math.abs(y-ys[0])<0.01),c:stroke.slice()}); if(next==='fill'||next==='eoFill') fills.push({pts:a[1].length/2,c:fill.slice()}); } });
       const body=it.filter(i=>i.h>=10&&i.h<=12).map(i=>i.y).sort((a,b)=>b-a); const lead=body.length>2?body[1]-body[2]:0;
       return {title,it,lines,fills,lead:Math.abs(lead)}; } return null; };
   const gold=c=>c[0]>140&&c[1]>100&&c[1]<c[0]&&c[2]<c[1]-20;
   for(const st of ['classic','ornament','bignum','dropcap']){
     await pg.evaluate(st=>{ FM().chStyle=st; touchIndex(); PCACHE.clear(); },st);
     const rd=await pg.evaluate(async()=>{ setTab('read'); await new Promise(r=>setTimeout(r,300)); goTo({ch:BOOK.order[1],i:0}); drawView(); await new Promise(r=>setTimeout(r,300)); const f=document.querySelector('#spread .face:not(.gone)'), t=f.querySelector('.ptext'), h=t.querySelector('h2.cht'), p=[...t.querySelectorAll('p')].find(x=>x.textContent.length>80), fl=getComputedStyle(p,'::first-letter'), ps=getComputedStyle(p), hb=getComputedStyle(h,'::before'), ha=getComputedStyle(h,'::after');
       return {ck:(t.querySelector('.ck')||{}).textContent||'',bn:(t.querySelector('.bn')||{}).textContent||'',after:ha.content,rules:hb.content!=='none'&&ha.content!=='none'&&(parseFloat(hb.borderTopWidth)>0||parseFloat(hb.height)>0||parseFloat(hb.borderBottomWidth)>0),dcFloat:fl.float,dcLines:parseFloat(fl.fontSize)/parseFloat(ps.lineHeight)}; });
     const z=await JSZip.loadAsync(await dl(pg,'#expEpub')); let x2='', css=''; for(const n of Object.keys(z.files)){ if(/\.xhtml$/.test(n)){ const t=await z.files[n].async('string'); if(/<h1[^>]*>[^<]*Second Wind/.test(t)) x2=t; } if(/\.css$/.test(n)) css+=await z.files[n].async('string'); }
     const ep={cls:(/class="cs-(\w+)"/.exec(x2)||[])[1]||'',ck:(/<p class="ck">([^<]*)/.exec(x2)||[])[1]||'',bn:(/<p class="bn">([^<]*)/.exec(x2)||[])[1]||'',orn:/class="orn"/.test(x2),dcCss:/\.cs-dropcap[^{}]*first-letter[^{}]*\{[^}]*float\s*:\s*left/.test(css)};
     const pd=await pdfPage(await dl(pg,'#expPdf')); if(!pd){ say('FAULT','M-08'+st[0],st+': the chapter title was not found in the print PDF'); continue; }
     const label=pd.it.some(i=>/^C\s?H\s?A\s?P\s?T\s?E\s?R$/i.test(i.s)&&i.y>pd.title.y), bigNum=pd.it.find(i=>i.s==='2'&&i.h>=24&&i.y>pd.title.y), cap=pd.it.find(i=>i.s.length===1&&i.h>=24&&i.y<pd.title.y), diamond=pd.fills.filter(f=>gold(f.c)).length, goldRules=pd.lines.filter(l=>l.flat&&gold(l.c)).length, above=pd.lines.some(l=>l.flat&&l.y>pd.title.y+10&&l.y<pd.title.y+40), below=pd.lines.some(l=>l.flat&&l.y<pd.title.y-4&&l.y>pd.title.y-30);
     const facts={read:rd,epub:ep,pdf:{label,bigNum:bigNum?Math.round(bigNum.h):0,cap:cap?Math.round(cap.h):0,capLines:cap&&pd.lead?+(cap.h/pd.lead).toFixed(1):0,diamond,goldRules,rulesAroundTitle:above&&below}};
     let good=ep.cls===st;
     if(st==='classic') good=good&&rd.ck==='Chapter 2'&&!rd.bn&&rd.after==='none'&&rd.dcFloat==='none'&&ep.ck==='Chapter 2'&&!ep.orn&&label&&!bigNum&&!cap&&!diamond;
     if(st==='ornament') good=good&&rd.ck==='Chapter 2'&&/❦/.test(rd.after)&&ep.ck==='Chapter 2'&&ep.orn&&label&&diamond>=1&&goldRules>=2&&!bigNum&&!cap;
     if(st==='bignum') good=good&&rd.bn==='2'&&!rd.ck&&ep.bn==='2'&&!ep.ck&&!!bigNum&&!label&&!cap&&!diamond;
     if(st==='dropcap') good=good&&rd.ck==='Chapter 2'&&rd.rules&&rd.dcFloat==='left'&&rd.dcLines>1.8&&rd.dcLines<2.6&&ep.ck==='Chapter 2'&&ep.dcCss&&label&&!!cap&&facts.pdf.capLines>1.8&&facts.pdf.capLines<2.6&&above&&below&&!diamond;
     ok(good,'M-08'+st[0],({classic:'Classic: the small chapter label over the title, nothing else',ornament:'Ornament: label, title and a flourish; in the print PDF the flourish is a small gold diamond between two gold rules',bignum:'Big number: a large chapter number over the title, no label',dropcap:'Drop cap: the title between two thin lines and a first letter two lines tall'})[st]+', the same in Read, the EPUB and the print PDF: '+JSON.stringify(facts)); }
   noErr(pg,'M-08'); await pg.context().close(); });

 // ---------- the cover keeps its binding and its own edge colours when Inkhorse is opened on the cover page (rev 262; Steve's iPhone, Nov 17)
 await run('CV-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:6},(_,k)=>para(k,90)).join('\n')]]);
   const f=TMP+'/cov-dark.png'; const d=await pg.evaluate(()=>{ const cv=document.createElement('canvas'); cv.width=800; cv.height=800; const g=cv.getContext('2d'); g.fillStyle='rgb(12,18,40)'; g.fillRect(0,0,800,800); g.fillStyle='rgb(230,190,90)'; g.fillRect(250,250,300,300); return cv.toDataURL('image/png').split(',')[1]; }); fs.writeFileSync(f,Buffer.from(d,'base64'));
   await pg.click('#chBtn'); await pg.waitForTimeout(250); await pg.setInputFiles('#covFrontIn',f); await pg.waitForTimeout(1800);
   await pg.evaluate(()=>{ document.querySelector('#drawer').hidden=true; setTab('read'); jumpTo({ch:'__front',i:0}); }); await pg.waitForTimeout(3000);
   const look=()=>pg.evaluate(()=>{ const fc=document.querySelector('#spread .face:not(.gone)'); if(!fc) return {none:true}; const bg=fc.getAttribute('style')||''; const cols=[...bg.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)].map(m=>(+m[1]+ +m[2]+ +m[3])/3);
     return {onCover:S.rch==='__front',plainPaper:!!fc.querySelector('img.bleed.cvr'),whole:!!fc.querySelector('img.cvimg'),binding:!!fc.querySelector('i.hb'),bands:/linear-gradient/.test(bg),darkEdges:cols.length>4&&cols.every(c=>c<70)}; });
   const before=await look();
   /* a cover added before Inkhorse began keeping its edge colours with the book (Steve's own book is one) has them looked up afresh each visit */
   const hadEdge=await pg.evaluate(()=>{ const m=BOOK.images[BOOK.coverFront]; const h=!!(m&&m.edge); if(m) delete m.edge; touchIndex(); return h; }); await pg.waitForTimeout(2600);
   /* on a phone with a long book, the saved pictures come back a moment after the first page is drawn: here they are held back twelve seconds, the same thing made certain */
   await pg.context().addInitScript(()=>{ let real; Object.defineProperty(window,'__picRestore',{configurable:true,get(){ return real?async function(){ await new Promise(r=>setTimeout(r,12000)); return real.apply(this,arguments); }:undefined; },set(v){ real=v; }}); });
   await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&typeof BOOK!=='undefined'&&BOOK.order.length>0,null,{timeout:30000}); await pg.waitForTimeout(3000);
   const early=await look(); early.pictureHere=await pg.evaluate(()=>!/^\/_blob\//.test(imgSrc(rBook().coverFront))); await pg.waitForTimeout(13000);
   const after=await look(); const good=x=>x.onCover&&!x.plainPaper&&x.whole&&x.binding&&x.bands&&x.darkEdges;
   ok(good(before)&&early.pictureHere===false&&good(after),'CV-01','close Inkhorse on the front cover and open it again, with the saved pictures slow to come back: once the picture has arrived the cover shows whole with its own dark edges carried on around it and the binding on it, not on plain paper: '+JSON.stringify({before,whilePictureIsStillComing:early,after})); noErr(pg,'CV-01'); await pg.context().close(); });

 // ---------- 28: after the first visit Inkhorse opens and works with no signal
 /* The page under test is served from this check's own little server, which is then shut down: a real loss of connection, the same in both browsers
    (the test WebKit's "offline" switch breaks page loads altogether, with or without Inkhorse's helper). */
 await run('M-28',async()=>{ const http=require('http'); const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css'};
   const socks=new Set(); const srv=http.createServer((q,r)=>{ const u=decodeURIComponent(q.url.split('?')[0]); const f=path.join(REPO,u.endsWith('/')?u+'index.html':u); if(!f.startsWith(REPO)){ r.writeHead(403); return r.end(); } fs.readFile(f,(e,d)=>{ if(e){ r.writeHead(404); return r.end(); } r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); r.end(d); }); });
   srv.on('connection',s=>{ socks.add(s); s.on('close',()=>socks.delete(s)); }); await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const here='http://127.0.0.1:'+srv.address().port+new URL(URL_).pathname;
   const ctx=await b.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); pg.errs=[]; let down=false;
   try{
     await pg.goto(here); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.some(x=>x.id==='manual'),null,{timeout:30000});
     let helper=false; for(let k=0;k<40&&!helper;k++){ await pg.waitForTimeout(500); helper=await pg.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)).catch(()=>false); }
     await pg.waitForTimeout(2500); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.some(x=>x.id==='manual'),null,{timeout:30000});
     await pg.evaluate(()=>{ BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; BOOK.sample=false; BOOK.title='No Signal Book'; const id=addChapter('One','Words written before the signal went.'); dirty.add(id); S.cur=id; S.rch=id; touchIndex(); loadEditor(); }); await pg.waitForTimeout(2600);
     await new Promise(r=>{ srv.close(()=>r()); for(const s of socks) s.destroy(); }); down=true;
     let opened=false, why=''; try{ await pg.reload({timeout:30000}); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&LIB.some(x=>x.id==='manual'),null,{timeout:25000}); opened=true; }catch(e){ why=e.message.split('\n')[0].slice(0,100); }
     const st=opened?await pg.evaluate(async()=>{ const t=BOOK.title, text=(CH.get(BOOK.order[0])||{}).text||''; await openLibBook('manual',true); setTab('read'); await new Promise(r=>setTimeout(r,800)); return {t,text,manualChapters:rOrder().length,face:!!document.querySelector('#spread .face:not(.gone)')}; }):{};
     ok(helper&&opened&&st.t==='No Signal Book'&&/before the signal went/.test(st.text)&&st.manualChapters>5&&st.face,'M-28','after a first visit, with the server gone (no connection at all), Inkhorse opens again, your book and its words are there, and the manual opens to read: '+JSON.stringify({helper,opened,why,...st}));
   } finally { if(!down){ try{ srv.close(); for(const s of socks) s.destroy(); }catch(_){ } } await ctx.close(); } });

 // ---------- settings changed just before closing are kept (rev 258; found by M-11 in WebKit)
 await run('RS-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:14},(_,k)=>para(k,90)).join('\n')]]); await read(pg); await pg.waitForTimeout(2600);
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[0],i:3}); }); const at=await pg.evaluate(()=>({i:curIndex(),a:S.anchor}));
   await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&typeof BOOK!=='undefined'&&BOOK.order.length>0,null,{timeout:30000}); await pg.waitForTimeout(1500);
   const back=await pg.evaluate(()=>({a:S.anchor,rch:S.rch===BOOK.order[0]}));
   ok(at.i===3&&back.a===at.a&&back.rch,'RS-01','turn to page 4 and close Inkhorse in the same instant: it reopens on page 4, not where you were before: '+JSON.stringify({turnedTo:at,reopened:back})); noErr(pg,'RS-01'); await pg.context().close(); });

 // ---------- CV-03 (rev 266): in full screen, where the page is much taller than a cover with art to its edges, the space above and below is plain:
//            one colour per side, the cover's typical edge colour (a bright spot at the very edge does not streak into it), and no blurred copy
//            of the cover (Steve, Nov 18: rev 265's blurred fill looked "glazed"); the cover picture itself is whole
 await run('CV-03',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:4},(_,k)=>para(k,60)).join('\n')]]); await pg.evaluate(()=>{ S.tips=false; });
   const f=TMP+'/cv03.png'; const d=await pg.evaluate(()=>{ const cv=document.createElement('canvas'); cv.width=600; cv.height=900; const g=cv.getContext('2d'); g.fillStyle='rgb(10,12,20)'; g.fillRect(0,0,600,900);
     g.fillStyle='rgb(240,230,200)'; g.fillRect(270,0,60,900); for(let x=0;x<600;x+=20){ g.fillStyle=x%40?'rgb(200,80,60)':'rgb(60,120,220)'; g.fillRect(x,300,20,300); } return cv.toDataURL('image/png').split(',')[1]; });
   fs.writeFileSync(f,Buffer.from(d,'base64'));
   await pg.evaluate(()=>{ setImmersive(false); setTab('write'); }); await pg.click('#chBtn'); await pg.waitForTimeout(250); await pg.setInputFiles('#covFrontIn',f); await pg.waitForTimeout(1800);
   await pg.evaluate(()=>{ document.querySelector('#drawer').hidden=true; setTab('read'); jumpTo({ch:'__front',i:0}); }); await pg.waitForTimeout(2500);
   await pg.evaluate(()=>{ setImmersive(true); }); await pg.waitForTimeout(2200); await pg.evaluate(()=>jumpTo({ch:'__front',i:0})); await pg.waitForTimeout(1500);
   const r=await pg.evaluate(()=>{ const fc=document.querySelector('#spread .face:not(.gone)'), im=fc&&fc.querySelector('img.cvimg'); if(!im) return null; const fr=fc.getBoundingClientRect(), ir=im.getBoundingClientRect();
     return {gapTop:ir.top-fr.top,gapBot:fr.bottom-ir.bottom,fh:fr.height,whole:ir.width<=fr.width+1&&ir.height<=fr.height+1,blur:fc.querySelectorAll('.cvglow,.cvglowbox').length,bg:fc.style.background}; });
   const top=r?(r.bg.split(/left top/)[0]||''):'', cols=top.match(/rgb\([^)]*\)/g)||[], wide=r&&r.gapTop>r.fh*0.05;
   const plain=cols.length>0&&new Set(cols).size===1, dark=cols[0]&&/rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(cols[0]).slice(1).every(v=>+v<60);
   ok(r&&wide&&r.whole&&r.blur===0&&plain&&dark,'CV-03','in full screen the wide space above and below a cover is one plain colour from its edge (the bright stripe at the edge does not streak into it), with no blurred copy of the cover, and the cover is whole: '+JSON.stringify({gapTop:r&&Math.round(r.gapTop),blur:r&&r.blur,whole:r&&r.whole,cols}));
   noErr(pg,'CV-03'); await pg.context().close(); });

// ---------- CV-02 (rev 265): in full screen a cover with plain margins at its sides fills the page from top to bottom by trimming only that plain
//            margin, never art; a cover with art to its edges is never trimmed; in the normal view no cover is trimmed (Steve, Nov 18)
await run('CV-02',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:4},(_,k)=>para(k,60)).join('\n')]]); await pg.evaluate(()=>{ S.tips=false; });
  const mkCover=async(name,margin)=>{ const f=TMP+'/'+name+'.png'; const d=await pg.evaluate(m=>{ const cv=document.createElement('canvas'); cv.width=600; cv.height=900; const g=cv.getContext('2d'); g.fillStyle='rgb(6,8,14)'; g.fillRect(0,0,600,900);
      const x0=Math.round(600*m), x1=600-x0; const y0=m?60:0, y1=m?840:900; for(let x=x0;x<x1;x+=12) for(let y=y0;y<y1;y+=12){ g.fillStyle=((x-x0)/12+(y-y0)/12)%2?'rgb(230,60,60)':'rgb(60,90,230)'; g.fillRect(x,y,Math.min(12,x1-x),Math.min(12,y1-y)); } return cv.toDataURL('image/png').split(',')[1]; },margin);
    fs.writeFileSync(f,Buffer.from(d,'base64')); return f; };
  const look=()=>pg.evaluate(()=>{ const f=document.querySelector('#spread .face:not(.gone)'), im=f&&f.querySelector('img.cvimg'); if(!im) return null; const fr=f.getBoundingClientRect(), ir=im.getBoundingClientRect(); return {fw:fr.width,fh:fr.height,fl:fr.left,iw:ir.width,ih:ir.height,il:ir.left}; });
  const out={};
  for(const [name,m] of [['margins',0.15],['bleed',0]]){
    const f=await mkCover(name,m); await pg.evaluate(()=>{ setImmersive(false); setTab('write'); }); await pg.click('#chBtn'); await pg.waitForTimeout(250); await pg.setInputFiles('#covFrontIn',f); await pg.waitForTimeout(1800);
    await pg.evaluate(()=>{ document.querySelector('#drawer').hidden=true; setTab('read'); jumpTo({ch:'__front',i:0}); }); await pg.waitForTimeout(2500); const normal=await look();
    await pg.evaluate(()=>{ setImmersive(true); }); await pg.waitForTimeout(2200); await pg.evaluate(()=>jumpTo({ch:'__front',i:0})); await pg.waitForTimeout(1500); const full=await look();
    out[name]={normal,full}; }
  const M=out.margins, B=out.bleed;
  const notTrimmed=r=>r&&r.iw<=r.fw+1&&r.ih<=r.fh+1;
  const artKept=r=>r&&(r.il+0.15*r.iw)>=r.fl-1&&(r.il+0.85*r.iw)<=r.fl+r.fw+1;
  const fuller=M.full&&B.full&&M.full.ih>B.full.ih+20;
  ok(notTrimmed(M.normal)&&notTrimmed(B.normal)&&notTrimmed(B.full)&&artKept(M.full)&&fuller,'CV-02','in full screen a cover with plain side margins is shown larger, trimming only its plain margin (its art stays inside the page); a cover with art to its edges is not trimmed; in the normal view neither is trimmed: '+JSON.stringify(out));
  noErr(pg,'CV-02'); await pg.context().close(); });

await b.close(); })();
