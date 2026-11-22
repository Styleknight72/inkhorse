/* p14 (rev 274): pictures in Write, and the pages they make. The manual says: a picture goes between paragraphs, after the paragraph the cursor
   is in (before it, if the cursor is at its very start), never inside a sentence; choosing a picture closes Tools and the Place picture panel
   says where it will go, with Insert in view; after Insert the writing box shows the picture's line; tapping a picture's line gives Move up and
   Move down, one paragraph at a time; Full bleed warns when it would cut part of the picture. And the pages (Formatting Standard): a caption sits
   directly under its picture, also on a page of its own (F5.4); a page that holds only a picture has no page header (F2.6); a picture straight
   after a section heading shares a page with it (F5.3). Found in Steve's own Dual Velocity Bible and Nova's Character Bible, Nov 21, 2026. */
const {chromium,mk,book,para,say,fs,path}=require('./common.js');
const ok=(c,id,m)=>say(c?'OK':'FAULT',id,m);
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; try{ await fn(); }catch(e){ say('ERROR',id,String(e&&e.message||e).slice(0,300)); } };
const TMP=require('os').tmpdir();
const noErr=(pg,id)=>{ if(pg.errs&&pg.errs.length) say('FAULT',id,'page error: '+pg.errs[0]); };
/* a plain picture of a given size, made in the page and saved as a file, so it goes in through the real picker */
const picFile=async(pg,name,w,h,col)=>{ const f=path.join(TMP,name); const d=await pg.evaluate(([w,h,col])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); return c.toDataURL('image/png').split(',')[1]; },[w,h,col]); fs.writeFileSync(f,Buffer.from(d,'base64')); return f; };
const pick=async(pg,f)=>{ await pg.setInputFiles('#picIn',f); await pg.waitForFunction(()=>!!(typeof imgEdit!=='undefined'&&imgEdit&&document.querySelector('#imgOk')),null,{timeout:15000}); };
const lines=pg=>pg.evaluate(()=>document.querySelector('#manuscript').value.split('\n'));
(async()=>{ const b=await chromium.launch();

await run('WP-01',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  await book(pg,[['One',['First paragraph about the torso rows.','Second paragraph: each enclosed region needed at least ten pixels of interior.','Third paragraph closes it.'].join('\n')]]);
  await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.focus(); const k=t.value.indexOf('needed at least')+15; t.setSelectionRange(k,k); setTools(true); });
  const f=await picFile(pg,'wp01.png',600,400,'#4a6890'); await pick(pg,f);
  const st=await pg.evaluate(()=>{ const r=document.querySelector('#imgOk').getBoundingClientRect(); return {tools:!document.querySelector('#write').classList.contains('tools-closed'),inView:r.top>=0&&r.bottom<=innerHeight,where:(document.querySelector('#imgWhere')||{}).textContent||''}; });
  ok(!st.tools,'WP-01a','choosing a picture closes Tools');
  ok(st.inView,'WP-01b','the Place picture panel shows Insert on screen without scrolling (iPhone 15 Pro Max)');
  ok(/After the paragraph that ends .*ten pixels of interior/.test(st.where),'WP-01c','the panel says where the picture will go: '+JSON.stringify(st.where));
  await pg.click('#imgOk'); await pg.waitForTimeout(500); const L=await lines(pg);
  ok(L.length===4&&/^Second paragraph: each enclosed region needed at least ten pixels of interior\.$/.test(L[1])&&/^\[\[image /.test(L[2])&&L[3]==='Third paragraph closes it.','WP-01d','a picture inserted with the cursor in the middle of a sentence goes after that paragraph, and the sentence stays whole: '+JSON.stringify(L.map(x=>x.slice(0,30))));
  const caret=await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); return t.value.slice(0,t.selectionStart).split('\n').length-1; });
  ok(caret===2,'WP-01e','after Insert the cursor is on the picture\'s line (line '+(caret+1)+')');
  /* the cursor at the very start of a paragraph: the picture goes before it */
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); const k=t.value.indexOf('First paragraph'); t.focus(); t.setSelectionRange(k,k); });
  await pick(pg,f); await pg.click('#imgOk'); await pg.waitForTimeout(400); const L2=await lines(pg);
  ok(/^\[\[image /.test(L2[0])&&L2[1].startsWith('First paragraph'),'WP-01f','with the cursor at the start of a paragraph the picture goes before it: '+JSON.stringify(L2.map(x=>x.slice(0,20))));
  noErr(pg,'WP-01'); await pg.context().close(); });

