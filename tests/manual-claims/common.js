const PW = require('playwright'); const { devices } = PW; const chromium = PW[process.env.AUDIT_ENGINE || 'chromium']; const WK=(process.env.AUDIT_ENGINE||'chromium')!=='chromium';   /* rev 250: AUDIT_ENGINE=webkit runs the claim checks in Safari's engine */ const path=require('path'), fs=require('fs');
/* paths: REPO is this repository, TMP holds the test's own files, PDFJS_DIR is pdfjs-dist's build folder (as for tests/audit.js) */
const REPO=path.resolve(__dirname,'..','..'), TMP=require('os').tmpdir(), S=TMP;
const URL_=process.env.MURL||'http://127.0.0.1:8765/preview/next.html';
const out=[]; let cur='';
const say=(st,id,msg)=>{ out.push({st,id,msg}); console.log(st.padEnd(6)+id.padEnd(8)+(msg||'')); };
const FAKE=()=>{ window.__sr={said:[],mode:'ok',starts:0};
  function FakeSR(){ } FakeSR.prototype.start=function(){ const me=this; window.__sr.starts++; setTimeout(()=>{
      if(window.__sr.mode==='blocked'){ me.onerror&&me.onerror({error:'not-allowed'}); me.onend&&me.onend(); return; }
      me.onstart&&me.onstart({}); const t=window.__sr.said.shift();
      if(t){ const r=[{transcript:t}]; r.isFinal=true; me.onresult&&me.onresult({resultIndex:0,results:[r]}); } else { me.onerror&&me.onerror({error:'no-speech'}); }
      setTimeout(()=>{ me.onend&&me.onend({}); },20); },20); };
  FakeSR.prototype.stop=function(){ const me=this; setTimeout(()=>{ me.onend&&me.onend({}); },10); }; FakeSR.prototype.abort=FakeSR.prototype.stop;
  window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR; };
async function mk(b,dev,opt={}){ const ctx=await b.newContext({...(typeof dev==='string'?devices[dev]:dev),...((process.env.AUDIT_ENGINE||'chromium')==='chromium'?{permissions:['clipboard-read','clipboard-write']}:{}),acceptDownloads:true,...opt});
  await ctx.addInitScript(FAKE);
  /* rev 250: the WebKit run tells each phone the two things the test WebKit gets wrong or cannot do (see tests/audit.js) */
  if(WK) await ctx.addInitScript(() => { /* a real iPhone says it has five touch points; the test WebKit says none, which made Inkhorse treat the phone as a computer (and go full screen when the window matched the screen) */
      try{ Object.defineProperty(Navigator.prototype,'maxTouchPoints',{get(){ return 5; },configurable:true}); }catch(e){}
      /* the test tool cannot grant WebKit the clipboard: Copy and Paste talk to a stand-in. This checks Inkhorse's side; Safari's own permission prompt can only be seen on a real phone. */
      let clip=''; const fake={ writeText:async t=>{ clip=String(t); }, readText:async()=>clip, write:async items=>{ try{ const b=await items[0].getType('text/plain'); clip=await b.text(); }catch(e){} }, read:async()=>[] };
      try{ Object.defineProperty(navigator,'clipboard',{value:fake,configurable:true}); }catch(e){}
      try{ const ex=document.execCommand.bind(document); document.execCommand=function(c){ if(String(c).toLowerCase()==='copy'){ try{ let t=''; for(const a of [document.activeElement,...[...document.querySelectorAll('textarea,input')].reverse()]){ try{ if(a&&a.value!=null&&a.selectionEnd>a.selectionStart){ t=a.value.slice(a.selectionStart,a.selectionEnd); break; } }catch(e){} } if(!t) t=String(getSelection()); if(t) clip=t; }catch(e){} } return ex.apply(document,arguments); }; }catch(e){} });
  await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:fs.readFileSync(require.resolve('jszip/dist/jszip.min.js')),contentType:'application/javascript'}));
  await ctx.route(/jspdf[^/]*\.js$/, r=>r.fulfill({body:fs.readFileSync(require.resolve('jspdf/dist/jspdf.umd.min.js')),contentType:'application/javascript'}));
  const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); await pg.goto(URL_); await pg.waitForTimeout(2200); await pg.evaluate(()=>{ S.tips=true; }); pg.ctx=ctx; return pg; }
const book=async(pg,chs)=>pg.evaluate(chs=>{ BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; BOOK.sample=false; BOOK.title='Test Book';
  for(const [t,x] of chs){ const id=addChapter(t,x); dirty.add(id); } S.cur=BOOK.order[0]; S.rch=S.cur; S.anchor=0; touchIndex(); PCACHE.clear(); loadEditor(); renderChapterUI(); renderDrawer(); refreshReader(); return BOOK.order; },chs);
const W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats'.split(' ');
const para=(k,n)=>{ const s=Array.from({length:n||60},(_,i)=>W[(i*5+k)%W.length]).join(' '); return s[0].toUpperCase()+s.slice(1)+'.'; };
const toastText=pg=>pg.evaluate(()=>{ const t=document.querySelector('#toast'); return t.hidden?'':t.textContent; });
const vis=(pg,sel)=>pg.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return !e.hidden && cs.display!=='none' && cs.visibility!=='hidden' && r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight; },sel);
const toolsOpen=pg=>pg.evaluate(()=>!document.querySelector('#write').classList.contains('tools-closed'));

/* rev 250: a finger for the tests. In Chromium the test tool presses the screen itself. The WebKit test tool has no finger, so there the touch is
   made up inside the page (pointer and touch events sent to whatever is under the point). That checks what Inkhorse does with a touch in WebKit;
   how Safari itself hands a real finger to the page can only be seen on a phone. */
async function finger(pg){
  if(!WK){ const cdp=await pg.ctx.newCDPSession(pg); return { start:(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]}), move:(x,y)=>cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]}), end:()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}) }; }
  const ev=(type,x,y)=>pg.evaluate(([type,x,y])=>{ if(type==='start') window.__fel=document.elementFromPoint(x,y)||document.body; const tgt=window.__fel||document.body;
    const pt={pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true,composed:true,buttons:type==='end'?0:1};
    const te=(n,on)=>{ try{ const t=new Touch({identifier:7,target:tgt,clientX:x,clientY:y}); tgt.dispatchEvent(new TouchEvent(n,{touches:on?[t]:[],targetTouches:on?[t]:[],changedTouches:[t],bubbles:true,cancelable:true})); }catch(e){} };
    if(type==='start'){ tgt.dispatchEvent(new PointerEvent('pointerdown',pt)); te('touchstart',true); }
    else if(type==='move'){ tgt.dispatchEvent(new PointerEvent('pointermove',pt)); te('touchmove',true); }
    else { tgt.dispatchEvent(new PointerEvent('pointerup',pt)); te('touchend',false); } },[type,x,y]);
  let lx=0,ly=0; return { start:(x,y)=>{ lx=x; ly=y; return ev('start',x,y); }, move:(x,y)=>{ lx=x; ly=y; return ev('move',x,y); }, end:()=>ev('end',lx,ly) };
}
module.exports={finger,WK,chromium,devices,path,fs,S,REPO,URL_,say,out,mk,book,para,toastText,vis,toolsOpen};
