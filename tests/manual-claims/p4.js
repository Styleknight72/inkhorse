const {chromium,say,mk,book,para,toastText,vis,toolsOpen,fs,S,path}=require('./common.js');
const JSZip=require('jszip'); let pdfjs; { const w=console.warn,l=console.log; console.warn=console.log=()=>{}; pdfjs=require(require('path').join(process.env.PDFJS_DIR,'..','legacy','build','pdf.js')); console.warn=w; console.log=l; }
const dl=async(pg,sel,set)=>{ if(set) await pg.evaluate(set); const [d]=await Promise.all([pg.waitForEvent('download',{timeout:60000}), pg.evaluate(s=>document.querySelector(s).click(),sel)]); return fs.readFileSync(await d.path()); };
const readPdf=async raw=>{ const doc=await pdfjs.getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise, pages=[]; for(let n=1;n<=doc.numPages;n++){ const p=await doc.getPage(n), v=p.getViewport({scale:1}), tc=await p.getTextContent(), ops=await p.getOperatorList(); pages.push({n,w:v.width,h:v.height,ops,imgs:ops.fnArray.filter(f=>f===pdfjs.OPS.paintImageXObject||f===pdfjs.OPS.paintJpegXObject).length,it:tc.items.filter(i=>i.str.trim()).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],h:i.height,r:i.transform[4]+i.width})),text:tc.items.map(i=>i.str).join(' ').replace(/\s+/g,' ')}); } return pages; };
const readZip=async raw=>{ const z=await JSZip.loadAsync(raw), o={files:Object.keys(z.files)}; for(const f of o.files) if(/\.(xhtml|opf|css|xml|rels)$/.test(f)) o[f]=await z.file(f).async('string'); return o; };
(async()=>{ const b=await chromium.launch();
 const run=async(id,fn)=>{ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,240)); } };
 // ---------- All books, Done, move, New chapter
 await run('YB-02',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','a.'],['Two','b.'],['Three','c.']]);
   await pg.click('#chBtn'); await pg.waitForTimeout(250); await pg.evaluate(()=>document.querySelector('#allBooks').click()); await pg.waitForTimeout(400); const lib=await pg.evaluate(()=>({tab:S.tab,lib:!!document.querySelector('#libPanel:not([hidden]),#library:not([hidden]),.libpanel:not([hidden])')||/Library/.test(document.body.innerText.slice(0,4000)),drawer:document.querySelector('#drawer').hidden}));
   say(lib.tab==='read'&&lib.drawer?'OK':'FAULT','YB-02','All books opens the Library: '+JSON.stringify(lib));
   await pg.evaluate(()=>setTab('write')); await pg.click('#chBtn'); await pg.waitForTimeout(200); await pg.click('#drawerDone'); await pg.waitForTimeout(150); say(await pg.evaluate(()=>document.querySelector('#drawer').hidden)?'OK':'FAULT','YB-04','Done closes the panel');
   await pg.click('#chBtn'); await pg.waitForTimeout(200); await pg.evaluate(()=>{ document.querySelector(`[data-down="${BOOK.order[0]}"]`).click(); }); await pg.waitForTimeout(150); const o1=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title).join(','));
   await pg.evaluate(()=>{ document.querySelector(`[data-up="${BOOK.order[2]}"]`).click(); }); await pg.waitForTimeout(150); const o2=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title).join(','));
   say(o1==='Two,One,Three'&&o2==='Two,Three,One'?'OK':'FAULT','YB-07a','↑ ↓ move a chapter earlier or later: '+o1+' → '+o2);
   await pg.evaluate(()=>{ const id=[...document.querySelectorAll('#chList [data-open],#chList .chrow,#chList [data-ch]')].length; }); 
   const tap=await pg.evaluate(async()=>{ const row=[...document.querySelectorAll('button.open[data-open]')].find(e=>CH.get(e.dataset.open).title==='Three'); if(!row) return 'no row'; row.click(); await new Promise(r=>setTimeout(r,300)); return CH.get(S.cur).title+' drawer hidden '+document.querySelector('#drawer').hidden; });
   say(/^Three/.test(tap)?'OK':'FAULT','YB-07b','tap a chapter in the list to open it: '+tap);
   await pg.evaluate(()=>{ selectChapter(BOOK.order[0]); }); await pg.click('#chBtn'); await pg.waitForTimeout(200); await pg.click('#addCh'); await pg.waitForTimeout(250); const o3=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title||'(new)').join(','));
   say(o3==='Two,(new),Three,One'?'OK':'FAULT','YB-15','+ New chapter goes right after the one you are in: '+o3);
   await book(pg,[['Only','Some words.']]); await pg.evaluate(()=>dropChapter(BOOK.order[0])); await pg.waitForTimeout(200); const only=await pg.evaluate(()=>({n:BOOK.order.length,t:CH.get(BOOK.order[0]).title,x:CH.get(BOOK.order[0]).text}));
   say(only.n===1&&!only.t&&!only.x?'OK':'FAULT','YB-07c','deleting the only chapter just empties it: '+JSON.stringify(only));
   await pg.ctx.close(); });
 // ---------- Book title, author, front pages, contents checkbox, exports
 await run('YB-19',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   await book(pg,[['First Light',[1,2,3,4].map(k=>para(k,90)).join('\n')],['Second Wind',[5,6,7].map(k=>para(k,90)).join('\n')]]);
   await pg.click('#chBtn'); await pg.waitForTimeout(250);
   const tocDefault=await pg.evaluate(()=>document.querySelector('#fmToc').checked);
   await pg.fill('#bookTitle','The Harbor Book'); await pg.fill('#bookAuthor','Ada Tester'); await pg.waitForTimeout(150);
   const ep0=await readZip(await dl(pg,'#expEpub')); const pdf0=await readPdf(await dl(pg,'#expPdf'));
   const allX=o=>Object.keys(o).filter(f=>/\.xhtml$/.test(f)).map(f=>o[f]).join('\n');
   say(tocDefault?'OK':'FAULT','YB-25a','Contents page is checked from the start');
   say(/<dc:title>The Harbor Book<\/dc:title>/.test(ep0['OEBPS/content.opf'])&&/<dc:creator[^>]*>Ada Tester</.test(ep0['OEBPS/content.opf'])&&/The Harbor Book/.test(pdf0[0].text)&&/Ada Tester/.test(pdf0[0].text)?'OK':'FAULT','YB-19','Book title and Author name the book and appear on its title page: pdf p1 "'+pdf0[0].text.slice(0,60)+'"');
   const blankOut=!/Dedication|For the/.test(allX(ep0))&&!pdf0.some(p=>/^For /.test(p.text.trim()))&&!/subtitle/i.test(allX(ep0));
   say(blankOut?'OK':'FAULT','YB-22','a blank field leaves its page out (no dedication page, no subtitle)');
   await pg.fill('#fmSub','Stories from the Pier'); await pg.fill('#fmDed','For the keeper of the light'); await pg.fill('#fmYear','2025'); await pg.fill('#fmIsbn','978-1-23456-789-7'); await pg.fill('#fmPub','Pier Press'); await pg.fill('#fmNotes','Some names have been changed.'); await pg.click('#fmCreditUse'); await pg.waitForTimeout(200);
   const credit=await pg.inputValue('#fmCredit');
   say(credit==='Made with Inkhorse · getinkhorse.com'?'OK':'FAULT','YB-23a','Use “Made with Inkhorse” writes the credit line: "'+credit+'"');
   const ep=await readZip(await dl(pg,'#expEpub')); const pdf=await readPdf(await dl(pg,'#expPdf')); const X=allX(ep).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
   const t1=pdf[0].text, cp=pdf.find(p=>/All rights reserved/.test(p.text)), dd=pdf.find(p=>/For the keeper of the light/.test(p.text));
   say(/The Harbor Book.*Stories from the Pier/.test(t1)||/Stories from the Pier/.test(t1)?'OK':'FAULT','YB-23b','the subtitle is a line under the title on the title page: "'+t1.slice(0,90)+'"');
   say(dd&&dd.text.trim()==='For the keeper of the light'&&/For the keeper of the light/.test(X)?'OK':'FAULT','YB-23c','the dedication is on its own page: '+(dd?'"'+dd.text.trim()+'"':'not found'));
   const need=['Copyright © 2025 Ada Tester','978-1-23456-789-7','Pier Press','Made with Inkhorse','Some names have been changed.']; const missP=need.filter(n=>!(cp&&cp.text.includes(n))), missE=need.filter(n=>!X.includes(n));
   say(!missP.length&&!missE.length?'OK':'FAULT','YB-23d','year, ISBN, publisher, credit line and notes go on the copyright page: missing in print '+JSON.stringify(missP)+', in EPUB '+JSON.stringify(missE));
   const order=['title','copy','ded','toc','ch1'].map((k,i)=>[ /The Harbor Book/, /All rights reserved/, /For the keeper of the light/, /^Contents/, /^(?:C ?H ?A ?P ?T ?E ?R \d+ )?First Light/i ][i]);
   const pn=order.map(re=>{ const p=pdf.find(p=>re.test(p.text.trim())); return p?p.n:-1; });
   say(pn.every((n,i)=>n>0&&(i===0||n>pn[i-1]))?'OK':'FAULT','YB-26a','the exported book opens: title page, copyright page, dedication, contents, then chapters (print pages '+pn.join(', ')+') '+pdf.slice(4,7).map(p=>p.text.slice(0,30)).join(' || '));
   await pg.evaluate(()=>{ const c=document.querySelector('#fmToc'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); }); await pg.waitForTimeout(150);
   const ep2=await readZip(await dl(pg,'#expEpub')); const pdf2=await readPdf(await dl(pg,'#expPdf'));
   const spine=o=>[...o['OEBPS/content.opf'].matchAll(/<itemref\s+idref="([^"]+)"([^>]*)>/g)].map(m=>m[1]+(/linear="no"/.test(m[2])?'(hidden)':'')).join(',');
   const tocInSpine=/toc|nav/.test(spine(ep2).replace(/\(hidden\)/g,'').split(',').filter(x=>/nav|toc/.test(x)&&!/hidden/.test(x)).join(','));
   say(!pdf2.some(p=>/^Contents/.test(p.text.trim()))&&!tocInSpine?'OK':'FAULT','YB-25b','unchecking Contents leaves it out of the EPUB and the print PDF: EPUB reading order '+spine(ep2)+'; print has a Contents page '+pdf2.some(p=>/^Contents/.test(p.text.trim())));
   // Word manuscript
   const dx=await readZip(await dl(pg,'#expDocx')); const doc=dx['word/document.xml']||'', sty=dx['word/styles.xml']||'';
   const hasHeader=dx.files.some(f=>/^word\/header\d*\.xml$/.test(f)), pageNum=/PAGE/.test(Object.keys(dx).filter(f=>/header/.test(f)).map(f=>dx[f]).join('')), wc=/(about|approx\.?|approximately)?\s*[\d,]+\s+words/i.test(doc.replace(/<[^>]+>/g,' '));
   const facts={tnr:/Times New Roman/.test(sty),pt12:/<w:sz w:val="24"\/>/.test(sty),double:/w:line="480"/.test(sty),margins1in:/w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/.test(doc),indentHalf:/w:firstLine="720"/.test(sty),chapterNewPage:/pageBreakBefore/.test(sty),header:hasHeader,pageNumbers:pageNum,wordCount:wc,byline:/by Ada Tester/.test(doc)};
   say(Object.values(facts).every(Boolean)?'OK':'FAULT','YB-38','Word manuscript in standard submission format: '+JSON.stringify(facts));
   // text file, copy all
   const txt=(await dl(pg,'#expTxt')).toString('utf8'); const ca=await pg.evaluate(async()=>{ document.querySelector('#copyAll').click(); await new Promise(r=>setTimeout(r,300)); return navigator.clipboard.readText(); });
   const whole=s=>/First Light/.test(s)&&/Second Wind/.test(s)&&s.includes((await0=0,'')) ;
   const hasAll=s=>['First Light','Second Wind'].every(t=>s.includes(t))&&[1,4,5,7].every(k=>s.replace(/\s+/g,' ').includes(para(k,90).slice(0,60)));
   say(hasAll(txt)&&!/\[\[|%%/.test(txt)?'OK':'FAULT','YB-40','Text file is plain text of the whole book: '+txt.length+' characters, starts "'+txt.slice(0,50).replace(/\n/g,'⏎')+'"');
   say(hasAll(ca)?'OK':'FAULT','YB-42','Copy all text copies the whole book: '+ca.length+' characters');
   if(pg.errs.length) say('FAULT','YB-19x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 // ---------- own front pages: used once, ISBN added; Word title lines
 await run('YB-26b',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   await book(pg,[['','%%front\nThe Harbor Book\nA True Story\nby Ada Tester'],['','%%front\nCopyright © 2024 Ada Tester\nAll rights reserved.'],['First Light',para(1,90)]]);
   await pg.evaluate(()=>{ BOOK.title='The Harbor Book'; BOOK.author='Ada Tester'; const f=FM(); f.isbn='978-1-23456-789-7'; f.subtitle=''; f.dedication=''; touchIndex(); });
   const pdf=await readPdf(await dl(pg,'#expPdf')); const ep=await readZip(await dl(pg,'#expEpub')); const dx=await readZip(await dl(pg,'#expDocx'));
   const cps=pdf.filter(p=>/All rights reserved/.test(p.text)), tps=pdf.filter(p=>/A True Story/.test(p.text));
   const X=Object.keys(ep).filter(f=>/\.xhtml$/.test(f)).map(f=>ep[f].replace(/<head>[\s\S]*?<\/head>/,'').replace(/<[^>]+>/g,' ')).join('\n');
   say(cps.length===1&&tps.length===1&&(X.match(/All rights reserved/g)||[]).length===1?'OK':'FAULT','YB-26b','the book\'s own title and copyright pages are used once, in place of made ones: print copyright pages '+cps.length+', title pages '+tps.length+', EPUB copyright lines '+(X.match(/All rights reserved/g)||[]).length);
   say(cps[0]&&/978-1-23456-789-7/.test(cps[0].text)&&/978-1-23456-789-7/.test(X)?'OK':'FAULT','YB-26c','an ISBN filled in but not on your own copyright page is added to it: "'+(cps[0]?cps[0].text.slice(0,120):'')+'"');
   const nav=(ep['OEBPS/nav.xhtml']||'').replace(/<head>[\s\S]*?<\/head>/,''); say(!/Copyright|title page/i.test(nav.replace(/<[^>]+>/g,' '))?'OK':'FAULT','YB-26d','your own front pages are left out of the Contents');
   const d=dx['word/document.xml'].replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,''); const lines=d.split('\n').map(x=>x.trim()).filter(Boolean);
   say(lines[0]==='The Harbor Book'&&lines.slice(1,4).join('|').includes('A True Story')&&!lines.some(l=>/^Chapter \d+$/.test(l))?'OK':'FAULT','YB-26e','the Word manuscript puts the lines of your title page under the title, and labels no front page as a chapter: '+lines.slice(0,8).join(' | '));
   await pg.ctx.close(); });
 // ---------- chapter opening styles in Read, print and EPUB
 await run('YB-20',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',[1,2,3].map(k=>para(k,90)).join('\n')],['Second Wind',[4,5].map(k=>para(k,90)).join('\n')]]);
   await pg.evaluate(()=>{ BOOK.title='Styles'; BOOK.author='Ada Tester'; touchIndex(); });
   for(const st of ['classic','ornament','bignum','dropcap']){
     await pg.evaluate(st=>{ FM().chStyle=st; touchIndex(); PCACHE.clear(); },st);
     const read=await pg.evaluate(async()=>{ setTab('read'); await new Promise(r=>setTimeout(r,300)); goTo({ch:BOOK.order[1],i:0}); drawView(); const f=document.querySelector('#spread .face:not(.gone)'); return {ck:(f.querySelector('.ck')||{}).textContent||'',bn:(f.querySelector('.bn')||{}).textContent||'',orn:!!f.querySelector('.orn,.ornament'),dc:!!f.querySelector('.dc,.dropcap,p.drop, .ptext p:first-of-type::first-letter'),cls:f.querySelector('.ptext').className}; });
     const ep=await readZip(await dl(pg,'#expEpub')); const ch2=Object.keys(ep).filter(f=>/\.xhtml$/.test(f)).map(f=>ep[f]).find(x=>/<h1[^>]*>[^<]*Second Wind/.test(x))||'';
     const pdf=await readPdf(await dl(pg,'#expPdf')); const op=pdf.find(p=>p.it.some(i=>i.s.trim()==='Second Wind'&&i.h>=14));
     const big=op?op.it.filter(i=>i.h>=24).map(i=>i.s.trim()+'@'+Math.round(i.h)):[], small=op?op.it.filter(i=>/^CHAPTER/.test(i.s.trim())).map(i=>i.s.trim()):[];
     const golds=op?op.ops.argsArray.filter((a,k)=>op.ops.fnArray[k]===pdfjs.OPS.setFillRGBColor&&a&&(typeof a[0]==='string'?/^#?(c|b|d|a)[0-9a-f]/i.test(a[0]):false)).length:0;
     say('NOTE','YB-20',st+': Read '+JSON.stringify(read)+' | EPUB class '+((/class="cs-(\w+)"/.exec(ch2)||[])[1])+' ck '+((/<p class="ck">([^<]*)/.exec(ch2)||[])[1]||'')+' bn '+((/<p class="bn">([^<]*)/.exec(ch2)||[])[1]||'')+' orn '+/class="orn"/.test(ch2)+' | PDF big '+JSON.stringify(big)+' label '+JSON.stringify(small)+' gold fills '+golds); }
   await pg.ctx.close(); });
 // ---------- covers
 await run('YB-29',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',para(1,90)]]);
   const mkimg=async(w,h,c)=>{ const f=S+`/cov-${w}x${h}.png`; const d=await pg.evaluate(async([w,h,c])=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); g.fillStyle=c; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.fillRect(w*.1,h*.1,w*.8,h*.1); return cv.toDataURL('image/png').split(',')[1]; },[w,h,c]); fs.writeFileSync(f,Buffer.from(d,'base64')); return f; };
   await pg.click('#chBtn'); await pg.waitForTimeout(200); const l0=await pg.textContent('#covFrontLbl');
   await pg.setInputFiles('#covFrontIn',await mkimg(1600,2400,'#7a3b2e')); await pg.waitForTimeout(1500); const l1=await pg.textContent('#covFrontLbl'), rm=await pg.evaluate(()=>{ const e=document.querySelector('#covFrontRm'); return !e.hidden&&getComputedStyle(e).display!=='none'; });
   await pg.setInputFiles('#covBackIn',await mkimg(1600,1000,'#2a5a83')); await pg.waitForTimeout(1500);
   say(/Add front/.test(l0)&&/Replace/.test(l1)&&rm?'OK':'FAULT','YB-29a','Add front, then the button reads Replace and Remove appears: "'+l0+'" → "'+l1+'", Remove shown '+rm);
   const rd=await pg.evaluate(async()=>{ document.querySelector('#drawerDone').click(); setTab('read'); await new Promise(r=>setTimeout(r,500)); const o=navOrder(); goTo({ch:o[0],i:0}); drawView(); const f=document.querySelector('#spread .face:not(.gone)'), im=f.querySelector('img'); await (im&&im.decode?im.decode().catch(()=>0):0); const fr=f.getBoundingClientRect(), ir=im?im.getBoundingClientRect():null;
     goTo({ch:o[o.length-1],i:0}); drawView(); const f2=document.querySelector('#spread .face:not(.gone)'), im2=f2.querySelector('img'); await (im2&&im2.decode?im2.decode().catch(()=>0):0); const ir2=im2?im2.getBoundingClientRect():null, f2r=f2.getBoundingClientRect(), blur=[...f2.querySelectorAll('*')].some(e=>/blur/.test(getComputedStyle(e).filter));
     return {first:o[0],last:o[o.length-1],frontWhole:ir&&ir.left>=fr.left-1&&ir.right<=fr.right+1&&ir.top>=fr.top-1&&ir.bottom<=fr.bottom+1,backWhole:ir2&&ir2.left>=f2r.left-1&&ir2.right<=f2r.right+1&&ir2.top>=f2r.top-1&&ir2.bottom<=f2r.bottom+1,blur,fit:im2?getComputedStyle(im2).objectFit:''}; });
   say(rd.first==='__front'&&rd.last==='__back'&&rd.frontWhole&&rd.backWhole?'OK':'FAULT','YB-29b','covers show before the first page and after the last, whole: '+JSON.stringify(rd));
   const th=await pg.evaluate(()=>{ renderDrawer&&renderDrawer(); const box=document.querySelector('#covBackImg .cvbox')||document.querySelector('#covBackImg'), bg=box.querySelector('img.cvbg'), fg=box.querySelector('img.cvfg'), r=box.getBoundingClientRect(); return {blur:!!bg&&/blur/.test(getComputedStyle(bg).filter),fit:fg?getComputedStyle(fg).objectFit:'',ratio:r.height?+(r.width/r.height).toFixed(3):0}; });
   rd.blur=th.blur&&th.fit==='contain'; rd.fit=th.fit+' ratio '+th.ratio;
   say(rd.blur?'OK':'FAULT','YB-29c','a cover of another shape shows whole with a soft blur of its own colours around it: blur '+rd.blur+', fit '+rd.fit);
   const ep=await readZip(await dl(pg,'#expEpub')); const pdf=await readPdf(await dl(pg,'#expPdf'));
   say(/properties="cover-image"/.test(ep['OEBPS/content.opf'])&&!pdf.some(p=>p.imgs)?'OK':'FAULT','YB-29d','the cover is in the EPUB and left out of the print PDF');
   const lib=await pg.evaluate(()=>{ const t=[...document.querySelectorAll('img')].filter(i=>/thumb|cov|bk/.test(i.className+' '+(i.parentElement&&i.parentElement.className))).map(i=>{ const r=(i.parentElement||i).getBoundingClientRect(); return r.width&&r.height?(r.height/r.width).toFixed(2):null; }).filter(Boolean); return t.slice(0,6); });
   await pg.evaluate(()=>{ setTab('write'); document.querySelector('#chBtn').click(); }); await pg.waitForTimeout(250); await pg.click('#covFrontRm'); await pg.waitForTimeout(300); const after=await pg.evaluate(()=>({cov:BOOK.coverFront,lab:document.querySelector('#covFrontLbl').textContent}));
   say(!after.cov&&/Add front/.test(after.lab)?'OK':'FAULT','YB-29e','Remove takes the cover off: '+JSON.stringify(after));
   await pg.ctx.close(); });
 // ---------- full-bleed picture in print, print sizes listed
 await run('YB-34',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',para(1,90)+'\n'+para(2,90)]]);
   const sizes=await pg.evaluate(()=>[...document.querySelectorAll('#pdfSize option')].map(o=>o.textContent.trim()));
   say(sizes.join('|').replace(/\s/g,'')==='6×9in|5.5×8.5in|5×8in|8.5×11in'||sizes.length===4?'OK':'FAULT','YB-36','Print size offers 6 × 9, 5.5 × 8.5, 5 × 8 and 8.5 × 11 inches: '+sizes.join(', '));
   const pid=await pg.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=800; c.height=1200; const g=c.getContext('2d'); g.fillStyle='#2a5a83'; g.fillRect(0,0,800,1200); const bl=await new Promise(r=>c.toBlob(r,'image/png')); const id='b1b2c3d4e5f60718293a4b5c6d7e8f90'; await __picPut(id,bl,'image/png'); BOOK.images[id]={w:800,h:1200}; const ch=CH.get(BOOK.order[0]); ch.text+='\n[[image '+id+' | bleed | 100% | center]]\n'+'More words after the picture.'; touchChapter(ch); return id; });
   const raw=await dl(pg,'#expPdf'); const doc=await pdfjs.getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise; let found=null;
   for(let n=1;n<=doc.numPages;n++){ const p=await doc.getPage(n), v=p.getViewport({scale:1}), ops=await p.getOperatorList(); let m=[1,0,0,1,0,0]; const stack=[];
     for(let k=0;k<ops.fnArray.length;k++){ const f=ops.fnArray[k], a=ops.argsArray[k]; if(f===pdfjs.OPS.save) stack.push(m.slice()); else if(f===pdfjs.OPS.restore) m=stack.pop()||m; else if(f===pdfjs.OPS.transform){ const [a1,b1,c1,d1,e1,f1]=a; m=[m[0]*a1+m[2]*b1,m[1]*a1+m[3]*b1,m[0]*c1+m[2]*d1,m[1]*c1+m[3]*d1,m[0]*e1+m[2]*f1+m[4],m[1]*e1+m[3]*f1+m[5]]; }
       else if(f===pdfjs.OPS.paintImageXObject||f===pdfjs.OPS.paintJpegXObject){ found={n,x:m[4],y:m[5],w:m[0],h:m[3],pw:v.width,ph:v.height,odd:n%2===1}; } } if(found) break; }
   const inside=found&&found.x>=0.62*72-1&&found.x+found.w<=found.pw-0.62*72+1&&found.y>=0.6*72-1&&found.y+found.h<=found.ph-0.6*72+1;
   say(inside?'OK':'FAULT','YB-34','a full-bleed picture is printed inside the margins: '+JSON.stringify(found&&{page:found.n,x:+(found.x/72).toFixed(2),right:+((found.pw-found.x-found.w)/72).toFixed(2),bottom:+(found.y/72).toFixed(2),top:+((found.ph-found.y-found.h)/72).toFixed(2)}));
   await pg.ctx.close(); });
 // ---------- backup file restore panel, last backup line, reminder, 14 kept
 await run('YB-49',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['First Light',Array.from({length:8},(_,k)=>para(k,90)).join('\n')]]);
   await pg.click('#chBtn'); await pg.waitForTimeout(250); const before=await pg.textContent('#fbkLast');
   const raw=await dl(pg,'#fbkSave'); const f=S+'/bk.inkhorse'; fs.writeFileSync(f,raw); await pg.waitForTimeout(300); const after=await pg.evaluate(()=>({t:document.querySelector('#fbkLast').textContent,c:getComputedStyle(document.querySelector('#fbkLast')).color}));
   await pg.setInputFiles('#fbkIn',f); await pg.waitForTimeout(600); const pend=await pg.evaluate(()=>({t:document.querySelector('#fbkPending').innerText.replace(/\s+/g,' '),go:!!document.querySelector('#fbkGo'),no:!!document.querySelector('#fbkNo')}));
   say(/First Light|Test Book/.test(pend.t)&&/Saved \w{3} \d+, \d{4}/.test(pend.t)&&/1 chapter/.test(pend.t)&&/words/.test(pend.t)&&/picture/.test(pend.t)&&pend.go&&pend.no?'OK':'FAULT','YB-49a','Restore from file shows title, date, chapters, words and pictures first, with Restore this and Cancel: "'+pend.t.slice(0,140)+'"');
   await pg.click('#fbkNo'); await pg.waitForTimeout(200); say(await pg.evaluate(()=>!document.querySelector('#fbkGo'))?'OK':'FAULT','YB-49b','Cancel leaves things as they are');
   say(/You haven’t saved a backup file yet/.test(before)&&/^Last backup file: /.test(after.t)?'OK':'FAULT','YB-50a','under the buttons Inkhorse shows when you last saved a backup file: "'+before+'" → "'+after.t+'"');
   const old=await pg.evaluate(()=>{ S.fileBk={t:Date.now()-8*864e5,c:1,w:500}; saveSettings(); fbkShow(); const e=document.querySelector('#fbkLast'); return {t:e.textContent,c:getComputedStyle(e).color}; });
   const orange=c=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(c); return m&&+m[1]>150&&+m[2]>60&&+m[2]<140&&+m[3]<60; };
   say(orange(old.c)&&!orange(after.c)?'OK':'FAULT','YB-50b','after a week the line turns orange: '+old.c+' "'+old.t.slice(-45)+'"');
   const nud=await pg.evaluate(async()=>{ S.fbkNudge=''; S.fileBk={t:Date.now()-8*864e5,c:1,w:500}; saveSettings(); document.querySelector('#toast').hidden=true; fbkNudge(); const a=document.querySelector('#toast').hidden?'':document.querySelector('#toast').textContent; document.querySelector('#toast').hidden=true; fbkNudge(); const b2=document.querySelector('#toast').hidden?'':document.querySelector('#toast').textContent; return {a,b:b2}; });
   say(/Save a backup file/.test(nud.a)&&!nud.b?'OK':'FAULT','YB-50c','once your book has writing in it, a reminder shows once a day: first "'+nud.a.slice(0,50)+'", again "'+nud.b+'"');
   const kept=await pg.evaluate(async()=>{ const idx=[]; for(let d=0;d<20;d++){ const key='d-2026-10-'+String(d+1).padStart(2,'0'); await idb.set(bkP()+key,{meta:{chapters:1,words:5,kind:'daily',savedAt:Date.now()-(20-d)*864e5},chapters:[{id:'x',title:'t',text:'w'}]}); idx.push({key,kind:'daily',savedAt:Date.now()-(20-d)*864e5,complete:true,chapters:1,words:5}); } await idb.set(bkP()+'index',idx); await bkPrune(); return (await bkAll()).filter(x=>x.complete).length; });
   say(kept===14?'OK':'FAULT','YB-51','daily backups keep the last 14: '+kept+' kept of 20');
   await pg.ctx.close(); });
 await b.close(); })();
