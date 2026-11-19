/* User manual claim checks: "Reading your book", part 3 (Listening to your book, Meilin, Boost, credits). rev 246
   The natural voices themselves (a 92 MB download) are not played here: tests/audit.js has the steps that play them.
   Numbers the manual gives about Meilin (download size, saved-sentence space, cores, waits) are read from the code. */
const {chromium,devices,say,mk,book,para,toastText,vis,fs,REPO}=require('./common.js');
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; /* rev 267: ONLY=<pattern> runs just those blocks (for proving a check fails on a broken copy) */ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
/* the test browser has no sound, so a sentence would "finish" at once and the player would close: keep the voice talking */
const read=async pg=>{ await pg.evaluate(()=>{ try{ speechSynthesis.speak=()=>{}; }catch(_){ } setTab('read'); }); await pg.waitForTimeout(500); };
const LONG=k=>[1,2,3,4,5,6,7,8].map(j=>para(k*10+j,90)).join('\n');
const shown=(pg,sel)=>pg.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return !e.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; },sel);
(async()=>{ const b=await chromium.launch();
 await run('RB-40',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg);
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[1],i:2}); }); await pg.waitForTimeout(400);
   await pg.click('#listenBtn'); await pg.waitForTimeout(800);
   const btn=await pg.evaluate(()=>['#ttsBack','#ttsAgain','#ttsPlay','#ttsFwd','#ttsFix'].map(s=>{ const e=document.querySelector(s); return e&&!e.hidden?s:'-'; }));
   ok(!btn.includes('-'),'RB-40a','the player has Rewind, Again, Pause/Play, Skip ahead and Fix in one row: '+btn.join(' '));
   const row=await pg.evaluate(()=>{ const ys=['#ttsBack','#ttsAgain','#ttsPlay','#ttsFwd','#ttsFix'].map(s=>Math.round(document.querySelector(s).getBoundingClientRect().top)); return ys; });
   ok(Math.max(...row)-Math.min(...row)<=4,'RB-40b','those buttons sit in one row: tops '+row);
   const st=await pg.evaluate(()=>({where:document.querySelector('#ttsWhere').textContent,cur:document.querySelector('#pgCur').textContent}));
   ok(/^(Reading|Paused) · Ch 2 · page /.test(st.where)&&new RegExp('\\b'+st.cur+'\\b').test(st.where),'RB-40c','the status line says Reading or Paused, the chapter, and the same page number as the big number under the book: '+JSON.stringify(st));
   const jm=await pg.evaluate(async()=>{ const n=()=>{ const f=ttsChunks(TTS.ch,0), c=TTS.cur||TTS.q[TTS.k]; return f.findIndex(x=>c.start>=x.start&&c.start<x.end); }; TTS.playing=false; const k0=n(); document.querySelector('#ttsFwd').click(); await new Promise(r=>setTimeout(r,300)); const k1=n(); document.querySelector('#ttsBack').click(); await new Promise(r=>setTimeout(r,300)); const k2=n(); return [k0,k1,k2]; });
   ok(jm[1]===jm[0]+1&&jm[2]===jm[0],'RB-40d','Skip ahead jumps forward one sentence and Rewind backs up one: '+jm.join(' → '));
   const pos=await pg.evaluate(async()=>{ const pr=()=>{ const r=document.querySelector('#spread').getBoundingClientRect(); return [Math.round(r.top),Math.round(r.height)]; }; const a=pr(); document.querySelector('#ttsSetBtn').click(); await new Promise(r=>setTimeout(r,400)); const open=!document.querySelector('#ttsSet').hidden; const b=pr();
     const items=[...document.querySelectorAll('#ttsSet .setrow>span,#ttsSet>button')].filter(e=>e.offsetParent).map(e=>e.textContent.replace(/:.*$/,'').trim()); document.querySelector('#ttsSetDone').click(); await new Promise(r=>setTimeout(r,300)); return {a,b,open,closed:document.querySelector('#ttsSet').hidden,items}; });
   ok(pos.open&&pos.closed&&JSON.stringify(pos.a)===JSON.stringify(pos.b),'RB-41a','⚙ Settings opens over the page without moving it, and Done closes it: '+JSON.stringify(pos));
   ok(['Voice','Speed','Try','Follow words'].every(x=>pos.items.includes(x)),'RB-41b','Settings holds Voice, Speed, Try and Follow words: '+pos.items.join(', '));
   const sp=await pg.evaluate(()=>[...document.querySelectorAll('#ttsRate option')].map(o=>o.textContent));
   ok(sp[0]==='0.8×'&&sp[sp.length-1]==='1.5×'&&sp.includes('1×'),'RB-42','Speed runs from 0.8× up to 1.5×, with 1× normal: '+sp.join(' '));
   /* rev 267: not just the button's words: with it On a word on the page is lit (a visible colour behind it), with it Off nothing is, and On again lights it again */
   const fw=await pg.evaluate(async()=>{ const g=document.querySelector('#ttsGlow'), w=()=>new Promise(r=>setTimeout(r,150));
     const lit=()=>[...document.querySelectorAll('#spread .face:not(.gone) .ptext .say')].filter(e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); const bg=cs.backgroundColor; return r.width>0&&bg&&!/rgba\(0, 0, 0, 0\)|transparent/.test(bg); }).length;
     try{ ttsMark(); }catch(_){ } await w(); const a=[g.textContent,lit()]; g.click(); await w(); const b=[g.textContent,lit()]; g.click(); await w(); const c=[g.textContent,lit()]; return [a,b,c]; });
   ok(fw[0][0]==='Follow words: On'&&fw[0][1]>0&&fw[1][0]==='Follow words: Off'&&fw[1][1]===0&&fw[2][0]==='Follow words: On'&&fw[2][1]>0,'RB-43','Follow words turns the highlight on and off (button, and words lit on the page): '+JSON.stringify(fw));
   await pg.ctx.close(); });
 /* rev 267: RB-44 drives the very handlers Inkhorse gives the phone for earbuds and the lock screen (caught as Inkhorse hands them over),
    instead of searching the source for their names. The phone turns one, two or three presses into play/pause, next and previous; that part is the phone's own. */
 await run('RB-44',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:()=>{ window.__ms={}; const ms=navigator.mediaSession;
       if(ms){ const o=ms.setActionHandler.bind(ms); ms.setActionHandler=(a,f)=>{ window.__ms[a]=f; try{ o(a,f); }catch(_){ } }; } } });
   await book(pg,[['First Light',LONG(1)],['Second Wind',LONG(2)]]); await read(pg);
   await pg.evaluate(()=>{ jumpTo({ch:BOOK.order[1],i:2}); }); await pg.waitForTimeout(400); await pg.click('#listenBtn'); await pg.waitForTimeout(800);
   const r=await pg.evaluate(async()=>{ const w=()=>new Promise(r=>setTimeout(r,300)), H=window.__ms, n=()=>{ const f=ttsChunks(TTS.ch,0), c=TTS.cur||TTS.q[TTS.k]; return f.findIndex(x=>c.start>=x.start&&c.start<x.end); };
     const o={acts:Object.keys(H).sort().join(','),title:navigator.mediaSession&&navigator.mediaSession.metadata&&navigator.mediaSession.metadata.title,p0:TTS.playing};
     if(!H.pause||!H.play||!H.nexttrack||!H.previoustrack) return o;
     H.pause(); await w(); o.p1=TTS.playing; o.where1=document.querySelector('#ttsWhere').textContent.slice(0,7);
     H.play(); await w(); o.p2=TTS.playing; const k0=n(); H.nexttrack(); await w(); const k1=n(); H.previoustrack(); await w(); const k2=n(); o.k=[k0,k1,k2]; return o; });
   ok(r.p0===true&&r.p1===false&&/^Paused/.test(r.where1||'')&&r.p2===true&&r.k&&r.k[1]===r.k[0]+1&&r.k[2]===r.k[0]&&r.title==='Second Wind','RB-44','earbuds and the lock screen: pause and play stop and start the voice, skip ahead and back move one sentence, and the lock screen names the chapter: '+JSON.stringify(r));
   if(pg.errs.length) say('FAULT','RB-44x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 await run('RB-45',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.evaluate(async()=>{ await openLibBook('manual'); jumpTo({ch:rOrder()[4],i:0}); }); await pg.waitForTimeout(800);
   await pg.click('#listenBtn'); await pg.waitForTimeout(700);
   const fx=await pg.evaluate(()=>({rb:!!RB,fix:(()=>{ const e=document.querySelector('#ttsFix'); return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'; })()}));
   ok(fx.rb&&!fx.fix,'RB-45','in books you added to read there is no Fix button: '+JSON.stringify(fx));
   const was=await shown(pg,'#ttsBar');
   await pg.click('#listenBtn'); await pg.waitForTimeout(300); const off=await pg.evaluate(()=>({on:TTS.on,bar:document.querySelector('#ttsBar').hidden})); off.was=was; off.shown=await shown(pg,'#ttsBar');
   /* rev 267: the player must actually be gone from the screen (it was on screen before the tap), not only the voice stopped */
   ok(!off.on&&off.was&&off.bar&&!off.shown,'RB-46','the headphones button stops reading and closes the player: '+JSON.stringify(off));
   await pg.ctx.close(); });
 await run('RB-50',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.click('#listenBtn'); await pg.waitForTimeout(500); await pg.click('#ttsSetBtn'); await pg.waitForTimeout(300);
   const v=await pg.evaluate(()=>{ const s=document.querySelector('#ttsVoice'); const g=[...s.querySelectorAll('optgroup')].map(g=>g.label); const o=[...s.options].map(o=>o.textContent); return {g,o}; });
   ok(v.g[0]==='Natural voices'&&/^Meilin/.test(v.o[0])&&/^Calvin/.test(v.o[1])&&/^Soren/.test(v.o[2])&&/American/.test(v.o[1]+v.o[2]),'RB-50a','natural voices are at the top of the list, starting with Meilin, then Calvin and Soren, American; your device’s voices below: '+v.o.slice(0,4).join(' | '));
   const ask=await pg.evaluate(async()=>{ const prev=S.ttsVoice||''; const s=document.querySelector('#ttsVoice'); s.value=KOK_PREFIX+'af_bella'; s.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,300));
     const note=document.querySelector('#kokNote'); const t=note.innerText; const btns=[...note.querySelectorAll('button')].map(b=>b.textContent); document.querySelector('#kokNo').click(); await new Promise(r=>setTimeout(r,200));
     return {t,btns,after:S.ttsVoice||'',prev,downloading:KOK.state}; });
   ok(/about 92 MB, just once/.test(ask.t)&&/Wi-Fi is best/.test(ask.t)&&ask.btns.join()==='Download Meilin,Not now','RB-50b','picking Meilin asks before downloading her voice, about 92 MB, just once, with Download Meilin and Not now: '+JSON.stringify(ask.t.slice(0,140)));
   ok(ask.after===ask.prev&&ask.downloading!=='loading','RB-50c','Not now keeps your current voice and downloads nothing: '+JSON.stringify(ask));
   const cards=await pg.evaluate(async()=>{ if(document.querySelector('#ttsSet').hidden) ttsSetOpen(true); const out={}; for(const [id,card] of [['af_bella','#kokAbout'],['am_michael','#kokAboutCalvin'],['am_fenrir','#kokAboutSoren']]){ S.ttsVoice=KOK_PREFIX+id; ttsUI(); try{ boostUI(); }catch(_){ } await new Promise(r=>setTimeout(r,100));
       const vis=s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return !e.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; }; out[id]={card:vis(card),others:['#kokAbout','#kokAboutCalvin','#kokAboutSoren'].filter(c=>c!==card&&vis(c)).length,expect:vis('#kokExpect'),smooth:vis('#kokAheadBtn')&&document.querySelector('#kokAheadBtn').textContent,pause:vis('#kokParaBtn')&&document.querySelector('#kokParaBtn').textContent}; }
     S.ttsVoice=''; ttsUI(); try{ boostUI(); }catch(_){ } await new Promise(r=>setTimeout(r,100)); const vis=s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return !e.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
     out.device={expect:vis('#kokExpect'),smooth:vis('#kokAheadBtn'),pause:vis('#kokParaBtn'),cards:['#kokAbout','#kokAboutCalvin','#kokAboutSoren'].filter(vis).length}; out.meilin=document.querySelector('#kokAbout').innerText; return out; });
   const nat=['af_bella','am_michael','am_fenrir'].map(k=>cards[k]);
   ok(nat.every(c=>c.card&&!c.others),'RB-51a','with each natural voice chosen, its own card shows under Voice: '+JSON.stringify(nat.map(c=>c.card)));
   ok(/美琳/.test(cards.meilin)&&/Měilín/.test(cards.meilin)&&/beautiful/.test(cards.meilin)&&/jade/.test(cards.meilin),'RB-51b','Meilin’s card: 美琳 (Měilín) means beautiful jade');
   ok(nat.every(c=>c.expect&&c.smooth==='Smooth listening: On'&&/^If a pause is needed: between sentences$/.test(c.pause)),'RB-52a','for every natural voice: the What to expect note, Smooth listening (On to start) and If a pause is needed (between sentences) show: '+JSON.stringify(nat.map(c=>[c.expect,c.smooth,c.pause])));
   ok(!cards.device.expect&&!cards.device.smooth&&!cards.device.pause&&!cards.device.cards,'RB-52b','with your device’s own voice, those natural-voice settings are not shown: '+JSON.stringify(cards.device));
   const para=await pg.evaluate(async()=>{ S.ttsVoice=KOK_PREFIX+'af_bella'; ttsUI(); const b=document.querySelector('#kokParaBtn'); b.click(); await new Promise(r=>setTimeout(r,100)); const t=b.textContent; b.click(); const sm=document.querySelector('#kokAheadBtn'); sm.click(); await new Promise(r=>setTimeout(r,100)); const s2=sm.textContent; sm.click(); return {t,s2}; });
   ok(/between paragraphs/.test(para.t)&&/Smooth listening: Off/.test(para.s2),'RB-52c','tap If a pause is needed for between paragraphs; tap Smooth listening to turn it off: '+JSON.stringify(para));
   await pg.ctx.close(); });
 await run('RB-55',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.click('#listenBtn'); await pg.waitForTimeout(500); await pg.click('#ttsSetBtn'); await pg.waitForTimeout(300);
   const r=await pg.evaluate(async()=>{ S.ttsVoice=KOK_PREFIX+'af_bella'; ttsUI(); boostUI(); const vis=s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return !e.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0; };
     const box=vis('#boostBox'), btn=document.querySelector('#boostBtn').textContent;
     document.querySelector('#boostKeyIn').value='abcdefghijklmnopqrstuvwxyz0123WXYZ'; document.querySelector('#boostSave').click(); await new Promise(r=>setTimeout(r,200));
     const saved=document.querySelector('#boostKeyBtn').textContent, keyArea=vis('#boostKeyArea');
     document.querySelector('#boostBtn').click(); await new Promise(r=>setTimeout(r,200)); boostUI();
     const on={btn:document.querySelector('#boostBtn').textContent,smooth:vis('#kokAheadBtn'),pause:vis('#kokParaBtn')};
     document.querySelector('#boostBtn').click(); await new Promise(r=>setTimeout(r,200)); boostUI(); const off={smooth:vis('#kokAheadBtn'),pause:vis('#kokParaBtn')};
     return {box,btn,saved,keyArea,on,off}; });
   ok(r.box&&/^Boost \(online\): Off$/.test(r.btn),'RB-55a','Settings shows a Boost (online) switch: '+r.btn);
   ok(/Key saved \(…WXYZ\)/.test(r.saved)&&!r.keyArea,'RB-55b','once a key is saved it shows as Key saved with its last four characters: '+r.saved);
   ok(!r.on.smooth&&!r.on.pause&&r.off.smooth&&r.off.pause,'RB-55c','while Boost is on, Smooth listening and If a pause is needed are hidden; they come back when it is off: '+JSON.stringify(r));
   await pg.reload(); await pg.waitForTimeout(2200);
   const kept=await pg.evaluate(()=>boostKey()); ok(kept==='abcdefghijklmnopqrstuvwxyz0123WXYZ','RB-55d','the key stays on this device after closing Inkhorse: '+(kept?'kept':'gone'));
   const fg=await pg.evaluate(async()=>{ BOOST.keyOpen=true; boostUI(); document.querySelector('#boostForget').click(); await new Promise(r=>setTimeout(r,200)); return boostKey(); });
   ok(!fg,'RB-55e','Forget key removes the key from the device: '+fg);
   const bad=await pg.evaluate(async()=>{ document.querySelector('#boostKeyIn').value='https://getinkhorse.com/preview/next.html'; document.querySelector('#boostSave').click(); await new Promise(r=>setTimeout(r,200)); return boostKey(); });
   ok(!bad,'RB-55f','a web link pasted as the key is refused: '+bad);
   await pg.ctx.close(); });
 // ---------- Numbers the manual gives, read from the code
 /* rev 267: RB-58a–f were the code's own numbers found by searching the file. Now each number the manual gives about Meilin is measured:
    the real download (the voice file's size on Hugging Face), the real recording format (kokoro-js's own rate, and Inkhorse's own WAV maker run for a minute),
    the saved-sentence store filled past 300 MB, and the cores, the 30-second box and the 30 minutes of working ahead with a stand-in voice helper.
    The stand-in answers like her helper does, so what is tested is Inkhorse's side; the voice itself playing is in tests/audit.js. Needs the internet (Hugging Face, jsDelivr). */
 const curl=(args)=>require('child_process').execFileSync('curl',['-sSL','--max-time','60',...args],{maxBuffer:64e6});
 await run('RB-58a',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg);
   const hdr=curl(['-I','https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_quantized.onnx']).toString();
   const lens=[...hdr.matchAll(/^content-length:\s*(\d+)/gim)].map(m=>+m[1]), bytes=Math.max(0,...lens), real=bytes/1e6;
   const q8=await pg.evaluate(()=>/dtype:m\.fast\?\(m\.dtype\|\|'fp16'\):'q8'/.test(KOK_WORKER)&&/Kokoro-82M-v1\.0-ONNX/.test(KOK_WORKER));
   await pg.click('#listenBtn'); await pg.waitForTimeout(500); await pg.evaluate(()=>{ S.kokHave=false; document.querySelector('#ttsSetBtn').click(); }); await pg.waitForTimeout(300);
   await pg.selectOption('#ttsVoice','kokoro:af_bella'); await pg.waitForTimeout(400);
   const note=await pg.evaluate(()=>{ const n=document.querySelector('#kokNote'); return n&&!n.hidden?n.innerText.replace(/\s+/g,' '):''; }), said=(note.match(/about (\d+) MB/)||[])[1];
   ok(q8&&bytes>0&&+said===92&&Math.abs(real-92)<=3,'RB-58a','Meilin’s download is about 92 MB: Inkhorse says “about '+said+' MB” before downloading, and the voice file it fetches (Kokoro-82M, q8) is '+real.toFixed(1)+' MB on Hugging Face');
   await pg.ctx.close(); });
 await run('RB-58c',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]);
   const kjs=await pg.evaluate(()=>(KOK_WORKER.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/kokoro-js@[\d.]+\/dist\/kokoro\.web\.js/)||[])[0]);
   const lib=kjs?curl([kjs]).toString():'', rate=+((lib.match(/return new \w+\(\w+\.data,(\d+e\d|\d+)\)\}async\*stream/)||[])[1]||0);
   const w=await pg.evaluate(rate=>{ const src=KOK_WORKER.slice(KOK_WORKER.indexOf('function wav16('), KOK_WORKER.indexOf('\n',KOK_WORKER.indexOf('return b; }',KOK_WORKER.indexOf('function wav16('))));
     const wav16=new Function(src+'; return wav16;')(); const b=wav16(new Float32Array(rate*60),rate), d=new DataView(b); return {bytes:b.byteLength,rate:d.getUint32(24,true),bits:d.getUint16(34,true),ch:d.getUint16(22,true)}; },rate||24000);
   const mb=w.bytes/1e6;
   ok(rate===24000&&w.rate===rate&&w.bits===16&&w.ch===1&&mb>=2.5&&mb<=3.5,'RB-58c','saved sentences take about 3 MB a minute: kokoro-js ('+(kjs||'').replace(/^.*npm\//,'').replace(/\/dist.*$/,'')+') gives '+rate+' sounds a second, and Inkhorse’s own WAV maker turns one minute into '+mb.toFixed(2)+' MB ('+w.bits+'-bit, '+w.ch+' channel)');
   await pg.ctx.close(); });
 await run('RB-58b',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]);
   const r=await pg.evaluate(async()=>{ await kokBank.clear(); const blob=()=>new Blob([new Uint8Array(20e6)],{type:'audio/wav'}), keys=[]; const out={};
     for(let k=0;k<17;k++){ const key='test|1|sentence '+k; keys.push(key); await kokBank.put(key,blob(),400); await new Promise(r=>setTimeout(r,5)); if(k===13) out.at280={size:kokBank.size(),all:keys.every(x=>kokBank.has(x))}; }
     out.size=kokBank.size(); out.kept=keys.map(x=>kokBank.has(x)?1:0).join(''); const c=await caches.open('inkhorse-meilin-v1'); out.files=(await c.keys()).length;
     out.oldestGone=!(await kokBank.get(keys[0])); out.newestThere=!!(await kokBank.get(keys[16])); await kokBank.clear(); return out; });
   ok(r.at280.all&&r.size<=300e6&&r.size>=200e6&&/^0+1+$/.test(r.kept)&&r.files===r.kept.replace(/0/g,'').length&&r.oldestGone&&r.newestThere,'RB-58b','saved sentences: past about 300 MB the oldest are removed (nothing before): 17 × 20 MB put in, '+JSON.stringify(r));
   await pg.ctx.close(); });
 const FAKEW=()=>{ window.__wk=[]; window.__hw=8; window.__coi=true; window.__wmode='stall';
   try{ Object.defineProperty(Navigator.prototype,'hardwareConcurrency',{get(){ return window.__hw; },configurable:true}); }catch(_){ }
   try{ Object.defineProperty(window,'crossOriginIsolated',{get(){ return window.__coi; },configurable:true}); }catch(_){ }
   class FW{ constructor(){ this.msgs=[]; window.__wk.push(this); }
     postMessage(m){ this.msgs.push(m); const me=this, send=d=>setTimeout(()=>{ me.onmessage&&me.onmessage({data:d}); },15);
       if(m.type==='load'){ if(window.__failMulti&&m.threads>1) setTimeout(()=>{ me.onerror&&me.onerror({message:'several cores did not start'}); },15); else send({type:'ready'}); }
       else if(m.type==='ping') send({type:'pong'});
       else if(m.type==='say'&&window.__wmode==='answer'){ const b=new ArrayBuffer(48); send({type:'clip',id:m.id,wav:b,secs:180,ms:20}); } }
     terminate(){} addEventListener(){} removeEventListener(){} }
   window.Worker=FW; };
 await run('RB-58d',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]);
   const r=await pg.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), out={}; KOK.quiet=false; S.ttsVoice='kokoro:af_bella'; S.kokFast=false;
     const thr=async(coi,hw)=>{ window.__coi=coi; window.__hw=hw; kokRestart(); const n0=window.__wk.length; kokLoad(); await w(80); const wk=window.__wk.slice(n0).find(x=>x.msgs.some(m=>m.type==='load')); const m=wk&&wk.msgs.find(m=>m.type==='load'); return m?m.threads:null; };
     S.kokCoresBad=0; out.eight=await thr(true,8); out.four=await thr(true,4); out.notIsolated=await thr(false,8);
     window.__failMulti=true; S.kokCoresBad=0; window.__coi=true; window.__hw=8; kokRestart(); kokLoad(); await w(200);
     out.note=(document.querySelector('#kokNote')||{}).innerText||''; out.bad=S.kokCoresBad; out.reload=!!document.querySelector('#kokReload'); window.__failMulti=false;
     out.after=await thr(true,8); return out; });
   ok(r.eight===4&&r.four===2&&r.notIsolated===1&&r.bad===1&&/use one/.test(r.note)&&r.reload&&r.after===1,'RB-58d','she uses up to four processor cores (4 on an 8-core device, 2 on a 4-core one), and one if several cores don’t work: '+JSON.stringify({...r,note:r.note.slice(0,90)}));
   await pg.ctx.close(); });
 await run('RB-58e',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',LONG(1)]]); await read(pg);
   await pg.evaluate(async()=>{ S.kokHave=true; S.ttsVoice='kokoro:af_bella'; S.kokFast=false; S.kokAhead=false; KOK.quiet=false; kokLoad(); await new Promise(r=>setTimeout(r,200)); });
   await pg.click('#listenBtn'); const box=()=>pg.evaluate(()=>{ const n=document.querySelector('#kokNote'); return !!n&&!n.hidden&&!!document.querySelector('#kokWait')&&!!document.querySelector('#kokPhone'); });
   await pg.waitForTimeout(27000); const at27=await box(); await pg.waitForTimeout(5000); const at32=await box();
   const btn=await pg.evaluate(()=>[(document.querySelector('#kokWait')||{}).textContent,(document.querySelector('#kokPhone')||{}).textContent]);
   await pg.click('#kokWait'); await pg.waitForTimeout(300); const wait=await pg.evaluate(()=>({note:!document.querySelector('#kokNote')||document.querySelector('#kokNote').hidden||!document.querySelector('#kokWait'),waiting:KOK.waiting,voice:S.ttsVoice}));
   ok(!at27&&at32&&btn[0]==='Keep waiting'&&/Use my device[’']s voice/.test(btn[1]||'')&&wait.note&&wait.voice==='kokoro:af_bella','RB-58e','a sentence that takes more than 30 seconds shows a box with Keep waiting and Use my device’s voice (none at 27 s, there at 32 s); Keep waiting closes it and stays with Meilin: '+JSON.stringify({at27,at32,btn,wait}));
   await pg.ctx.close(); });
 await run('RB-58f',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max',{init:FAKEW}); await book(pg,[['One',Array.from({length:24},(_,k)=>para(k+3,40)).join('\n')]]); await read(pg);
   const r=await pg.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); await kokBank.clear(); window.__wmode='answer'; S.kokHave=true; S.ttsVoice='kokoro:af_bella'; S.kokFast=false; S.kokAhead=true; KOK.quiet=false; jumpTo({ch:BOOK.order[0],i:0}); kokLoad(); await w(300);
     let last=-1; for(let k=0;k<40;k++){ await w(1500); const t=kokReady(); if(t===last&&t>0&&k>12) break; last=t; }
     const says=window.__wk.reduce((n,x)=>n+x.msgs.filter(m=>m.type==='say').length,0); await w(4000); const says2=window.__wk.reduce((n,x)=>n+x.msgs.filter(m=>m.type==='say').length,0);
     const sent=ttsChunks(BOOK.order[0],0).length; await kokBank.clear(); return {ready:last,says,says2,sentences:sent}; });
   ok(r.sentences>13&&r.ready>=30*60&&r.ready<=30*60+180&&r.says2===r.says,'RB-58f','Smooth listening prepares up to about 30 minutes ahead and then stops (3-minute stand-in sentences): '+JSON.stringify(r)+' ('+(r.ready/60).toFixed(0)+' min made)');
   await pg.ctx.close(); });
 await run('RB-57',async()=>{
   const cp=fs.readFileSync(REPO+'/COPYRIGHT.html','utf8'); ok(/Kokoro/.test(cp)&&/hexgrad/.test(cp)&&/kokoro-js/.test(cp)&&/Apache 2\.0/.test(cp),'RB-57','the full credits for Kokoro (hexgrad, Apache 2.0) and kokoro-js are on COPYRIGHT.html');
   const snd=fs.readFileSync(REPO+'/COPYRIGHT.html','utf8'); ok(/Turned Page/.test(snd)&&/DavidGreck/.test(snd)&&/BigSoundBank/.test(snd),'RB-25','the page sound’s recording is credited: "Turned Page" by DavidGreck, BigSoundBank'); });
 // ---------- Contents pages: what a tap opens
 /* rev 267: RB-60 used to read the manual's own sentences. Now a real finger on the manual's Contents page: the words of an entry open it
    (as a page and in full screen), and the page number at the end of the line is not a link: a tap there turns the page as usual. */
 await run('RB-60',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',LONG(1)]]); await read(pg); const cdp=await require('./common.js').finger(pg);
   await pg.evaluate(async()=>{ S.turn='instant'; await openLibBook('manual'); }); await pg.waitForTimeout(800);
   const toc=await pg.evaluate(async()=>{ for(const ch of rOrder()){ if(isCover(ch)) continue; const n=pag(ch).pages.length; for(let i=0;i<n;i++){ jumpTo({ch,i}); await new Promise(r=>setTimeout(r,40));
       const e=document.querySelector('#spread .face:not(.gone) p.toc[data-goto] .tt'); if(e) return {ch,i}; } } return null; });
   const entry=async()=>pg.evaluate(()=>{ const e=[...document.querySelectorAll('#spread .face:not(.gone) p.toc[data-goto]')].filter(x=>x.querySelector('.tt')&&+x.dataset.goto>5)[2]; const st=document.querySelector('#stage').getBoundingClientRect();
     const t=e.querySelector('.tt').getBoundingClientRect(), n=(e.querySelector('.tn')||e.lastElementChild).getBoundingClientRect();
     return {goto:e.dataset.goto,title:e.querySelector('.tt').textContent,words:[Math.max(t.left+8,st.left+st.width*0.3),t.top+t.height/2],num:[n.left+n.width/2,n.top+n.height/2],numX:(n.left+n.width/2-st.left)/st.width}; });
   const at=()=>pg.evaluate(()=>({ch:S.rch,i:curIndex(),page:document.querySelector('#pgCur').textContent})), tap=async(x,y)=>{ await cdp.start(x,y); await pg.waitForTimeout(40); await cdp.end(); await pg.waitForTimeout(700); };
   const back=()=>pg.evaluate(t=>{ jumpTo(t); },toc); const out={toc:!!toc};
   if(toc){ await back(); await pg.waitForTimeout(300); const e=await entry(); out.entry=e.title; out.numX=+e.numX.toFixed(2);
     await tap(...e.words); out.words=await at(); out.wordsOk=out.words.page===e.goto;
     await back(); await pg.waitForTimeout(300); await tap(...e.num); out.num=await at(); out.numOk=(out.num.ch===toc.ch&&out.num.i===toc.i+1)||(out.num.ch!==toc.ch&&out.num.page!==e.goto&&+out.num.page<=6);
     await back(); await pg.evaluate(()=>setImmersive(true)); await pg.waitForTimeout(500); const e2=await entry(); await tap(...e2.words); out.fs=await at(); out.fsOk=out.fs.page===e2.goto; await pg.evaluate(()=>setImmersive(false)); }
   ok(out.toc&&out.wordsOk&&out.numOk&&out.fsOk&&out.numX>0.82,'RB-60','on a contents page the words of an entry open it (also in full screen), and the page number at the end of the line is not a link (a tap there turns the page): '+JSON.stringify(out));
   if(pg.errs.length) say('FAULT','RB-60x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 await b.close(); })();
