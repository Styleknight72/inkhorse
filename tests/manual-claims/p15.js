/* p15 (rev 275): Undo and Redo show what they did. The manual says: Undo takes back your last change and Redo puts it back; the writing box
   goes to the spot that changed, highlights what came back, and a short message says what was undone or redone. Found by Steve on his
   iPhone, Nov 22, 2026: Undo took a picture out of page 266 of his book, but nothing seemed to happen, because the change was outside the
   small writing box. */
const {chromium,mk,book,say,fs,path}=require('./common.js');
const ok=(c,id,m)=>say(c?'OK':'FAULT',id,m);
const run=async(id,fn)=>{ if(process.env.ONLY&&!new RegExp(process.env.ONLY).test(id)) return; try{ await fn(); }catch(e){ say('ERROR',id,String(e&&e.message||e).slice(0,300)); } };
const TMP=require('os').tmpdir();
const noErr=(pg,id)=>{ if(pg.errs&&pg.errs.length) say('FAULT',id,'page error: '+pg.errs[0]); };
(async()=>{ const b=await chromium.launch();

await run('UN-01',async()=>{ const pg=await mk(b,'iPhone 15 Pro Max');
  const P='Each enclosed region needed at least ten original square pixels of interior, and junctions close together were merged into one.';
  const paras=[]; for(let i=0;i<40;i++) paras.push('Paragraph '+(i+1)+'. '+P);
  await book(pg,[['One',paras.join('\n')]]); await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.waitForTimeout(400);
  const f=path.join(TMP,'un01.png'); const d=await pg.evaluate(()=>{ const c=document.createElement('canvas'); c.width=600; c.height=400; const g=c.getContext('2d'); g.fillStyle='#8a5a3a'; g.fillRect(0,0,600,400); return c.toDataURL('image/png').split(',')[1]; }); fs.writeFileSync(f,Buffer.from(d,'base64'));
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); const k=t.value.indexOf('Paragraph 35.')+20; t.focus(); t.setSelectionRange(k,k); });
  await pg.setInputFiles('#picIn',f); await pg.waitForFunction(()=>!!document.querySelector('#imgOk'),null,{timeout:15000}); await pg.click('#imgOk'); await pg.waitForTimeout(600);
  /* go back to the top of the writing box, as Steve was, far away from the picture */
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(0,0); t.scrollTop=0; scrollTo(0,0); document.querySelector('#toast').hidden=true; });
  await pg.waitForTimeout(200);
  await pg.click('#undoBtn'); await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'), v=t.value, k=v.indexOf('Paragraph 36.'), toast=document.querySelector('#toast');
    /* where the change is, on screen: measure the line inside the box */
    const cs=getComputedStyle(t), m=document.createElement('div'); m.style.cssText=`position:absolute;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;width:${t.clientWidth}px;padding:${cs.padding};font:${cs.font};line-height:${cs.lineHeight};letter-spacing:${cs.letterSpacing}`;
    m.textContent=v.slice(0,t.selectionStart); const s=document.createElement('span'); s.textContent='x'; m.appendChild(s); document.body.appendChild(m); const y=s.offsetTop; m.remove();
    const box=t.getBoundingClientRect(), sy=box.top+y-t.scrollTop;
    return {gone:!/\[\[image /.test(v), msg:toast.hidden?'':toast.textContent, near:Math.abs(t.selectionStart-k)<=2, seen:sy>=Math.max(0,box.top)-2&&sy<=Math.min(innerHeight,box.bottom)}; });
  ok(r.gone,'UN-01a','Undo takes the picture out');
  ok(/^Undone: picture taken out/.test(r.msg),'UN-01b','a message says what was undone ("'+r.msg+'")');
  ok(r.near&&r.seen,'UN-01c','the writing box shows the spot where the picture was, on screen (cursor there: '+r.near+', on screen: '+r.seen+')');
  await pg.evaluate(()=>{ document.querySelector('#toast').hidden=true; const t=document.querySelector('#manuscript'); t.setSelectionRange(0,0); t.scrollTop=0; scrollTo(0,0); });
  await pg.click('#redoBtn'); await pg.waitForTimeout(500);
  const q=await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'), toast=document.querySelector('#toast'); return {back:/\[\[image /.test(t.value), msg:toast.hidden?'':toast.textContent, sel:t.value.slice(t.selectionStart,t.selectionEnd)}; });
  ok(q.back&&/^Redone: picture put back/.test(q.msg),'UN-02a','Redo puts the picture back and says so ("'+q.msg+'")');
  ok(/^\[\[image /.test(q.sel.trim()),'UN-02b','what came back is highlighted ("'+q.sel.trim().slice(0,30)+'…")');
  /* words: type, then undo */
  await pg.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); });
  await pg.keyboard.type(' Three more words'); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>{ document.querySelector('#toast').hidden=true; }); await pg.click('#undoBtn'); await pg.waitForTimeout(500);
  const w=await pg.evaluate(()=>{ const toast=document.querySelector('#toast'); return toast.hidden?'':toast.textContent; });
  ok(/^Undone: (3 words taken out|words changed)/.test(w),'UN-03','undoing typing says what was taken out ("'+w+'")');
  noErr(pg,'UN'); await pg.context().close(); });

await b.close(); })();
