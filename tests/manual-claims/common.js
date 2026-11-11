const { chromium, devices } = require('playwright'); const path=require('path'), fs=require('fs');
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
async function mk(b,dev,opt={}){ const ctx=await b.newContext({...(typeof dev==='string'?devices[dev]:dev),permissions:['clipboard-read','clipboard-write'],acceptDownloads:true,...opt});
  await ctx.addInitScript(FAKE);
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
module.exports={chromium,devices,path,fs,S,REPO,URL_,say,out,mk,book,para,toastText,vis,toolsOpen};
