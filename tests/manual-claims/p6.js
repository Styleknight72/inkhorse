const {chromium,say,mk,book,fs}=require('./common.js');
(async()=>{ const b=await chromium.launch();
 const pg0=await mk(b,'iPhone 14 Pro Max'); const hid=await pg0.evaluate(()=>document.querySelector('#spellBtn').hidden); say(hid?'OK':'FAULT','BP-60a','outside Claude there is no Spelling button'); await pg0.ctx.close();
 const ctx=await b.newContext({...require('playwright').devices['iPhone 14 Pro Max']});
 await ctx.addInitScript(()=>{ window.__asked=[]; const sample={json:async p=>{ window.__asked.push(p); return [{word:'recieve',fix:'receive'},{word:'teh',fix:'the'},{word:'Ellery',fix:'Ellary'},{word:'Teh',fix:'The'},{word:'Moxley',fix:'Moxly'},{word:'Absent',fix:'Abscent'}]; }};
   let own=null; Object.defineProperty(window,'claude',{configurable:true,get(){ return {use:async k=>k==='sample'?sample:(own?own.use(k):null)}; },set(v){ own=v; }}); });
 const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); await pg.goto(process.env.MURL||'http://127.0.0.1:8765/preview/next.html'); await pg.waitForTimeout(2200);
 /* rev 267: the stand-in checker also "corrects" two names that are in the text (Ellery mid-sentence; Moxley, a word taught to Hoofprint, at a sentence start)
    and a capitalised typo at a sentence start (Teh), so what Inkhorse does with names is tested, not just what it asks for */
 await book(pg,[['One','I will recieve teh letter from Ellery. Teh end came. Moxley came too. Then I recieve another.']]);
 await pg.evaluate(()=>{ S.hp.words=['Moxley']; });
 const r=await pg.evaluate(async()=>{ const v0=document.querySelector('#manuscript').value; const shown=!document.querySelector('#spellBtn').hidden; document.querySelector('#spellBtn').click(); await new Promise(r=>setTimeout(r,500));
   window.__dbg=document.querySelector("#assistBody")&&document.querySelector("#assistBody").innerHTML; const rows=[...document.querySelectorAll('#assistBody .fix')].map(e=>e.textContent.replace(/\s+/g,' ')); const same=document.querySelector('#manuscript').value===v0;
   if(!document.querySelector('#assistBody [data-fix="0"]')) return {dbg:window.__dbg,shown,v:document.querySelector("#manuscript").value}; document.querySelector('#assistBody [data-fix="0"]').click(); await new Promise(r=>setTimeout(r,200)); const v1=document.querySelector('#manuscript').value;
   document.querySelector('#assistBody [data-skip="0"]').click(); await new Promise(r=>setTimeout(r,200)); const v2=document.querySelector('#manuscript').value;
   return {shown,rows,same,v1,v2,asked:/names of people/.test(window.__asked[0]||'')}; });
 say(r.shown?'OK':'FAULT','BP-60b','inside Claude the Spelling tool is there');
 say(r.rows.length===3&&/recieve.*receive.*2×/.test(r.rows[0])&&/^teh.*the.*1×/.test(r.rows[1])&&/^Teh.*The.*1×/.test(r.rows[2])&&r.same?'OK':'FAULT','BP-60c','lists each mistake with its fix and count, changes nothing yet (a word not in the text is dropped): '+JSON.stringify(r.rows));
 say(r.v1==='I will receive teh letter from Ellery. Teh end came. Moxley came too. Then I receive another.'&&r.v2===r.v1?'OK':'FAULT','BP-60d','Fix changes that word everywhere; Skip leaves it: '+r.v2);
 say(r.asked&&!r.rows.some(x=>/Ellery|Moxley/.test(x))?'OK':'FAULT','BP-60e','names are left alone: the check is told to, and a name it "corrects" anyway (Ellery in mid-sentence, Moxley taught to Hoofprint) is not offered, while a typo at a sentence start (Teh) still is: '+JSON.stringify(r.rows));
 if(pg.errs.length) say('FAULT','x',pg.errs[0]); await b.close(); })();
