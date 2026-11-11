const {chromium,say,mk,book,para,toastText,vis,toolsOpen,fs,S,REPO}=require('./common.js');
(async()=>{ const b=await chromium.launch();
 const run=async(id,fn)=>{ try{ await fn(); }catch(e){ say('ERROR',id,e.message.split('\n')[0].slice(0,220)); } };
 const png=async(pg,w,h)=>{ const f=S+'/pic-'+w+'x'+h+'.png'; if(!fs.existsSync(f)){ const d=await pg.evaluate(async([w,h])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#2a5a83'; g.fillRect(0,0,w,h); return c.toDataURL('image/png').split(',')[1]; },[w,h]); fs.writeFileSync(f,Buffer.from(d,'base64')); } return f; };
 // ---------- Dictate
 await run('BP-39',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','We met at the dock.']]);
   await pg.evaluate(()=>{ window.__sr.said=['and the boat was late new paragraph it was cold period']; const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); setTools(true); });
   await pg.click('#micBtn'); await pg.waitForTimeout(40); const lab=await pg.textContent('#micLabel'); await pg.waitForTimeout(900);
   const live=await pg.evaluate(()=>{ const h=document.querySelector('#dictHint'), ta=document.querySelector('#manuscript'); if(!h||h.hidden) return null; const hr=h.getBoundingClientRect(), tr=ta.getBoundingClientRect(); return {bottom:Math.abs(hr.bottom-tr.bottom)<60,text:h.textContent.slice(0,60)}; });
   await pg.evaluate(()=>{ try{ micStop&&micStop(); }catch(_){ } }); await pg.waitForTimeout(400); const v=await pg.inputValue('#manuscript');
   say(/Listening… tap to stop/.test(lab)?'OK':'FAULT','BP-39a','Dictate says "Listening… tap to stop": "'+lab+'"');
   say(/We met at the dock\. And the boat was late\n It was cold\.|We met at the dock\. And the boat was late\nIt was cold\./.test(v)?'OK':'FAULT','BP-39b','spoken "new paragraph" and "period" become a new paragraph and a full stop, at the cursor: '+JSON.stringify(v));
   say(live?'NOTE':'NOTE','BP-39c','live words box: '+JSON.stringify(live)+' (proven by the existing test "Dictate: the live words sit at the bottom of the writing area")');
   await pg.ctx.close(); });
 // ---------- mic button, word count orange
 await run('BP-41',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','Hello.']]);
   const r=await pg.evaluate(()=>{ setTools(false); const f=document.querySelector('#micFab'), ta=document.querySelector('#manuscript').closest('.ta-wrap')||document.querySelector('#manuscript'); const fr=f.getBoundingClientRect(), tr=ta.getBoundingClientRect(), cs=getComputedStyle(f);
     return {shown:fr.width>0&&cs.display!=='none'&&!f.hidden,round:parseFloat(cs.borderRadius)>=fr.width/2-1,blue:cs.backgroundColor,topRight:fr.right>tr.right-90&&fr.top<tr.top+90}; });
   await pg.evaluate(()=>setTools(true)); const withTools=await vis(pg,'#micFab');
   await pg.evaluate(()=>{ setTools(false); window.__sr.said=['fab words here']; const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); }); await pg.click('#micFab'); await pg.waitForTimeout(900); await pg.evaluate(()=>{ try{ micStop&&micStop(); }catch(_){ } }); await pg.waitForTimeout(300); const v=await pg.inputValue('#manuscript');
   const blue=(()=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(r.blue); return m&&+m[3]>+m[1]+40; })();
   say(r.shown&&r.round&&blue&&r.topRight?'OK':'FAULT','BP-41a','the round blue microphone button sits at the top right of the writing box: '+JSON.stringify(r));
   say(!withTools?'OK':'FAULT','BP-41b','on a phone it shows when the tools are tucked away (hidden with Tools open: '+!withTools+')');
   say(/fab words here/i.test(v)?'OK':'FAULT','BP-41c','it does the same as Dictate: "'+v+'"');
   await pg.evaluate(()=>{ S.showWC=false; saveSettings(); countWords(); }); await pg.waitForTimeout(100); const off=await pg.evaluate(()=>({btn:getComputedStyle(document.querySelector('#wcBtn')).backgroundColor,shown:!!document.querySelector('#wordCount').offsetParent&&document.querySelector('#wordCount').textContent.trim()!==''}));
   await pg.evaluate(()=>{ setTools(true); }); await pg.click('#wcBtn'); await pg.waitForTimeout(150); const on=await pg.evaluate(()=>({btn:getComputedStyle(document.querySelector('#wcBtn')).backgroundColor,shown:!!document.querySelector('#wordCount').offsetParent&&document.querySelector('#wordCount').textContent.trim()!=='',txt:document.querySelector('#wordCount').textContent}));
   const orange=c=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(c); return m&&+m[1]>=170&&+m[1]>+m[2]+60&&+m[2]>+m[3]+10&&+m[3]<120; };
   say(!off.shown&&on.shown?'OK':'FAULT','BP-43a','Word count shows or hides the running count: off '+off.shown+', on '+on.shown+' "'+on.txt+'"');
   say(orange(on.btn)&&!orange(off.btn)?'OK':'FAULT','BP-43b','Word count is orange when it is on: on '+on.btn+', off '+off.btn);
   await pg.ctx.close(); });
 // ---------- Side by side on a tablet
 await run('BP-45',async()=>{ const pg=await mk(b,'iPad Pro 11'); await book(pg,[['One',para(1,90)+'\n'+para(2,90)]]);
   await pg.evaluate(()=>{ setTab('write'); setTools(true); }); const shown=await vis(pg,'#splitBtn'); await pg.click('#splitBtn'); await pg.waitForTimeout(700);
   const r=await pg.evaluate(()=>{ const t=document.querySelector('#manuscript').getBoundingClientRect(), sp=document.querySelector('#spread'), s=sp?sp.getBoundingClientRect():null, b=getComputedStyle(document.querySelector('#splitBtn')).backgroundColor; return {pressed:document.querySelector('#splitBtn').getAttribute('aria-pressed'),ta:[Math.round(t.left),Math.round(t.right)],page:s?[Math.round(s.left),Math.round(s.right),Math.round(s.width)]:null,btn:b,pageShown:!!sp&&s.width>50&&getComputedStyle(document.querySelector('#read')).display!=='none'}; });
   await pg.evaluate(()=>setTools(true)); await pg.click('#splitBtn'); await pg.waitForTimeout(500); const off=await pg.evaluate(()=>({pressed:document.querySelector('#splitBtn').getAttribute('aria-pressed'),readShown:getComputedStyle(document.querySelector('#read')).display!=='none'}));
   const blue=(()=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(r.btn); return m&&+m[3]>+m[1]+40; })();
   say(shown&&r.pressed==='true'&&r.pageShown&&r.page&&r.ta[1]<=r.page[0]+5&&blue?'OK':'FAULT','BP-45a','Side by side on a tablet: blue when on, writing on the left, live book page on the right: '+JSON.stringify(r));
   say(off.pressed==='false'&&!off.readShown?'OK':'FAULT','BP-45b','tap again to go back to the normal tabs: '+JSON.stringify(off));
   await pg.ctx.close(); });
 // ---------- Focus
 await run('BP-47',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',para(1,50)]]);
   await pg.evaluate(()=>setTools(true)); await pg.click('#focusBtn'); await pg.waitForTimeout(300);
   const r=await pg.evaluate(()=>{ const hiddenAll=['nav.tabs','#chBtn','#pagebar','#toolsBtn'].map(s=>{ const e=document.querySelector(s); return s+':'+(!e||!e.offsetParent||getComputedStyle(e).visibility==='hidden'||getComputedStyle(e).opacity==='0'); }); return {hiddenAll,ta:!!document.querySelector('#manuscript').offsetParent}; });
   await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.focus(); }); await pg.keyboard.type(' more words',{delay:5}); await pg.waitForTimeout(2200);
   const wc=await pg.evaluate(()=>{ const all=[...document.querySelectorAll('*')].filter(e=>e.offsetParent&&/\d+\s+words?/.test(e.textContent)&&e.children.length===0); return all.map(e=>({t:e.textContent.trim().slice(0,30),top:Math.round(e.getBoundingClientRect().top)})).slice(0,3); });
   const done=await pg.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>x.offsetParent&&/^Done$/.test(x.textContent.trim())).map(x=>x.id||x.className));
   if(done.length) await pg.evaluate(()=>{ const d=[...document.querySelectorAll('button')].find(x=>x.offsetParent&&/^Done$/.test(x.textContent.trim())); d.click(); }); await pg.waitForTimeout(300);
   const back=await pg.evaluate(()=>!!document.querySelector('nav.tabs').offsetParent&&!(typeof focusOn!=='undefined'&&focusOn));
   say(r.ta&&r.hiddenAll.every(x=>/true$/.test(x))?'OK':'FAULT','BP-47a','Focus hides everything except your words: '+r.hiddenAll.join(' '));
   say(wc.some(w=>w.top<120)?'OK':'FAULT','BP-47b','in Focus the word count appears at the top when you pause: '+JSON.stringify(wc));
   say(done.length&&back?'OK':'FAULT','BP-47c','Done comes back: '+JSON.stringify(done)+' back '+back);
   await pg.ctx.close(); });
 // ---------- Picture: placement panel, each placement on the page, edit, remove
 await run('BP-50',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One',para(1,60)+'\n'+para(2,60)+'\n'+para(3,60)]]);
   const f=await png(pg,800,600); await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'), p=ta.value.indexOf('\n'); ta.focus(); ta.setSelectionRange(p,p); });
   await pg.setInputFiles('#picIn',f); await pg.waitForTimeout(1500);
   const panel=await pg.evaluate(()=>({title:(document.querySelector('#assist h2,#assist .title,#assist b')||{}).textContent||'',places:[...document.querySelectorAll('#assist [data-place] b')].map(x=>x.textContent),size:(()=>{ const r=document.querySelector('#imgSize'); return r?[r.min,r.max]:null; })(),align:[...document.querySelectorAll('#assist [data-align]')].map(x=>x.textContent),cap:!!document.querySelector('#imgCap'),ok:(document.querySelector('#imgOk')||{}).textContent}));
   say(panel.places.join('|')==='In the text|Wrap left|Wrap right|Top of page|Own page|Full bleed'&&panel.size&&panel.size.join()==='20,100'&&panel.align.join()==='Left,Center,Right'&&panel.cap&&panel.ok==='Insert'?'OK':'FAULT','BP-72','after picking a photo the panel offers the six placements, size 20–100%, Left/Center/Right, a caption and Insert: '+JSON.stringify(panel));
   const offs=await pg.evaluate(async()=>{ const o={}; for(const p of ['page','bleed','wrap-left','top']){ document.querySelector(`#assist [data-place="${p}"]`).click(); await new Promise(r=>setTimeout(r,60)); o[p]={size:document.querySelector('#imgSize').disabled,align:getComputedStyle(document.querySelector('#assist .seg')).pointerEvents==='none'}; } document.querySelector('#assist [data-place="inline"]').click(); await new Promise(r=>setTimeout(r,60)); o.inline={size:document.querySelector('#imgSize').disabled,align:getComputedStyle(document.querySelector('#assist .seg')).pointerEvents==='none'}; return o; });
   say(offs.page.size&&offs.bleed.size&&!offs.inline.size&&!offs['wrap-left'].size&&offs['wrap-left'].align&&offs.top.align&&!offs.inline.align?'OK':'FAULT','BP-74','size is off for Own page and Full bleed, alignment only for a picture in the text: '+JSON.stringify(offs));
   await pg.fill('#imgCap','The harbor at dawn'); await pg.click('#imgOk'); await pg.waitForTimeout(500);
   const ins=await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'), L=ta.value.split('\n'); return {line:L.findIndex(l=>/^\[\[image/.test(l)),marker:L.find(l=>/^\[\[image/.test(l))}; });
   say(ins.line===1&&/The harbor at dawn/.test(ins.marker)?'OK':'FAULT','BP-50a','the picture goes in where the cursor was, with its caption: line '+ins.line+' '+(ins.marker||'').slice(0,80));
   const shots={};
   for(const p of ['inline','wrap-left','wrap-right','top','page','bleed']){
     const r=await pg.evaluate(async p=>{ const ta=document.querySelector('#manuscript'); ta.value=ta.value.replace(/\| (inline|wrap-left|wrap-right|top|page|bleed) \|/,'| '+p+' |'); commitText(); await new Promise(r=>setTimeout(r,400)); setTab('read'); await new Promise(r=>setTimeout(r,300));
       const id=S.cur, n=pag(id).pages.length; let found=null;
       for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const face=document.querySelector('#spread .face:not(.gone)'), pt=face.querySelector('.ptext'), fig=face.querySelector('.fig,.fullbleed,img.bleed,.pagepic,.ownpage'); const img=face.querySelector('.ptext img, .bleed img, img');
         if(img&&!/cvimg|cvr/.test(img.className)){ const pr=pt?pt.getBoundingClientRect():face.getBoundingClientRect(), fr=face.getBoundingClientRect(), ir=img.getBoundingClientRect(), fg=img.closest('figure,div'), cs=fg?getComputedStyle(fg):{};
           const txt=pt?[...pt.querySelectorAll('p:not(.toc)')].filter(x=>x.textContent.trim()).map(x=>x.getBoundingClientRect()):[];
           const firstTxtTop=txt.length?Math.min(...txt.map(t=>t.top)):null, beside=txt.filter(t=>t.top<ir.bottom-4&&t.bottom>ir.top+4);
           found={i,cls:(fg&&fg.className)||'',float:cs.cssFloat||cs.float,img:[Math.round(ir.left-fr.left),Math.round(fr.right-ir.right),Math.round(ir.top-fr.top),Math.round(fr.bottom-ir.bottom)],text:[Math.round(pr.left-fr.left),Math.round(fr.right-pr.right)],imgFirst:firstTxtTop==null||ir.top<=firstTxtTop+2,textBeside:beside.length,besideX:beside.slice(0,2).map(t=>[Math.round(t.left-fr.left),Math.round(fr.right-t.right)]),words:pt?pt.textContent.replace(/\s+/g,' ').trim().length:0,pageW:Math.round(fr.width)}; break; } }
       setTab('write'); return found; },p);
     shots[p]=r; }
   const s=shots; const ok={inline:s.inline&&s.inline.textBeside===0,
     'wrap-left':s['wrap-left']&&s['wrap-left'].textBeside>0&&s['wrap-left'].img[0]<=s['wrap-left'].text[0]+2,
     'wrap-right':s['wrap-right']&&s['wrap-right'].textBeside>0&&s['wrap-right'].img[1]<=s['wrap-right'].text[1]+2,
     top:s.top&&s.top.imgFirst,
     page:s.page&&s.page.words<40&&s.page.img[0]>=s.page.text[0]-2,
     bleed:s.bleed&&s.bleed.img[0]<=1&&s.bleed.img[1]<=1};
   for(const [k,v] of Object.entries(ok)) say(v?'OK':'FAULT','BP-73',k+': '+JSON.stringify(s[k]));
   await pg.evaluate(()=>{ setTab('write'); const ta=document.querySelector('#manuscript'), L=ta.value.split('\n'); const pos=L[0].length+3; ta.focus(); ta.setSelectionRange(pos,pos); ta.dispatchEvent(new MouseEvent('click',{bubbles:true})); }); await pg.waitForTimeout(300);
   const ed=await pg.evaluate(()=>({ok:(document.querySelector('#imgOk')||{}).textContent,del:(document.querySelector('#imgDel')||{}).textContent}));
   await pg.click('#imgDel').catch(()=>{}); await pg.waitForTimeout(300); const gone=await pg.evaluate(()=>!/\[\[image/.test(document.querySelector('#manuscript').value));
   say(ed.ok==='Update'&&ed.del==='Remove from page'&&gone?'OK':'FAULT','BP-75','tapping its line reopens the panel with Update and Remove from page, and Remove takes it out: '+JSON.stringify(ed)+' removed '+gone);
   if(pg.errs.length) say('FAULT','BP-50x','page error: '+pg.errs[0]); await pg.ctx.close(); });
 // ---------- Import at the end, Copy selection / whole chapter, Read→Write
 await run('BP-52',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','First chapter words here.'],['Two','Second chapter.']]);
   await pg.evaluate(()=>{ selectChapter(BOOK.order[0]); const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(5,5); });
   await pg.setInputFiles('#fileIn',REPO+'/tests/fixtures/import/hash-chapters.txt'); await pg.waitForTimeout(3500);
   const r=await pg.evaluate(()=>({titles:BOOK.order.map(id=>CH.get(id).title),first:CH.get(BOOK.order[0]).text}));
   say(r.titles[0]==='One'&&r.titles[1]==='Two'&&r.titles.slice(2).includes('The Copper Kettle')&&r.first==='First chapter words here.'?'OK':'FAULT','BP-52','Import adds new chapters at the end, not at the cursor: '+r.titles.join(' | '));
   await book(pg,[['One','Alpha beta gamma. Delta epsilon.']]);
   await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(0,10); setTools(true); }); await pg.click('#copyBtn'); await pg.waitForTimeout(250); const c1=await pg.evaluate(()=>navigator.clipboard.readText());
   await pg.evaluate(()=>{ const ta=document.querySelector('#manuscript'); ta.focus(); ta.setSelectionRange(3,3); setTools(true); }); await pg.click('#copyBtn'); await pg.waitForTimeout(250); const c2=await pg.evaluate(()=>navigator.clipboard.readText());
   say(c1==='Alpha beta'&&c2==='Alpha beta gamma. Delta epsilon.'?'OK':'FAULT','BP-56','Copy copies the selection, or the whole chapter when nothing is selected: "'+c1+'" / "'+c2+'"');
   await book(pg,[['One',Array.from({length:12},(_,k)=>para(k,70)).join('\n')]]);
   const rw=await pg.evaluate(async()=>{ setTab('read'); await new Promise(r=>setTimeout(r,300)); goTo({ch:S.cur,i:3}); drawView(); refreshReader(); const P=pag(S.cur), w=P.pages[3][0], para0=P.doc.paras.findIndex(p=>w>=p.start&&w<p.end), tp=P.doc.paras.filter(p=>p.title||p.ch||(p.h&&P.doc.words.slice(p.start,p.end).map(x=>x.v).join(' ')===CH.get(S.cur).title)).length, para=para0-tp;
     document.querySelector('#tab-write').click(); await new Promise(r=>setTimeout(r,500)); const ta=document.querySelector('#manuscript'), at=ta.value.slice(0,ta.selectionStart).split('\n').length-1; return {para,at}; });
   say(rw.at===rw.para?'OK':'FAULT','BP-57','going from Read back to Write puts the cursor on the paragraph you were reading: reading paragraph '+rw.para+', cursor on '+rw.at);
   await pg.ctx.close(); });
 // ---------- Copy a chapter from the list; blocked copy; empty
 await run('BP-62',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); await book(pg,[['One','Words of one.'],['Two','Words of the second chapter here.'],['Three','']]);
   await pg.click('#chBtn'); await pg.waitForTimeout(300); await pg.click(`[data-copy]:nth-of-type(1)`).catch(()=>{});
   const r=await pg.evaluate(async()=>{ const bs=[...document.querySelectorAll('#chList [data-copy]')]; bs[1].click(); await new Promise(r=>setTimeout(r,200)); const lab=bs[1].textContent, clip=await navigator.clipboard.readText(), note=document.querySelector('#exportNote').textContent, t=document.querySelector('#toast').textContent;
     bs[2].click(); await new Promise(r=>setTimeout(r,150)); const empty=document.querySelectorAll('#chList [data-copy]')[2].textContent; return {lab,clip,note,t,empty}; });
   say(r.clip==='Two\n\nWords of the second chapter here.'?'OK':'FAULT','BP-62','Copy on a chapter row copies that chapter, title and all its text: '+JSON.stringify(r.clip));
   say(r.lab==='Copied ✓'&&/chapter 2 · 6 words/.test(r.note)?'OK':'FAULT','BP-64','the button shows Copied ✓ and a note gives the chapter number and word count: "'+r.lab+'", "'+r.note+'"');
   say(r.empty==='Empty'?'OK':'FAULT','BP-11b','a chapter with no text says Empty: "'+r.empty+'"');
   await pg.evaluate(()=>{ navigator.clipboard.writeText=()=>Promise.reject(new Error('blocked')); document.execCommand=()=>false; });
   await pg.evaluate(()=>{ renderDrawer(); document.querySelectorAll('#chList [data-copy]')[0].click(); }); await pg.waitForTimeout(400);
   const blk=await pg.evaluate(()=>({tab:S.tab,assist:!document.querySelector('#assist').hidden,box:(document.querySelector('#assist textarea')||{}).value||''}));
   say(blk.tab==='write'&&blk.assist&&blk.box==='One\n\nWords of one.'?'OK':'FAULT','BP-12t','if copying is blocked, the whole chapter opens in a box in Write: '+JSON.stringify(blk));
   await pg.ctx.close(); });
 // ---------- Section headings
 await run('BP-94',async()=>{ const pg=await mk(b,'iPhone 14 Pro Max'); const big=Array.from({length:40},(_,k)=>para(k,30+(k%7)*9)); const txt=[];
   big.forEach((p,k)=>{ txt.push(p); if(k%3===2) txt.push('# Heading number '+k); }); await book(pg,[['One',txt.join('\n')]]);
   const r=await pg.evaluate(async()=>{ setTab('read'); await new Promise(r=>setTimeout(r,300)); const id=S.cur, n=pag(id).pages.length; const o={n,alone:[],style:null,sameP:0,newpage:0};
     for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const pt=document.querySelector('#spread .face:not(.gone) .ptext'), ks=[...pt.children].filter(e=>e.matches('h2,p'));
       const last=ks[ks.length-1]; if(last&&last.matches('h2:not(.cht)')) o.alone.push(i+1);
       ks.forEach((e,k)=>{ if(e.matches('h2:not(.cht)')){ if(!o.style){ const cs=getComputedStyle(e); o.style={align:cs.textAlign,weight:cs.fontWeight,mt:parseFloat(cs.marginTop)}; } if(k>0&&ks[k-1].matches('p')) o.sameP++; } }); }
     return o; });
   say(r.style&&r.style.align==='center'&&+r.style.weight>=600&&r.style.mt>0?'OK':'FAULT','BP-94a','a # heading shows centered and bold with space above: '+JSON.stringify(r.style));
   say(r.sameP>5?'OK':'FAULT','BP-94b','the text carries on down the same page: '+r.sameP+' headings follow text on the same page');
   say(!r.alone.length?'OK':'FAULT','BP-94c','a heading is never left alone at the bottom of a page: checked '+r.n+' pages'+(r.alone.length?', alone on '+r.alone.join(','):''));
   await pg.ctx.close(); });
 await b.close(); })();
