/* User manual claim checks, rev 257: promises the Nov 13 review found had NO check at all (docs/reviews/manual-claims-review-2026-11-13.md, "MISSING").
   Each id is M-<number in that list>. Every check works the app the way a reader would (buttons, files, keys) and looks at what happened. */
const {chromium,devices,say,mk,book,para,toastText,vis,fs,path,REPO,S:TMP}=require('./common.js');
const run=async(id,fn)=>{ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
const ok=(c,id,msg)=>say(c?'OK':'FAULT',id,msg);
const dl=async(pg,sel)=>{ const [d]=await Promise.all([pg.waitForEvent('download',{timeout:60000}), pg.evaluate(s=>document.querySelector(s).click(),sel)]); return fs.readFileSync(await d.path()); };
const noErr=(pg,id)=>{ if(pg.errs&&pg.errs.length) say('FAULT',id+'x','the page reported an error: '+pg.errs[0].slice(0,160)); };
(async()=>{ const b=await chromium.launch();

 // ---------- 1, 2: release and revision
 await run('M-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',para(1,60)]]);
   const v=await pg.evaluate(()=>INK_VERSION);
   await pg.click('#chBtn'); await pg.waitForTimeout(300);
   const note=await pg.evaluate(()=>{ const e=document.querySelector('#verNote'), r=e.getBoundingClientRect(); return {t:e.innerText,shown:r.width>0&&r.height>0&&!document.querySelector('#drawer').hidden}; });
   ok(note.shown&&note.t.includes(v.release)&&note.t.includes('rev '+v.rev),'M-01a','the release and revision show at the bottom of the Chapters panel: "'+note.t.slice(0,90)+'"');
   await pg.evaluate(()=>{ document.querySelector('#drawer').hidden=true; document.querySelector('#status').click(); }); await pg.waitForTimeout(250);
   const t=await toastText(pg); ok(t.includes('Inkhorse '+v.release)&&t.includes('rev '+v.rev),'M-01b','tapping the save dot shows them too: "'+t.slice(0,120)+'"'); noErr(pg,'M-01'); await pg.context().close(); });

 await run('M-02',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   await pg.evaluate(async()=>{ await openLibBook('manual',true); setTab('read'); }); await pg.waitForTimeout(900);
   const r=await pg.evaluate(()=>{ jumpTo({ch:'__front',i:0}); return {v:INK_VERSION,ver:MANUAL.ver}; }); await pg.waitForTimeout(700);
   const face=await pg.evaluate(()=>{ const f=document.querySelector('#spread .face:not(.gone)'); return f?f.innerText.replace(/\s+/g,' '):''; });
   ok(new RegExp('rev\\s*'+r.v.rev+'\\b','i').test(face)&&face.toLowerCase().includes(String(r.v.release).toLowerCase()),'M-02','the manual\'s cover prints the same release and revision as the app (rev '+r.v.rev+'): "'+face.slice(0,150)+'"'); await pg.context().close(); });

 // ---------- 4: Dictate
 await run('M-04',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','Alpha omega.']]);
   await pg.evaluate(()=>{ window.__sr.said=['beta','gamma','delta','epsilon','zeta','eta','theta','iota']; const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(6,6); setTools(true); });
   await pg.click('#micBtn'); await pg.waitForTimeout(120);
   const lab1=await pg.textContent('#micLabel');
   await pg.evaluate(()=>document.querySelector('#micBtn').click()); await pg.waitForTimeout(150); const mid=await pg.inputValue('#manuscript'); await pg.waitForTimeout(500); const lab2=await pg.textContent('#micLabel'); const starts=await pg.evaluate(()=>window.__sr.starts); await pg.waitForTimeout(700);
   const starts2=await pg.evaluate(()=>window.__sr.starts);
   ok(/^Alpha beta( \w+)* omega\.$/i.test(mid.trim())&&!/  /.test(mid),'M-04a','dictated words land where the cursor is, in the middle of a sentence: '+JSON.stringify(mid));
   ok(/Listening/.test(lab1)&&!/Listening/.test(lab2)&&starts2===starts,'M-04b','tapping Dictate again stops it (label "'+lab1+'" → "'+lab2+'", no more listening after)');
   await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.value=''; ta.dispatchEvent(new Event('input',{bubbles:true})); ta.focus(); window.__sr.said=['is it late question mark we won exclamation point first line new line second line']; });
   await pg.evaluate(()=>document.querySelector('#micBtn').click()); await pg.waitForTimeout(900); await pg.evaluate(()=>{ try{ micStop(); }catch(_){ } }); await pg.waitForTimeout(400);
   const v=await pg.inputValue('#manuscript');
   ok(/is it late\?/i.test(v)&&/we won!/i.test(v)&&/first line\s*\n\s*second line/i.test(v)&&!/question mark|exclamation|new line/i.test(v),'M-04c','spoken "question mark", "exclamation point" and "new line" become ? ! and a new line: '+JSON.stringify(v)); noErr(pg,'M-04'); await pg.context().close(); });

 // ---------- 5: Find is for this chapter
 await run('M-05',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','The cat sat. A cat ran. No dog. One more cat.'],['Two','Another cat lives here, and a second cat.']]);
   await pg.evaluate(()=>setTools(true)); await pg.click('#findBtn'); await pg.waitForTimeout(200); await pg.fill('#findIn','cat'); await pg.waitForTimeout(400);
   const n=await pg.textContent('#findN'); ok(/\b3\b/.test(n)&&!/\b5\b/.test(n),'M-05','Find counts the matches in this chapter only (3 here, 2 more in the next chapter are left out): "'+n+'"'); noErr(pg,'M-05'); await pg.context().close(); });

 // ---------- 7: chapter Delete, twice, with Undo for ten seconds
 await run('M-07',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const ids=await book(pg,[['Keep',para(1,40)],['Goes',para(2,40)]]);
   await pg.click('#chBtn'); await pg.waitForTimeout(300);
   await pg.click(`[data-del="${ids[1]}"]`); await pg.waitForTimeout(250);
   const one=await pg.evaluate(id=>({n:BOOK.order.length,lab:document.querySelector(`[data-del="${id}"]`).textContent}),ids[1]);
   ok(one.n===2&&/Delete\?/.test(one.lab),'M-07a','one tap on Delete does not delete; the button asks "Delete?": '+JSON.stringify(one));
   await pg.click(`[data-del="${ids[1]}"]`); await pg.waitForTimeout(400);
   const two=await pg.evaluate(()=>({n:BOOK.order.length,undo:!!document.querySelector('#toast:not([hidden]) #toastBtn'),t:document.querySelector('#toast').textContent}));
   ok(two.n===1&&two.undo&&/Undo/.test(two.t),'M-07b','the second tap deletes the chapter and offers Undo: '+JSON.stringify(two));
   await pg.waitForTimeout(8600); const still=await pg.evaluate(()=>!!document.querySelector('#toast:not([hidden]) #toastBtn'));
   await pg.evaluate(()=>document.querySelector('#toastBtn').click()); await pg.waitForTimeout(400);
   const back=await pg.evaluate(()=>({n:BOOK.order.length,t:BOOK.order.map(id=>CH.get(id).title).join('|'),len:CH.get(BOOK.order[1])?CH.get(BOOK.order[1]).text.length:0}));
   ok(still&&back.n===2&&back.t==='Keep|Goes'&&back.len>100,'M-07c','Undo is still there nine seconds later and puts the chapter back in its place, words and all: '+JSON.stringify(back));
   await pg.click(`[data-del="${ids[1]}"]`); await pg.waitForTimeout(200); await pg.click(`[data-del="${ids[1]}"]`); await pg.waitForTimeout(10800);
   const gone=await pg.evaluate(()=>!document.querySelector('#toast:not([hidden]) #toastBtn'));
   ok(gone,'M-07d','after ten seconds the Undo button is gone'); noErr(pg,'M-07'); await pg.context().close(); });

 // ---------- 13, 10: an older .json backup restores the same way; the current book is backed up first
 await run('M-13',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:6},(_,k)=>para(k,80)).join('\n')]]);
   await pg.evaluate(()=>{ BOOK.title='Saved Title'; touchIndex(); }); await pg.click('#chBtn'); await pg.waitForTimeout(300);
   const raw=await dl(pg,'#fbkSave'); const f=TMP+'/old-backup.json'; fs.writeFileSync(f,raw); await pg.waitForTimeout(300);
   const n0=await pg.evaluate(async()=>(await bkAll()).length);
   await pg.evaluate(()=>{ BOOK.title='Changed Later'; const c=CH.get(BOOK.order[0]); c.text='Only this line now.'; touchChapter(c); touchIndex(); loadEditor(); });
   await pg.setInputFiles('#fbkIn',f); await pg.waitForTimeout(700);
   const pend=await pg.evaluate(()=>!!document.querySelector('#fbkGo')); if(pend){ await pg.evaluate(()=>document.querySelector('#fbkGo').click()); } await pg.waitForTimeout(1800);
   const after=await pg.evaluate(async()=>{ const all=await bkAll(); const full=[]; for(const x of all){ try{ const d=await idb.get(bkP()+x.key); full.push({kind:x.kind,title:d&&d.meta&&d.meta.title,text:d&&d.chapters&&d.chapters[0]&&d.chapters[0].text}); }catch(_){ } }
     return {title:BOOK.title,words:CH.get(BOOK.order[0]).text.split(/\s+/).length,n:all.length,full}; });
   ok(pend&&after.title==='Saved Title'&&after.words>300,'M-13','a backup file whose name ends in .json restores the same way: '+JSON.stringify({pend,title:after.title,words:after.words}));
   const kept=after.full.find(x=>x.title==='Changed Later'&&x.text==='Only this line now.');
   ok(after.n>n0&&!!kept,'M-10','before restoring, the book as it was is saved as a backup first (so the restore can be taken back): '+JSON.stringify({before:n0,after:after.n,kinds:after.full.map(x=>x.kind),found:!!kept})); noErr(pg,'M-13'); await pg.context().close(); });

 // ---------- 18: Match my device follows the device's light or dark setting
 await run('M-18',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',para(1,60)]]);
   const lum=()=>pg.evaluate(()=>{ const c=getComputedStyle(document.body).backgroundColor, m=/(\d+), (\d+), (\d+)/.exec(c); return m?(+m[1]+ +m[2]+ +m[3])/3:-1; });
   const pick=v=>pg.evaluate(v=>{ const s=document.querySelector('#themeSel'); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); },v);
   await pick('auto'); await pg.emulateMedia({colorScheme:'light'}); await pg.waitForTimeout(250); const l1=await lum();
   await pg.emulateMedia({colorScheme:'dark'}); await pg.waitForTimeout(250); const d1=await lum();
   await pick('light'); await pg.waitForTimeout(250); const l2=await lum();
   ok(l1>180&&d1<90&&l2>180,'M-18','Match my device is light when the device is light and dark when it is dark; Light stays light on a dark device: '+JSON.stringify({light:Math.round(l1),dark:Math.round(d1),lightChosenOnDark:Math.round(l2)})); noErr(pg,'M-18'); await pg.context().close(); });

 // ---------- 20: Again plays the same sentence once more
 await run('M-20',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','First sentence here. Second sentence follows. Third one ends it.']]);
   await pg.evaluate(()=>{ setTab('read'); window.__spoken=[]; SYN.speak=u=>{ window.__spoken.push(u.text); setTimeout(()=>{ try{ u.onstart&&u.onstart({}); }catch(_){ } },10); }; SYN.cancel=()=>{}; S.ttsVoice=''; }); await pg.waitForTimeout(400);
   await pg.evaluate(()=>{ if(document.querySelector('#ttsBar').hidden) document.querySelector('#listenBtn').click(); }); await pg.waitForTimeout(300);
   await pg.evaluate(()=>ttsPlay()); await pg.waitForTimeout(500);
   const a=await pg.evaluate(()=>({k:TTS.k,n:window.__spoken.length,last:window.__spoken[window.__spoken.length-1]}));
   await pg.evaluate(()=>document.querySelector('#ttsAgain').click()); await pg.waitForTimeout(600);
   const c=await pg.evaluate(()=>({k:TTS.k,n:window.__spoken.length,last:window.__spoken[window.__spoken.length-1],playing:TTS.playing}));
   ok(a.n>=1&&c.n===a.n+1&&c.last===a.last&&c.k===a.k&&c.playing,'M-20','Again plays the sentence you just heard one more time, and stays on it: '+JSON.stringify({before:a,after:c})); noErr(pg,'M-20'); await pg.context().close(); });

 // ---------- 26: a copy-protected EPUB is refused, with a message that says why
 await run('M-26',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const JSZip=require('jszip'); const z=new JSZip();
   z.file('mimetype','application/epub+zip',{compression:'STORE'});
   z.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
   z.file('META-INF/encryption.xml','<?xml version="1.0"?><encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/><enc:CipherData><enc:CipherReference URI="OEBPS/ch1.xhtml"/></enc:CipherData></enc:EncryptedData></encryption>');
   z.file('OEBPS/content.opf','<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">x</dc:identifier><dc:title>Bought Book</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>');
   const junk=Buffer.alloc(6000); for(let i=0;i<junk.length;i++) junk[i]=(i*197+91)%256; z.file('OEBPS/ch1.xhtml',junk);
   const f=TMP+'/bought.epub'; fs.writeFileSync(f,await z.generateAsync({type:'nodebuffer'}));
   await pg.evaluate(()=>{ setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500);
   const n0=await pg.evaluate(()=>LIB.length);
   await pg.setInputFiles('#libIn',f); await pg.waitForTimeout(2500);
   const r=await pg.evaluate(()=>({n:LIB.length,note:document.querySelector('#libNote').textContent,titles:LIB.map(x=>x.title).join('|')}));
   ok(r.n===n0&&/copy-protected/i.test(r.note),'M-26','a copy-protected book is not added, and Inkhorse says it is copy-protected: '+JSON.stringify(r)); noErr(pg,'M-26'); await pg.context().close(); });

 // ---------- 30: Go to page with the Go button
 await run('M-30',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:14},(_,k)=>para(k,90)).join('\n')]]);
   await pg.evaluate(()=>{ setTab('read'); }); await pg.waitForTimeout(500);
   const gp=await pg.evaluate(async()=>{ if(document.querySelector('#goto').hidden) openGoto(); await new Promise(r=>setTimeout(r,200)); const i=document.querySelector('#gotoNum'); i.value='3'; i.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#gotoGo').click(); await new Promise(r=>setTimeout(r,500)); return {now:document.querySelector('#pgCur').textContent,closed:document.querySelector('#goto').hidden,i:curIndex()}; });
   ok(gp.now==='3'&&gp.closed,'M-30','Go to page: type a number and tap Go, and the book opens there: '+JSON.stringify(gp)); noErr(pg,'M-30'); await pg.context().close(); });

 // ---------- 3: the computer keys the manual lists
 await run('M-03',async()=>{ const pg=await mk(b,{viewport:{width:1280,height:800}}); await book(pg,[['One','The cat sat. A cat ran. No dog. One more cat.\n'+Array.from({length:30},(_,k)=>para(k,90)).join('\n')]]);
   const mod='Control';
   await pg.evaluate(()=>{ setTab('write'); const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); }); await pg.waitForTimeout(300);
   const t0=await pg.inputValue('#manuscript'); await pg.keyboard.type(' Zebra'); await pg.waitForTimeout(1700); const t1=await pg.inputValue('#manuscript');
   await pg.keyboard.press(mod+'+z'); await pg.waitForTimeout(300); const t2=await pg.inputValue('#manuscript');
   await pg.keyboard.press(mod+'+Shift+z'); await pg.waitForTimeout(300); const t3=await pg.inputValue('#manuscript');
   ok(t1===t0+' Zebra'&&t2===t0&&t3===t1,'M-03a','Ctrl+Z undoes and Ctrl+Shift+Z redoes: '+JSON.stringify({typed:t1.slice(-12),undone:t2.slice(-12),redone:t3.slice(-12)}));
   await pg.keyboard.press(mod+'+f'); await pg.waitForTimeout(300); const fo=await pg.evaluate(()=>({open:!document.querySelector('#findbar').hidden,focus:document.activeElement&&document.activeElement.id}));
   ok(fo.open&&fo.focus==='findIn','M-03b','Ctrl+F opens Find, ready to type: '+JSON.stringify(fo));
   await pg.keyboard.type('cat'); await pg.waitForTimeout(400); const sel=()=>pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); return ta.selectionStart; });
   await pg.keyboard.press('Enter'); await pg.waitForTimeout(250); const s1=await sel(); await pg.keyboard.press('Enter'); await pg.waitForTimeout(250); const s2=await sel(); await pg.keyboard.press('Shift+Enter'); await pg.waitForTimeout(250); const s3=await sel();
   const hits=await pg.evaluate(()=>{ const v=document.querySelector('#manuscript').value.toLowerCase(), o=[]; let i=-1; while((i=v.indexOf('cat',i+1))>=0) o.push(i); return o; });
   ok(hits.includes(s1)&&hits.includes(s2)&&s2>s1&&s3===s1,'M-03c','in Find, Enter steps to the next match and Shift+Enter back to the one before: '+JSON.stringify({s1,s2,s3,hits:hits.slice(0,4)}));
   await pg.keyboard.press('Escape'); await pg.waitForTimeout(250); ok(await pg.evaluate(()=>document.querySelector('#findbar').hidden),'M-03d','Esc closes Find');
   const esc=async(open,isOpen,name,id)=>{ await pg.evaluate(open); await pg.waitForTimeout(350); const was=await pg.evaluate(isOpen); await pg.evaluate(()=>{ if(document.activeElement&&document.activeElement!==document.body) document.activeElement.blur(); }); await pg.keyboard.press('Escape'); await pg.waitForTimeout(350); const now=await pg.evaluate(isOpen); ok(was&&!now,id,'Esc closes '+name+' (open before: '+was+', open after: '+now+')'); };
   await pg.evaluate(()=>setTab('read')); await pg.waitForTimeout(400);
   await esc(()=>openGoto(),()=>!document.querySelector('#goto').hidden,'the Book Hub','M-03e');
   await esc(()=>document.querySelector('#libBtn').click(),()=>!document.querySelector('#library').hidden,'the Library','M-03f');
   await esc(()=>openDrawer(),()=>!document.querySelector('#drawer').hidden,'the Chapters panel','M-03g');
   await pg.evaluate(()=>setTab('write')); await pg.waitForTimeout(300);
   await esc(()=>setFocus(true),()=>focusOn,'Focus (leaves it)','M-03h');
   await pg.evaluate(()=>{ setTab('read'); jumpTo({ch:BOOK.order[0],i:0}); }); await pg.waitForTimeout(600); await pg.evaluate(()=>{ if(document.activeElement&&document.activeElement!==document.body) document.activeElement.blur(); });
   const settle=want=>pg.waitForFunction(w=>!turning&&(w===null||curIndex()===w),want,{timeout:8000}).catch(()=>{});
   await settle(null); const i0=await pg.evaluate(()=>curIndex()); await pg.keyboard.press('PageDown'); await pg.waitForTimeout(400); await pg.waitForFunction(i=>!turning&&curIndex()>i,i0,{timeout:8000}).catch(()=>{}); const i1=await pg.evaluate(()=>curIndex()); await pg.keyboard.press('PageUp'); await pg.waitForTimeout(400); await settle(i0); const i2=await pg.evaluate(()=>curIndex());
   ok(i1>i0&&i2===i0,'M-03i','in Read, Page Down turns forward and Page Up back: '+JSON.stringify({i0,i1,i2})); noErr(pg,'M-03'); await pg.context().close(); });

 // ---------- 12: the first time Inkhorse is opened each day it saves a copy of the whole book
 await run('M-12',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:5},(_,k)=>para(k,80)).join('\n')]]);
   await pg.evaluate(()=>{ BOOK.title='Daily Book'; touchIndex(); }); await pg.waitForTimeout(2500);
   await pg.evaluate(async()=>{ const y=new Date(Date.now()-864e5); const k=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0'); S.bkDays=S.bkDays||{}; S.bkDays[SLOT]={day:k,where:bkWhere()}; S.bkDay=k; saveSettings(); await idb.set(bkP()+'index',[]); }); await pg.waitForTimeout(800);
   await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&typeof BOOK!=='undefined',null,{timeout:30000}); await pg.waitForTimeout(6000);
   const r1=await pg.evaluate(async()=>{ const all=await bkAll(); return {title:BOOK.title,keys:all.map(x=>x.key),today:'d-'+todayKey(),words:all[0]?all[0].words:0}; });
   await pg.reload(); await pg.waitForFunction(()=>typeof LIB!=='undefined'&&typeof BOOK!=='undefined',null,{timeout:30000}); await pg.waitForTimeout(5000);
   const r2=await pg.evaluate(async()=>(await bkAll()).map(x=>x.key));
   ok(r1.title==='Daily Book'&&r1.keys.includes(r1.today)&&r1.words>300&&r2.filter(k=>k===r1.today).length===1&&r2.length===r1.keys.length,'M-12','opened on a new day, Inkhorse saves a copy of the whole book; opened again the same day, it does not save a second one: '+JSON.stringify({first:r1,again:r2})); noErr(pg,'M-12'); await pg.context().close(); });

 // ---------- 19: W, H and Margin set the page in pixels
 await run('M-19',async()=>{ const pg=await mk(b,{viewport:{width:1400,height:1000}}); await book(pg,[['One',Array.from({length:10},(_,k)=>para(k,90)).join('\n')]]);
   await pg.evaluate(()=>{ setTab('read'); S.view='1'; const d=document.querySelector('#deviceSel'); d.value='custom'; d.dispatchEvent(new Event('change',{bubbles:true})); }); await pg.waitForTimeout(400);
   const boxes=await pg.evaluate(()=>{ const bx=document.querySelector('#customBox'); return {shown:!bx.hidden,ids:[...bx.querySelectorAll('input')].map(i=>i.id)}; });
   await pg.evaluate(()=>{ const set=(id,v)=>{ const e=document.querySelector('#'+id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }; const ids=[...document.querySelectorAll('#customBox input')].map(i=>i.id); set(ids[0],480); set(ids[1],640); set(ids[2],60); }); await pg.waitForTimeout(900);
   const m=await pg.evaluate(()=>{ const f=document.querySelector('#spread .face:not(.gone)'), t=f.querySelector('.ptext'); const sc=f.getBoundingClientRect().width/f.offsetWidth; return {w:f.offsetWidth,h:f.offsetHeight,textW:t?t.offsetWidth:0,left:t?Math.round((t.getBoundingClientRect().left-f.getBoundingClientRect().left)/sc):-1,dev:curDev()}; });
   ok(boxes.shown&&boxes.ids.length===3&&m.w===480&&m.h===640&&Math.abs(m.left-60)<=1&&Math.abs(m.textW-360)<=1,'M-19','W, H and Margin set the page: 480 wide, 640 tall, 60 at each side leaves 360 for the words: '+JSON.stringify({boxes:boxes.ids,w:m.w,h:m.h,left:m.left,textW:m.textW})); noErr(pg,'M-19'); await pg.context().close(); });

 // ---------- 21: Speed changes how fast the voice reads; Try plays a sample
 await run('M-21',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','First sentence here. Second sentence follows. Third one ends it.']]);
   await pg.evaluate(()=>{ setTab('read'); window.__spoken=[]; SYN.speak=u=>{ window.__spoken.push({t:u.text,r:u.rate}); setTimeout(()=>{ try{ u.onstart&&u.onstart({}); }catch(_){ } },10); }; SYN.cancel=()=>{}; S.ttsVoice=''; }); await pg.waitForTimeout(400);
   await pg.evaluate(()=>{ if(document.querySelector('#ttsBar').hidden) document.querySelector('#listenBtn').click(); }); await pg.waitForTimeout(300);
   const opts=await pg.evaluate(()=>[...document.querySelector('#ttsRate').options].map(o=>o.value));
   const setRate=v=>pg.evaluate(v=>{ const s=document.querySelector('#ttsRate'); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); },v);
   const fast=opts.reduce((a,x)=>+x>+a?x:a,opts[0]), slow=opts.reduce((a,x)=>+x<+a?x:a,opts[0]);
   await setRate(slow); await pg.evaluate(()=>ttsPlay()); await pg.waitForTimeout(500); const r1=await pg.evaluate(()=>window.__spoken[window.__spoken.length-1]);
   await setRate(fast); await pg.waitForTimeout(600); const r2=await pg.evaluate(()=>window.__spoken[window.__spoken.length-1]);
   ok(r1&&r2&&Math.abs(r1.r-(+slow))<0.01&&Math.abs(r2.r-(+fast))<0.01&&r2.r>r1.r,'M-21a','Speed sets how fast the voice reads, and changing it while she reads takes effect: '+JSON.stringify({slow:r1,fast:r2}));
   await pg.evaluate(()=>{ ttsPause(); window.__spoken=[]; document.querySelector('#ttsTry').click(); }); await pg.waitForTimeout(500);
   const tr=await pg.evaluate(()=>window.__spoken); ok(tr.length===1&&/read your book/i.test(tr[0].t)&&Math.abs(tr[0].r-(+fast))<0.01,'M-21b','Try plays a short sample in the chosen voice at the chosen speed: '+JSON.stringify(tr)); noErr(pg,'M-21'); await pg.context().close(); });

 await b.close(); })();
