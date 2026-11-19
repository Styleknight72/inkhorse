/* p13 (rev 269): Meilin starting up on the device (the review's MISSING 22). The manual says:
   after the download Inkhorse remembers her as your voice; when she is your voice it gets her ready quietly as soon as you open it;
   the page may reload itself once to turn on several cores; if the page closes while she is starting twice in a row, Inkhorse notices,
   says so and uses one core from then on (a single time doesn't count); if she needs a moment the player says Getting ready and counts the
   seconds, then she carries on by herself; her notes float just above the player so the page never moves, and a tap closes one.
   (Reload now and one core when several cores fail, and the 30-second box, are RB-58d and RB-58e in p9.)
   The voice itself is a 92 MB download that plays sound; here a stand-in voice helper answers the way hers does, so what is tested is
   Inkhorse's side of the start-up. Her real voice playing is in tests/audit.js. */
const {chromium,mk,book,para,say,URL_,WK}=require('./common.js');
const ok=(c,id,m)=>say(c?'OK':'FAULT',id,m);
const LONG=k=>[1,2,3,4,5,6].map(j=>para(k*10+j,40)).join('\n');
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; try{ await fn(); }catch(e){ say('ERROR',id,String(e&&e.message||e).slice(0,300)); } };
/* the stand-in helper: 'load' is answered "ready" (or never, or with a failure, as the test sets it); 'say' is answered with a clip at once,
   or held until window.__release() when the test wants her to need a moment */