await run('WP-02',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  await book(pg,[['One',['Alpha paragraph.','Bravo paragraph.','Charlie paragraph.'].join('\n')]]);
  await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); const k=t.value.indexOf('Charlie')-1; t.focus(); t.setSelectionRange(k,k); });
  const f=await picFile(pg,'wp02.png',500,500,'#7a5a3c'); await pick(pg,f); await pg.click('#imgOk'); await pg.waitForTimeout(400);
  const open=async()=>{ await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); const k=t.value.indexOf('[[image')+3; t.focus(); t.setSelectionRange(k,k); checkImageLine(); }); await pg.waitForTimeout(250); };
  const order=async()=>(await lines(pg)).map(l=>l.startsWith('[[image')?'PIC':l.split(' ')[0]).join(',');
  await open(); const has=await pg.evaluate(()=>!!document.querySelector('#imgUp')&&!!document.querySelector('#imgDown'));
  ok(has,'WP-02a','tapping a picture\'s line shows Move up and Move down');
  const o0=await order(); await pg.click('#imgUp'); await pg.waitForTimeout(250); const o1=await order(); await pg.click('#imgUp'); await pg.waitForTimeout(250); const o2=await order();
  await pg.click('#imgUp'); await pg.waitForTimeout(250); const o3=await order(); await pg.click('#imgDown'); await pg.waitForTimeout(250); const o4=await order();
  ok(o0==='Alpha,Bravo,PIC,Charlie'&&o1==='Alpha,PIC,Bravo,Charlie'&&o2==='PIC,Alpha,Bravo,Charlie'&&o3===o2&&o4==='Alpha,PIC,Bravo,Charlie','WP-02b','Move up and Move down take the picture one paragraph at a time and stop at the top: '+[o0,o1,o2,o3,o4].join(' → '));
  const still=await pg.evaluate(()=>!!document.querySelector('#imgUp')&&!document.querySelector('#assist').hidden);
  ok(still,'WP-02c','the picture panel stays open while moving');
  noErr(pg,'WP-02'); await pg.context().close(); });

await run('WP-03',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  await book(pg,[['One','A paragraph.']]); await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  const wide=await picFile(pg,'wp03w.png',1536,1024,'#4a6890'); await pick(pg,wide);
  await pg.click('.chip[data-place="bleed"]'); await pg.waitForTimeout(200);
  const w1=await pg.evaluate(()=>(document.querySelector('#imgBleedWarn')||{}).textContent||'');
  ok(/loses about \d+% of it at the sides/.test(w1)&&/Own page/.test(w1),'WP-03a','Full bleed warns that a wide picture loses its sides, and points to Own page: '+JSON.stringify(w1));
  await pg.click('.chip[data-place="page"]'); await pg.waitForTimeout(200);
  ok(!(await pg.evaluate(()=>!!document.querySelector('#imgBleedWarn'))),'WP-03b','Own page shows no such warning');
  noErr(pg,'WP-03'); await pg.context().close(); });

/* the pages: one chapter with a section heading straight before a tall picture, and an own-page picture with a caption */
await run('F5-PAGES',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  await book(pg,[['One','Opening words.']]); await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  const ids=[]; for(const [n,w,h,c] of [['f5w.png',1536,1024,'#4a6890'],['f5t.png',900,1300,'#7a5a3c']]){ await pick(pg,await picFile(pg,n,w,h,c)); ids.push(await pg.evaluate(()=>imgEdit.im.id)); await pg.click('#imgCancel'); }
  await pg.evaluate(ids=>{ const P='Each enclosed region needed at least ten original square pixels of interior, and junctions close together were merged into one.';
    CH.get(S.cur).text=[P,P,P,P,P,P,P,P,P,'## Where the model stands','[[image '+ids[1]+' | inline | 100% | center | The tall study]]',P,P,'[[image '+ids[0]+' | page | 70% | center | Nova]]',P,P].join('\n');
    dirty.add(S.cur); PCACHE.clear(); loadEditor(); refreshReader(); setTab('read'); },ids);
  await pg.waitForTimeout(1200);
  const pages=await pg.evaluate(async()=>{ const out=[]; const n=pag(S.rch).pages.length;
    for(let i=0;i<n;i++){ goTo({ch:S.rch,i}); drawView(); const f=document.querySelector('#spread .face:not(.gone)'), im=f&&f.querySelector('.ptext img');
      if(im&&!im.complete) await new Promise(r=>{ im.onload=im.onerror=r; setTimeout(r,1500); });
      const g=document.querySelector('#spread .face:not(.gone)'), img=g.querySelector('.ptext img'), cap=g.querySelector('.ptext figcaption'), rh=g.querySelector('.rh'), h=/Where the model stands/.test(g.querySelector('.ptext').textContent);
      let pic=null; if(img){ const R=img.getBoundingClientRect(), nat=img.naturalWidth/img.naturalHeight; let w=R.width,hh=R.height; if(getComputedStyle(img).objectFit==='contain'&&nat){ if(w/hh>nat) w=hh*nat; else hh=w/nat; } const top=R.top+(R.height-hh)/2; pic={bottom:top+hh}; }
      out.push({i,rh:rh?rh.textContent.trim():'',cap:cap?cap.textContent:'',capGap:(pic&&cap)?cap.getBoundingClientRect().top-pic.bottom:null,lh:parseFloat(getComputedStyle(g.querySelector('.ptext')).fontSize),head:!!h,img:!!img}); }
    return out; });
  const own=pages.find(p=>p.cap==='Nova'), tall=pages.find(p=>p.cap==='The tall study'), headPage=pages.find(p=>p.head);
  ok(own&&own.capGap!==null&&own.capGap>=0&&own.capGap<=own.lh*1.2,'F5.4','a caption sits directly under its picture on a page of its own (gap '+(own&&own.capGap!==null?Math.round(own.capGap)+'px':'?')+')');
  ok(own&&own.rh==='','F2.6','a page that holds only a picture has no page header ('+JSON.stringify(own&&own.rh)+')');
  ok(headPage&&tall&&headPage.i===tall.i,'F5.3','a picture straight after a section heading shares the heading\'s page (heading on page '+(headPage&&headPage.i+1)+', picture on page '+(tall&&tall.i+1)+')');
  noErr(pg,'F5-PAGES'); await pg.context().close(); });


