const {chromium,say,mk,book,para,toastText,vis,toolsOpen,fs,S,REPO}=require('./common.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch();
 const run=async(id,fn)=>{ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,220)); } };
 // ---------- BP-00 built-in books: delete and put back
 await run('BP-00',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   for(const [id,label,attr] of [['manual','Put the manual back','data-manual'],['standard','Put the Formatting Standard back','data-std'],['publishing','Put the Publishing Standard back','data-pub']]){
     await pg.evaluate(()=>{ setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(400);
     await pg.click(`[data-ldel="${id}"]`); await pg.waitForTimeout(150); await pg.click(`[data-ldel="${id}"]`); await pg.waitForTimeout(500);
     const gone=await pg.evaluate(id=>!LIB.some(x=>x.id===id),id); const btn=await pg.evaluate(a=>{ const e=document.querySelector('['+a+']'); return e?e.textContent.trim():''; },attr);
     if(!gone||btn!==label){ say('FAULT','BP-00c',id+': deleted '+gone+', button "'+btn+'"'); continue; }
     await pg.click('['+attr+']'); await pg.waitForTimeout(800); const back=await pg.evaluate(id=>LIB.some(x=>x.id===id),id); say(back?'OK':'FAULT','BP-00c',id+': Delete, then "'+label+'" brings it back');
   } await pg.ctx.close(); });
 // ---------- BP-01/02 contents of the manual: every chapter and every section, real page numbers, foot = counter
 await run('BP-01',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max');
   const r=await pg.evaluate(async()=>{ S.fs=18; applyType(); relayout(); await openLibBook('manual',true); setTab('read'); await new Promise(r=>setTimeout(r,300));
     goTo({ch:rOrder().find(x=>!isCover(x)),i:0}); drawView(); refreshReader(); for(let k=0;k<300&&bookPageInfo().est;k++) await new Promise(r=>setTimeout(r,100));
     const ids=rOrder().filter(x=>!isCover(x)), T=x=>RB.ch.get(x).title, want=[];
     for(const id of ids){ if(isFront(id)||/^Contents$/.test(T(id))) continue; want.push({t:T(id),kind:'chapter',id,word:0}); const doc=pag(id).doc; doc.paras.forEach(P=>{ if(P.h&&doc.words.slice(P.start,P.end).map(w=>w.v).join(' ')!==T(id)) want.push({t:doc.words.slice(P.start,P.end).map(w=>w.v).join(' '),kind:'section',id,word:P.start}); }); }
     const cid=ids.find(x=>/^Contents$/.test(T(x))), ents=[]; const n=pag(cid).pages.length;
     for(let i=0;i<n;i++){ goTo({ch:cid,i}); drawView(); document.querySelectorAll('#spread .face:not(.gone) p.toc').forEach(e=>ents.push({t:(e.querySelector('.tt')||e).textContent.replace(/[­⁠]/g,'').replace(/\s+/g,' ').trim(),n:(e.querySelector('.tn')||{}).textContent||''})); }
     const pageOf=(id,word)=>{ const P=pag(id).pages; let i=P.findIndex(p=>word>=p[0]&&word<p[1]); if(i<0) i=0; goTo({ch:id,i}); drawView(); refreshReader(); return document.querySelector('#pgCur').textContent.trim(); };
     const miss=[], wrong=[]; for(const w of want){ const e=ents.find(x=>x.t===w.t)||ents.find(x=>x.t.replace(/[’‘]/g,"'")===w.t.replace(/[’‘]/g,"'"))||ents.find(x=>x.t.replace(/^(?:Chapter )?\d+ · /,'')===w.t); if(!e){ miss.push(w.kind+': '+w.t); continue; } const real=pageOf(w.id,w.word); if(e.n!==real) wrong.push(w.t+' says '+e.n+', starts on '+real); }
     let footBad=0, checked=0; for(const id of ids.slice(0,6)){ const k=pag(id).pages.length; for(let i=0;i<k;i++){ goTo({ch:id,i}); drawView(); refreshReader(); const f=(document.querySelector('#spread .face:not(.gone) .folio')||{}).textContent||'', c=document.querySelector('#pgCur').textContent.trim(); if(f){ checked++; if(f.trim()!==c) footBad++; } } }
     return {want:want.length,ents:ents.length,miss,wrong:wrong.slice(0,5),nwrong:wrong.length,footBad,checked}; });
   say(r.miss.length?'FAULT':'OK','BP-01a','Contents lists every chapter and section: '+r.want+' wanted, '+r.ents+' entries'+(r.miss.length?'; missing '+r.miss.slice(0,4).join(' | '):''));
   say(r.nwrong?'FAULT':'OK','BP-01b','each entry gives the page it starts on'+(r.nwrong?': '+r.nwrong+' wrong, e.g. '+r.wrong.join(' | '):''));
   say(r.footBad||!r.checked?'FAULT':'OK','BP-02','page foot = number under the book on '+r.checked+' pages'+(r.footBad?', '+r.footBad+' differ':''));
   await pg.ctx.close(); });
 // ---------- BP-04 tabs, column, spread
 await run('BP-04',async()=>{ const pg=await mk(b,{viewport:{width:1440,height:900},deviceScaleFactor:1});
   await book(pg,[['One',[1,2,3,4,5,6,7,8].map(k=>para(k,90)).join('\n')]]);
   const r=await pg.evaluate(async()=>{ const tabs=[...document.querySelectorAll('nav.tabs button')].map(x=>x.textContent.trim()); setTab('write'); await new Promise(r=>setTimeout(r,300)); const ta=document.querySelector('#manuscript'), cs=getComputedStyle(ta), w=ta.getBoundingClientRect().width;
     const cv=document.createElement('canvas').getContext('2d'); cv.font=`${cs.fontSize} ${cs.fontFamily}`; const chars=Math.round((w-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))/cv.measureText('n').width);
     setTab('read'); await new Promise(r=>setTimeout(r,500)); const faces=document.querySelectorAll('#spread .face:not(.gone)').length; return {tabs,w:Math.round(w),chars,faces,win:innerWidth}; });
   say(r.tabs.join(',')==='Write,Read,Compare'?'OK':'FAULT','BP-04a','three tabs: '+r.tabs.join(', '));
   say(r.chars<=95?'OK':'FAULT','BP-04b','on a computer the writing sits in a comfortable column: '+r.w+' px wide, about '+r.chars+' characters a line (window '+r.win+')');
   say(r.faces===2?'OK':'FAULT','BP-04c','Read shows a two-page spread on a big screen: '+r.faces+' pages showing');
   await pg.ctx.close(); });
 // ---------- BP-12 save dot
 await run('BP-12',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','Hello there.']]); await pg.waitForTimeout(600);
   const r=await pg.evaluate(()=>{ const s=document.querySelector('#status'), t=document.querySelector('#statusText'), tb=document.querySelector('#toolsBtn'); const sr=s.getBoundingClientRect(), br=tb.getBoundingClientRect(), tcs=getComputedStyle(t), dot=getComputedStyle(s,'::before');
     const tv=t.getBoundingClientRect().width>2&&tcs.display!=='none'&&tcs.visibility!=='hidden'&&tcs.opacity!=='0'&&!/rect\(0/.test(tcs.clip);
     const col=[dot.backgroundColor,getComputedStyle(s).color,getComputedStyle(s.querySelector('i,.dot')||s).backgroundColor]; return {s:s.dataset.s,near:Math.abs((sr.top+sr.bottom)/2-(br.top+br.bottom)/2)<20&&Math.abs(sr.right-br.left)<120,textVisible:tv,col}; });
   await pg.click('#status'); await pg.waitForTimeout(200); const tt=await toastText(pg);
   say(r.near?'OK':'FAULT','BP-12a','the save dot sits next to Tools in Write\'s top row');
   say(!r.textVisible?'OK':'FAULT','BP-12b','on a phone only the dot shows'+(r.textVisible?' (the words show too)':''));
   const gray=c=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(c||''); if(!m) return false; const [x,y,z]=[+m[1],+m[2],+m[3]]; return Math.max(x,y,z)-Math.min(x,y,z)<30 && x>60 && x<200; };
   say(r.s==='local'&&r.col.some(gray)?'OK':'FAULT','BP-12c','the dot is gray when saved on this device only: state '+r.s+', colours '+r.col.join(' / '));
   say(/^Gray: Saved on this device only/.test(tt)?'OK':'FAULT','BP-12d','tapping the dot explains it: "'+tt+'"');
   await pg.ctx.close(); });
 // ---------- BP-16 Chapters button label
 await run('BP-16',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['','%%front\nCopyright © 2026 Ada'],['First Light','One two.'],['Second Wind','Three four.']]);
   const labs=await pg.evaluate(async()=>{ const o=[]; for(const id of BOOK.order){ selectChapter(id); await new Promise(r=>setTimeout(r,80)); o.push(document.querySelector('#chBtnLabel').textContent); } return o; });
   say(/^Ch 1 of 2/.test(labs[1])&&/^Ch 2 of 2/.test(labs[2])&&!/Ch \d/.test(labs[0])&&labs[0].trim()?'OK':'FAULT','BP-16a','Chapters shows "Ch 1 of 2", a front page shows its name: '+labs.join(' | '));
   await pg.click('#chBtn'); await pg.waitForTimeout(400);
   const parts=await pg.evaluate(()=>['#bookTitle','#fmSub','#covFrontLbl','#chList','#expEpub','#bkNow','#fbkSave'].map(s=>{ const e=document.querySelector(s); return s+':'+(!!e&&!!e.closest('#drawer')); }));
   say(parts.every(p=>/true$/.test(p))&&!(await pg.evaluate(()=>document.querySelector('#drawer').hidden))?'OK':'FAULT','BP-16b','tapping it opens the Chapters panel with title, front pages, covers, chapter list, export and backups: '+parts.join(' '));
   await pg.ctx.close(); });
 // ---------- BP-18 Tools panel
 await run('BP-18',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',para(1,40)+'\n'+para(2,40)]]);
   await pg.click('#toolsBtn'); await pg.waitForTimeout(200);
   const names=await pg.evaluate(()=>[...document.querySelectorAll('#wTools .tool')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()));
   const want=['Dictate','Hoofprint','Word count','Focus','Picture','Import','Paste','Copy','Top of chapter'];
   const miss=want.filter(w=>!names.some(n=>n===w||n.startsWith(w))); say(miss.length?'FAULT':'OK','BP-18a','the Tools panel holds '+want.join(', ')+(miss.length?'; missing: '+miss.join(', '):'')+'  [shown: '+names.join(', ')+']');
   say(names.some(n=>/Side by side/.test(n))?'FAULT':'OK','BP-18b','Side by side is not offered on a phone');
   say(names.some(n=>/Spelling/.test(n))?'NOTE':'OK','BP-18c','Spelling '+(names.some(n=>/Spelling/.test(n))?'IS shown here, though the manual\'s Tools list does not name it':'is not shown'));
   const closes={};
   for(const [id,label] of [['#copyBtn','Copy'],['#pgTop','Top of chapter'],['#focusBtn','Focus'],['#hpBtn','Hoofprint'],['#pasteBtn','Paste'],['#micBtn','Dictate']]){ await pg.evaluate(()=>{ setTools(true); }); await pg.waitForTimeout(100); await pg.click(id); await pg.waitForTimeout(250); closes[label]=!(await toolsOpen(pg));
     await pg.evaluate(()=>{ try{ if(focusOn) setFocus(false); }catch(_){ } const h=document.querySelector('#hpPanel'); if(h&&!h.hidden) document.querySelector('#hpDone').click(); try{ micStop&&micStop(); }catch(_){ } }); await pg.waitForTimeout(150); }
   for(const [lab,sel] of [['Picture','#picIn'],['Import','#fileIn']]){ await pg.evaluate(()=>setTools(true)); await pg.waitForTimeout(100); const [fc]=await Promise.all([pg.waitForEvent('filechooser',{timeout:3000}).catch(()=>null), pg.click(`#wTools label[for="${sel.slice(1)}"]`).catch(()=>null)]); await pg.waitForTimeout(250); closes[lab]=!(await toolsOpen(pg))+(fc?'':' (no file chooser)'); }
   const notClosed=Object.entries(closes).filter(([,v])=>String(v)!=='true'); say(notClosed.length?'FAULT':'OK','BP-18d','using a tool closes the panel: '+Object.entries(closes).map(([k,v])=>k+'='+v).join(', '));
   await pg.evaluate(()=>setTools(true)); await pg.click('#wcBtn'); await pg.waitForTimeout(200); const wcOpen=await toolsOpen(pg); await pg.click('#wToolsDone'); await pg.waitForTimeout(200);
   say(wcOpen&&!(await toolsOpen(pg))?'OK':'FAULT','BP-18e','Word count leaves the panel open; Done closes it');
   await pg.ctx.close(); });
 // ---------- BP-23 page bar
 await run('BP-23',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',Array.from({length:30},(_,k)=>para(k,80)).join('\n')],['Empty','']]);
   const r=await pg.evaluate(async()=>{ const o={}; const n=+document.querySelector('#pgOfW').textContent.replace(/\D+/g,''); o.n=n; o.label=document.querySelector('#pgOfW').textContent;
     const set=v=>{ const i=document.querySelector('#pgNum'); i.value=v; i.dispatchEvent(new Event('change',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
     set(3); await new Promise(r=>setTimeout(r,300)); o.after3=+document.querySelector('#pgNum').value; const p3=writePageIndex(); o.idx3=p3.k||p3.i||p3.cur||JSON.stringify(p3);
     document.querySelector('#pgNext').click(); await new Promise(r=>setTimeout(r,250)); o.next=+document.querySelector('#pgNum').value;
     document.querySelector('#pgPrev').click(); await new Promise(r=>setTimeout(r,250)); o.prev=+document.querySelector('#pgNum').value;
     document.querySelector('#pgResume').click(); await new Promise(r=>setTimeout(r,300)); const ta=document.querySelector('#manuscript'); o.resumeAt=ta.selectionStart===ta.value.length&&document.activeElement===ta; o.resumePage=+document.querySelector('#pgNum').value;
     setTools(true); document.querySelector('#pgTop').click(); await new Promise(r=>setTimeout(r,300)); o.top=ta.selectionStart===0; o.topPage=+document.querySelector('#pgNum').value;
     selectChapter(BOOK.order[1]); await new Promise(r=>setTimeout(r,200)); setTools(true); let err=''; try{ document.querySelector('#pgTop').click(); }catch(e){ err=e.message; } await new Promise(r=>setTimeout(r,200)); o.emptyTop=!err; return o; });
   say(r.n>=3&&/of \d+/.test(r.label)?'OK':'FAULT','BP-23a','the page bar shows the page of the chapter and how many: "'+r.label+'"');
   say(r.after3===3?'OK':'FAULT','BP-23b','typing a page number jumps there: typed 3, now on '+r.after3);
   say(r.next===4&&r.prev===3?'OK':'FAULT','BP-23c','‹ › step one page: '+r.after3+' → '+r.next+' → '+r.prev);
   say(r.resumeAt&&r.resumePage===r.n?'OK':'FAULT','BP-25','Resume goes to the very end with the cursor ready: cursor at end '+r.resumeAt+', page '+r.resumePage+' of '+r.n);
   say(r.top&&r.topPage===1?'OK':'FAULT','BP-27a','Top of chapter jumps to the first line: '+r.top+', page '+r.topPage);
   say(r.emptyTop?'OK':'FAULT','BP-27b','on an empty chapter Top of chapter does nothing (no error)');
   if(pg.errs.length) say('FAULT','BP-23x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 // ---------- BP-30 undo paste / dictation, BP-32 find
 await run('BP-30',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','Start here.']]);
   await pg.evaluate(()=>navigator.clipboard.writeText(' Pasted words go in.')); await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); setTools(true); });
   await pg.click('#pasteBtn'); await pg.waitForTimeout(400); const afterPaste=await pg.inputValue('#manuscript'); const pt=await toastText(pg);
   await pg.click('#undoBtn'); await pg.waitForTimeout(250); const undone=await pg.inputValue('#manuscript'); await pg.click('#redoBtn'); await pg.waitForTimeout(250); const redone=await pg.inputValue('#manuscript');
   say(afterPaste==='Start here. Pasted words go in.'?'OK':'FAULT','BP-54a','Paste puts copied text at the cursor: "'+afterPaste+'"');
   say(/4 words/.test(pt)?'OK':'FAULT','BP-54b','Paste says how many words: "'+pt+'"');
   say(undone==='Start here.'&&redone===afterPaste?'OK':'FAULT','BP-30a','Undo takes back a paste, Redo puts it back: "'+undone+'" / "'+redone+'"');
   await pg.evaluate(()=>{ window.__sr.said=['and then we walked home']; const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); setTools(true); }); await pg.click('#micBtn'); await pg.waitForTimeout(900); await pg.evaluate(()=>{ try{ if(typeof micStop==='function') micStop(); }catch(_){ } }); await pg.waitForTimeout(400);
   const dict=await pg.inputValue('#manuscript'); await pg.click('#undoBtn'); await pg.waitForTimeout(250); const und2=await pg.inputValue('#manuscript');
   say(/walked home/.test(dict)&&!/walked home/.test(und2)?'OK':'FAULT','BP-30b','Undo takes back a dictated run: "'+dict+'" → "'+und2+'"');
   await book(pg,[['One','A cat sat. The cat ran. One more cat here.']]); await pg.click('#findBtn'); await pg.fill('#findIn','cat'); await pg.waitForTimeout(300); const n1=await pg.textContent('#findN'); await pg.click('#findNext'); await pg.waitForTimeout(150); const n2=await pg.textContent('#findN'); await pg.click('#findPrev'); await pg.waitForTimeout(150); const n3=await pg.textContent('#findN'); await pg.click('#findClose'); await pg.waitForTimeout(150); const hid=await pg.evaluate(()=>document.querySelector('#findbar').hidden);
   say(/of 3/.test(n1)&&/1 of 3/.test(n2)&&/3 of 3/.test(n3)&&hid?'OK':'FAULT','BP-32','Find: count and ‹ › through each match, × closes: "'+n1+'" → "'+n2+'" → "'+n3+'", closed '+hid);
   await pg.ctx.close(); });
 // ---------- BP-35 next mark
 await run('BP-35',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','First sentence here. Second sentence there. Third one too.'],['Two','Another chapter sentence.']]);
   const v0=await vis(pg,'#marksBtn2'); await pg.evaluate(()=>{ addMark(BOOK.order[0],0,3); addMark(BOOK.order[0],6,9); marksUI(); }); await pg.waitForTimeout(200);
   const r=await pg.evaluate(()=>{ const m=document.querySelector('#marksBtn2'), bar=document.querySelector('#pagebar'); const mr=m.getBoundingClientRect(), br=bar.getBoundingClientRect(); const kids=[...bar.querySelectorAll('button,input,span')].filter(x=>x.offsetParent&&x!==m&&!m.contains(x)); const rightmost=Math.max(...kids.map(k=>k.getBoundingClientRect().right));
     return {n:document.querySelector('#marksN2').textContent,atRight:mr.right>=rightmost-1,inBar:mr.right<=br.right+1}; });
   await pg.evaluate(()=>setTools(true)); await pg.click('#marksBtn2'); await pg.waitForTimeout(250); const toolsClosed=!(await toolsOpen(pg)); const sel1=await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); return ta.value.slice(ta.selectionStart,ta.selectionEnd)||ta.value.slice(ta.selectionStart,ta.selectionStart+20); });
   await pg.click('#marksBtn2'); await pg.waitForTimeout(250); await pg.click('#marksBtn2'); await pg.waitForTimeout(250); const last=await toastText(pg);
   await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.focus(); ta.value=ta.value.replace('First sentence here.','A new opening line.'); ta.dispatchEvent(new Event('input',{bubbles:true})); }); await pg.waitForTimeout(700); const n2=await pg.textContent('#marksN2');
   say(!v0?'OK':'FAULT','BP-35a','Next mark is hidden when there are no marks');
   say(r.n==='2'&&r.atRight&&r.inBar?'OK':'FAULT','BP-35b','with marks it shows at the right end of the bar with the count: '+JSON.stringify(r));
   say(toolsClosed&&/First sentence/.test(sel1)?'OK':'FAULT','BP-35c','a tap closes Tools and jumps to the marked sentence: tools closed '+toolsClosed+', at "'+sel1+'"');
   say(/That was the last mark/.test(last)?'OK':'FAULT','BP-35d','after the last mark: "'+last+'"');
   say(n2==='1'?'OK':'FAULT','BP-35e','retyping a marked sentence clears its mark: count now '+n2);
   await pg.ctx.close(); });
 await b.close(); })();