const {FAKEW}=require('./fakevoice.js');
const ready=pg=>pg.waitForFunction(()=>{ try{ return typeof S==='object'&&typeof LIB!=='undefined'&&LIB.some(b=>b.id==='manual')&&CH.size>0; }catch(e){ return false; } },null,{timeout:30000}).catch(()=>{});
const reopen=async(pg)=>{ const p2=await pg.ctx.newPage(); p2.errs=[]; p2.on('pageerror',e=>p2.errs.push(e.message)); p2.ctx=pg.ctx; await p2.goto(URL_); await p2.waitForTimeout(1500); await ready(p2); return p2; };
const loads=pg=>pg.evaluate(()=>window.__wk.reduce((n,x)=>n+x.msgs.filter(m=>m.type==='load').length,0));
(async()=>{ const b=await chromium.launch();

 /* MS-01: download, then remembered as your voice; MS-02: on the next opening she is got ready with no tap */
 await run('MS-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]);
   await pg.evaluate(()=>{ try{ speechSynthesis.speak=()=>{}; }catch(_){ } setTab('read'); }); await pg.waitForTimeout(400); await pg.click('#listenBtn'); await pg.waitForTimeout(400);
   await pg.evaluate(()=>{ document.querySelector('#ttsSetBtn').click(); }); await pg.waitForTimeout(300);
   await pg.selectOption('#ttsVoice','kokoro:af_bella'); await pg.waitForTimeout(400); const asked=await pg.evaluate(()=>!!document.querySelector('#kokGo'));
   await pg.click('#kokGo'); await pg.waitForTimeout(1500);
   const after=await pg.evaluate(()=>({have:!!S.kokHave,voice:S.ttsVoice,state:KOK.state}));
   await pg.close(); const p2=await reopen(pg); await p2.waitForTimeout(2500);
   const back=await p2.evaluate(()=>({have:!!S.kokHave,voice:S.ttsVoice,sel:document.querySelector('#ttsVoice').value,state:KOK.state,tts:!!TTS.on,note:(()=>{ const n=document.querySelector('#kokNote'); return n&&!n.hidden?n.textContent:''; })()}));
   const n2=await loads(p2);
   ok(asked&&after.have&&after.voice==='kokoro:af_bella'&&back.have&&back.voice==='kokoro:af_bella','MS-01','after the download Inkhorse remembers Meilin as your voice (the page closed and opened again): '+JSON.stringify({asked,after,back:{have:back.have,voice:back.voice,sel:back.sel}}));
   ok(n2>=1&&back.state==='ready'&&!back.tts&&!back.note,'MS-02','when Meilin is your voice, Inkhorse gets her ready quietly as soon as you open it (no tap, nothing playing, no note): '+JSON.stringify({loads:n2,state:back.state,playing:back.tts,note:back.note}));
   await pg.ctx.close(); });

 /* MS-03: closed while starting on several cores: once doesn't count, twice in a row and she uses one core, and Inkhorse says so */
 await run('MS-03',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]);
   await pg.evaluate(()=>{ S.kokHave=true; S.ttsVoice='kokoro:af_bella'; S.kokCoresBad=0; S.kokCoresV2=1; kokSave(); localStorage.setItem('inkhorse-test-mode',JSON.stringify({load:'never'})); });
   const startAndClose=async p=>{ await p.evaluate(()=>{ window.__loadMode='never'; KOK.quiet=false; if(KOK.state!=='loading'){ kokRestart(); kokLoad(); } }); await p.waitForTimeout(600);
     const t=await p.evaluate(()=>({trying:localStorage.getItem('inkhorse-kokcores-trying'),threads:(window.__wk.flatMap(x=>x.msgs).filter(m=>m.type==='load').pop()||{}).threads}));
     /* closed the way a crash closes it (the phone runs out of memory): the page gets no chance to say goodbye, so its leaving handlers are stopped.
        A page closed on purpose clears the mark (pagehide) and rightly doesn't count. */
     await p.evaluate(()=>{ const stop=e=>e.stopImmediatePropagation(); for(const t of ['pagehide','beforeunload','unload']) window.addEventListener(t,stop,true); document.addEventListener('visibilitychange',stop,true);
       /* and, since a browser may still run them as the tab closes, nothing the page does from here on can tidy its storage either: a crashed page writes nothing */
       const ri=Storage.prototype.removeItem; Storage.prototype.removeItem=function(k){ if(/kokcores/.test(k)) return; return ri.call(this,k); }; });
     await p.close(); return t; };
   const s1=await startAndClose(pg);
   let p=await reopen(pg); const after1=await p.evaluate(()=>({bad:S.kokCoresBad||0,strikes:localStorage.getItem('inkhorse-kokcores-strikes')}));
   const s2=await startAndClose(p);
   p=await reopen(pg); await p.waitForTimeout(800); const after2=await p.evaluate(()=>({bad:S.kokCoresBad||0}));
   await p.evaluate(()=>localStorage.setItem('inkhorse-test-mode',JSON.stringify({load:'ready'}))); await p.evaluate(()=>{ window.__loadMode='ready'; setTab('read'); }); await p.waitForTimeout(300);
   await p.click('#listenBtn'); await p.waitForTimeout(800);
   const note=await p.evaluate(()=>{ const n=document.querySelector('#kokNote'); return n&&!n.hidden?n.textContent.replace(/\s+/g,' '):''; });
   const thr=await p.evaluate(()=>{ kokRestart(); kokLoad(); return new Promise(r=>setTimeout(()=>r((window.__wk.flatMap(x=>x.msgs).filter(m=>m.type==='load').pop()||{}).threads),200)); });
   ok(s1.trying==='1'&&s1.threads>1&&after1.bad===0&&s2.trying==='1','MS-03a','the page crashing once while she starts on several cores doesn’t count: still several cores after one close '+JSON.stringify({first:s1,after1}));
   ok(after2.bad===1&&/uses one core from now on/.test(note)&&thr===1,'MS-03b','crashed while starting twice in a row: Inkhorse notices, says so, and she uses one core from then on: '+JSON.stringify({after2,note:note.slice(0,120),threads:thr}));
   await pg.ctx.close(); });

 /* MS-04: she needs a moment: Getting ready, counting the seconds, then she carries on by herself */
 await run('MS-04',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]);
   await pg.evaluate(async()=>{ try{ speechSynthesis.speak=()=>{}; }catch(_){ } S.kokHave=true; S.ttsVoice='kokoro:af_bella'; S.kokAhead=false; kokSave(); await kokBank.clear(); window.__wmode='hold'; KOK.quiet=false; kokLoad(); setTab('read'); });
   await pg.waitForTimeout(500); await pg.click('#listenBtn');
   const seen=[]; for(let k=0;k<12;k++){ await pg.waitForTimeout(500); seen.push(await pg.textContent('#ttsWhere')); }
   await pg.evaluate(()=>window.__release()); await pg.waitForTimeout(1500); const after=await pg.evaluate(()=>({where:document.querySelector('#ttsWhere').textContent,playing:!!TTS.playing,alive:TTS.alive||0}));
   const secs=seen.map(t=>+((t.match(/^Getting ready (\d+) s/)||[])[1]||0)).filter(Boolean);
   ok(/^Getting ready/.test(seen[0])&&secs.length>=3&&secs.every((v,k)=>!k||v>=secs[k-1])&&secs[secs.length-1]>secs[0]&&/^Reading/.test(after.where)&&after.playing,'MS-04','if she needs a moment the player says Getting ready and counts the seconds, then she carries on by herself: '+JSON.stringify({first:seen[0],counted:secs,after:after.where}));
   await pg.ctx.close(); });

 /* MS-05: her notes float just above the player, over the bottom of the page; the page never moves; a tap closes the note */
 await run('MS-05',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]);
   /* Meilin is your voice and was got ready on opening, as in real use; last time she had to drop to one core, so tapping Read aloud shows a note */
   await pg.evaluate(()=>{ S.kokHave=true; S.ttsVoice='kokoro:af_bella'; S.kokCoresNote=1; kokSave(); }); await pg.close(); const p=await reopen(pg); await p.waitForTimeout(2500);
   await p.evaluate(()=>{ try{ speechSynthesis.speak=()=>{}; }catch(_){ } setTab('read'); }); await p.waitForTimeout(400);
   const box=()=>p.evaluate(()=>{ const x=document.querySelector('#spread .face:not(.gone)').getBoundingClientRect(); return [x.left,x.top,x.width,x.height].map(Math.round).join(','); });
   await p.click('#listenBtn'); await p.waitForTimeout(600); const during=await box();
   const n=await p.evaluate(()=>{ const n=document.querySelector('#kokNote'), bar=document.querySelector('#ttsBar'), st=document.querySelector('#stage'); if(!n||n.hidden) return null; const a=n.getBoundingClientRect(), b=bar.getBoundingClientRect(), s=st.getBoundingClientRect(); return {top:Math.round(a.top),bottom:Math.round(a.bottom),playerTop:Math.round(b.top),stageTop:Math.round(s.top),stageBottom:Math.round(s.bottom),text:n.textContent.slice(0,60)}; });
   const cx=n?await p.evaluate(()=>{ const r=document.querySelector('#kokNote').getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; }):[0,0];
   if(n){ await p.mouse.click(cx[0],cx[1]); await p.waitForTimeout(400); }
   const closed=await p.evaluate(()=>{ const n=document.querySelector('#kokNote'); return !n||n.hidden; }), after=await box(), still=await p.evaluate(()=>!!TTS.on);
   ok(!!n&&n.bottom<=n.playerTop&&n.playerTop-n.bottom<=12&&n.top>n.stageTop&&n.top<n.stageBottom&&during===after&&closed&&still,'MS-05','her notes float just above the player, over the bottom of the page; the page doesn’t move when the note comes or goes, and a tap closes the note (the player stays): '+JSON.stringify({note:n,page:during,pageAfter:after,closed,playerStays:still}));
   await pg.ctx.close(); });
 /* MS-06: the page reloads itself once to turn on several cores (the helper sw.js adds what the browser needs), and only once */
 /* a brand-new browser profile (no page helper installed yet, nothing saved), as on a first visit; every load of the page is counted */
 await run('MS-06',async()=>{ const {devices}=require('./common.js'); const ctx=await b.newContext({...devices['iPhone 14 Pro Max']}); const pg={ctx};
   const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message)); let navs=0; p.on('framenavigated',f=>{ if(f===p.mainFrame()) navs++; });
   await p.goto(URL_); await p.waitForTimeout(8000); await ready(p); const first={navs,iso:await p.evaluate(()=>self.crossOriginIsolated)};
   navs=0; await p.goto(URL_); await p.waitForTimeout(5000); await ready(p); const second={navs,iso:await p.evaluate(()=>self.crossOriginIsolated)};
   const sw=await p.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller));
   if(p.errs.length) say('FAULT','MS-06x','page error: '+p.errs[0]);
   if(WK&&!sw&&!first.iso){ say('NOTE','MS-06','WebKit here runs no page helper (service worker), so the one reload cannot happen in this browser; checked in Chromium: '+JSON.stringify({first,second})); }
   else ok(first.navs<=2&&first.iso===true&&second.navs===1&&second.iso===true,'MS-06','the page reloads itself at most once, a few seconds after you open it, to turn on several cores, and not again: '+JSON.stringify({first,second,helper:sw}));
   await pg.ctx.close(); });

 await b.close(); })();