/* rev 274: a section heading straight before an Own page picture shares its page, at the smallest, a middle and the largest text size, and the
   picture is made smaller so that it and its caption still fit (found while checking rev 274 in WebKit: the heading stood alone on a page) */
await run('F5-OWNHEAD',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  await book(pg,[['One','Opening words.']]); await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  await pick(pg,await picFile(pg,'f5o.png',600,1400,'#45597a')); const id=await pg.evaluate(()=>imgEdit.im.id); await pg.click('#imgCancel');
  await pg.evaluate(id=>{ const P='Each enclosed region needed at least ten original square pixels of interior, and junctions close together were merged into one.';
    CH.get(S.cur).text=[P,P,P,P,P,'## Where the model stands today, after the long fitting in the studio','[[image '+id+' | page | 70% | center | The tall study, front view, before the fitting]]',P].join('\n');
    dirty.add(S.cur); PCACHE.clear(); loadEditor(); refreshReader(); setTab('read'); },id);
  for(const fs of [12,20,28]){
    await pg.evaluate(fs=>{ S.fs=fs; applyType(); saveSettings(); relayout(); },fs); await pg.waitForTimeout(1500);
    const r=await pg.evaluate(async()=>{ const n=pag(S.rch).pages.length; let head=-1, pic=null;
      for(let i=0;i<n;i++){ goTo({ch:S.rch,i}); drawView(); const f=document.querySelector('#spread .face:not(.gone)'), im=f&&f.querySelector('.ptext img');
        if(im&&!im.complete) await new Promise(r=>{ im.onload=im.onerror=r; setTimeout(r,1500); });
        const g=document.querySelector('#spread .face:not(.gone)'), pt=g.querySelector('.ptext'); if(/Where the model stands today/.test(pt.textContent)) head=i;
        const img=pt.querySelector('img'), cap=pt.querySelector('figcaption');
        if(img){ const B=pt.getBoundingClientRect().bottom+1; pic={i, fits:img.getBoundingClientRect().bottom<=B&&(!cap||cap.getBoundingClientRect().bottom<=B), h:Math.round(img.getBoundingClientRect().height)}; } }
      return {head,pic}; });
    ok(r.pic&&r.head===r.pic.i&&r.pic.fits&&r.pic.h>60,'F5.3','text size '+fs+': an Own page picture after a section heading shares its page and fits with its caption (heading on page '+(r.head+1)+', picture on page '+(r.pic&&r.pic.i+1)+', '+(r.pic&&r.pic.h)+'px tall'+(r.pic&&!r.pic.fits?', CUT OFF':'')+')'); }
  noErr(pg,'F5-OWNHEAD'); await pg.context().close(); });

await run('RD-TB',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max'); await book(pg,[['One','A paragraph.']]); await pg.evaluate(()=>{ S.tips=false; setTab('read'); }); await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>{ const e=document.querySelector('#deviceSel'), cs=getComputedStyle(e), c=document.createElement('canvas').getContext('2d'); c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    const t=e.options[e.selectedIndex].text; return {t, need:Math.ceil(c.measureText(t).width+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+((cs.appearance||cs.webkitAppearance)==='none'?0:20)),   /* the phone's own arrow, when it is drawn, takes about 20px beside the padding */ have:Math.floor(e.getBoundingClientRect().width-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth))}; });
  ok(r.t==='Fit my screen'&&r.need<=r.have,'RD-TB','on an iPhone 15 Pro Max the Read toolbar shows "Fit my screen" whole ('+r.need+'px of text and padding in a '+r.have+'px menu)');
  noErr(pg,'RD-TB'); await pg.context().close(); });

await b.close(); })();
