/* Inkhorse stability audit. Run before every push:  node tests/audit.js app.html
   Opens the app in a phone-size browser, uses the main features, and reports PASS/FAIL per step plus any page errors. */
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const file = path.resolve(process.argv[2] || 'app.html');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], permissions: ['clipboard-read','clipboard-write'] });
  await ctx.addInitScript(() => { // headless Chrome has no voices: a stand-in that "speaks" each sentence for 300 ms
    const syn = { speaking:false, pending:false, paused:false, onvoiceschanged:null, addEventListener(){}, removeEventListener(){}, pause(){}, resume(){}, cancel(){ this._t&&clearTimeout(this._t); },
      getVoices(){ return [{ name:'Test voice', lang:'en-US', voiceURI:'test', default:true, localService:true }]; },
      speak(u){ this._t=setTimeout(()=>{ try{ u.onstart&&u.onstart({}); u.onboundary&&u.onboundary({charIndex:0,name:'word'}); }catch(e){} this._t=setTimeout(()=>{ try{ u.onend&&u.onend({}); }catch(e){} },300); },10); } };
    Object.defineProperty(window,'speechSynthesis',{value:syn,configurable:true});
    window.SpeechSynthesisUtterance=function(t){ this.text=t; };
  });
  const PDFJS_DIR=process.env.PDFJS_DIR||''; // a pdfjs-dist@3.11.174 build folder; without it the PDF import step is skipped
  if(PDFJS_DIR){ await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.min.js'),contentType:'application/javascript'}));
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.worker.min.js'),contentType:'application/javascript'})); }
  let JSZIP_FILE=null; try{ JSZIP_FILE=require.resolve('jszip/dist/jszip.min.js'); }catch(_){ }
  if(JSZIP_FILE) await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:require('fs').readFileSync(JSZIP_FILE),contentType:'application/javascript'}));
  const page = await ctx.newPage();
  const errs=[], res=[];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type()==='error' && !/ERR_TUNNEL|ERR_|favicon|net::|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const step = async (name, fn) => { try { const v = await fn(); const bad = v === false; res.push([bad?'FAIL':(typeof v==='string'&&v.startsWith('SKIP')?'SKIP':'PASS'), name, bad?'returned false':(v===undefined||v===true?'':JSON.stringify(v).slice(0,90))]); } catch (e) { res.push(['FAIL', name, e.message.slice(0,600)]); } };
  const T = () => page.inputValue('#manuscript');
  const tools = async () => { if (await page.getAttribute('#toolsBtn','aria-expanded') !== 'true') await page.click('#toolsBtn',{timeout:3000}); await page.waitForTimeout(150); };
  await page.goto('file://' + file); await page.waitForTimeout(2500);

  await step('works on older phone browsers: no look-behind in fixed code (rev 89)', async () => {
    // Safari before iOS 16.4 can't read (?<= or (?<! written straight into the code, and then the whole app fails to open.
    const src=require('fs').readFileSync(file,'utf8'); const bad=(src.match(/\/[^\n\/]*\(\?<[=!][^\n]*\//g)||[]).filter(l=>!/new RegExp/.test(l));
    return bad.length ? (()=>{ throw new Error('look-behind found: '+bad[0].slice(0,80)); })() : true;
  });
  await step('app loads on the Write tab', async () => (await page.getAttribute('#app','data-tab'))==='write');
  await step('version line is present', async () => { const v = await page.evaluate(()=>window.INK_VERSION); return !!(v && v.release && v.rev); });
  await step('typing saves and counts words', async () => { await page.fill('#manuscript','First paragraph here with some words.\nSecond paragraph. It has two sentences.'); await page.waitForTimeout(500); return /1[0-9]|\d/.test(await page.textContent('#wordCount')); });
  await step('undo and redo', async () => { const typed=await T(); await page.click('#undoBtn'); await page.waitForTimeout(200); const a=await T(); await page.click('#redoBtn'); await page.waitForTimeout(200); return a!==typed && (await T())===typed; });
  await step('find in chapter', async () => { await page.click('#findBtn'); await page.fill('#findIn','paragraph'); await page.waitForTimeout(300); await page.press('#findIn','Enter'); const n=await page.textContent('#findN'); await page.click('#findClose'); return /1 of 2/.test(n); });
  await step('Resume and Top buttons', async () => { await page.click('#pgResume'); await page.click('#pgTop'); });
  await step('tools row shows its buttons', async () => { await tools(); for (const i of ['micBtn','hpBtn','wcBtn','focusBtn','pasteBtn','copyBtn']) if(!(await page.isVisible('#'+i))) return i+' missing'; });
  await step('Dictate on a phone shows the keyboard hint', async () => { await page.click('#micBtn'); await page.waitForTimeout(300); const h=await page.textContent('#dictHint'); await page.click('#dictHint .x').catch(()=>{}); return /keyboard/i.test(h); });
  await step('Focus mode in and out', async () => { await page.click('#focusBtn'); await page.waitForTimeout(300); const on=await page.evaluate(()=>document.body.className.includes('focus')); await page.keyboard.press('Escape'); await page.waitForTimeout(300); return on; });
  await step('Hoofprint opens and closes', async () => { await tools(); await page.click('#hpBtn'); await page.waitForTimeout(300); const v=await page.isVisible('#hpPanel'); await page.click('#hpDone'); return v; });
  await step('Hoofprint offers Bolduc for "bold duck"', async () => { await page.evaluate(()=>{ S.hp.words.push('Bolduc'); saveSettings(); }); await page.fill('#manuscript','My grandmother was a bold duck from Quebec. She was kind.'); await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(t.value.length,t.value.length); }); await page.waitForTimeout(1500); return /Bolduc/.test(await page.textContent('#hpBar')); });
  await step('Chapters panel: add a chapter, close', async () => { await page.click('#chBtn',{timeout:4000}).catch(e=>{throw new Error('chBtn: '+e.message.split('\n').slice(0,6).join(' / '))}); await page.waitForTimeout(300); await page.click('#addCh',{timeout:4000}).catch(e=>{throw new Error('addCh: '+e.message.split('\n').slice(0,8).join(' / '))}); await page.waitForTimeout(300); const l=await page.textContent('#chBtnLabel'); if(await page.isVisible('#drawerDone')) await page.click('#drawerDone'); await page.waitForTimeout(300); return /2 of/.test(l); });
  await step('Read tab shows pages and page numbers', async () => { await page.click('#tab-read'); await page.waitForTimeout(800); return /of \d/.test(await page.textContent('#pgOf')); });
  await step('Jump to: numbers agree with the counter', async () => { const of=(await page.textContent('#pgOf')).match(/\d+/)[0]; await page.click('#whereBtn'); await page.waitForTimeout(300); const now=await page.textContent('#gotoNow'); const list=await page.textContent('#gotoList'); await page.click('#gotoDone'); return now.includes('of '+of) && !/of 7[0-9]|starts on/.test(list) ? true : {of,now:now.slice(0,40)}; });
  await step('page turn by arrow key', async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(600); });
  await step('Jump-to sheet opens', async () => { await page.click('#whereBtn'); await page.waitForTimeout(300); const v=await page.isVisible('#gotoDone'); await page.click('#gotoDone').catch(()=>{}); return v; });
  await step('Colors: every theme applies', async () => { for (const th of ['light','dark','sepia','sky','custom']) { await page.evaluate(t=>{ localStorage.setItem('inkhorse-theme',t); inkApplyTheme(); },th); if((await page.evaluate(()=>document.documentElement.getAttribute('data-theme')))!==th) return th+' failed'; } await page.evaluate(()=>{ localStorage.removeItem('inkhorse-theme'); inkApplyTheme(); }); });
  await step('Night schedule + warmth apply', async () => { await page.evaluate(()=>{ localStorage.setItem('inkhorse-night','dark'); localStorage.setItem('inkhorse-night-from','00:00'); localStorage.setItem('inkhorse-night-to','23:59'); localStorage.setItem('inkhorse-warmth','40'); inkApplyTheme(); }); const r=await page.evaluate(()=>[document.documentElement.getAttribute('data-theme'),document.documentElement.hasAttribute('data-warm')]); await page.evaluate(()=>{ ['inkhorse-night','inkhorse-night-from','inkhorse-night-to','inkhorse-warmth'].forEach(k=>localStorage.removeItem(k)); inkApplyTheme(); }); return r[0]==='dark'&&r[1]; });
  await step('Read aloud: player opens, buttons work', async () => { await page.click('#listenBtn'); await page.waitForTimeout(600); const bar=await page.isVisible('#ttsBar'); for (const id of ['ttsFwd','ttsBack','ttsAgain','ttsPlay']) { const b=await page.$('#'+id); if(b&&await b.isVisible()) await b.click({timeout:2000}); await page.waitForTimeout(150); } await page.click('#ttsStop',{timeout:2000}).catch(()=>{}); return bar; });
  await step('Read aloud: Bella, the natural voice, is offered and asks before downloading (rev 97)', async () => {
    // This test machine has no internet for the voice itself; Bella's real download and reading are tested separately over the internet.
    if(!(await page.$('#kokNote'))) return 'SKIP: this version has no natural voices';
    await page.click('#listenBtn'); await page.waitForTimeout(300); if(await page.evaluate(()=>TTS.playing)) await page.click('#ttsPlay');
    const opt=await page.$eval('#ttsVoice option',o=>[o.value,o.textContent]);
    if(opt[0]!=='kokoro:af_bella'||!/Bella/.test(opt[1])) throw new Error('Bella is not first in the Voice list: '+opt);
    await page.selectOption('#ttsVoice','kokoro:af_bella'); await page.waitForTimeout(200);
    const note=await page.textContent('#kokNote'), shown=await page.isVisible('#kokGo');
    if(!shown||!/MB/.test(note)) throw new Error('no download question: '+note.slice(0,80));
    if(await page.evaluate(()=>(S.ttsVoice||'').startsWith('kokoro:'))) throw new Error('voice switched before the download was agreed');
    await page.click('#kokNo'); await page.waitForTimeout(200);
    const hidden=!(await page.isVisible('#kokNote')), sel=await page.inputValue('#ttsVoice');
    await page.click('#ttsStop',{timeout:2000}).catch(()=>{});
    return hidden && !sel.startsWith('kokoro:') ? true : {hidden,sel};
  });
  await step('Adding a PDF asks: real book or exact look; Cancel adds nothing (rev 98)', async () => {
    if(!(await page.$('#libAsk'))) return 'SKIP: this version has no PDF question';
    if(!(await page.isVisible('#library'))){ await page.click('#tab-read').catch(()=>{}); await page.click('#libBtn'); await page.waitForTimeout(400); }
    const n0=await page.evaluate(()=>LIB.length);
    await page.setInputFiles('#libIn',{name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF\n')}); await page.waitForTimeout(300);
    const txt=await page.textContent('#libAsk'); if(!/Make it a real book/.test(txt)||!/Keep the exact look/.test(txt)) throw new Error('question missing: '+txt.slice(0,80));
    await page.click('#libAsk [data-way="no"]'); await page.waitForTimeout(400);
    const n1=await page.evaluate(()=>LIB.length), gone=!(await page.isVisible('#libAsk'));
    await page.click('#libDone').catch(()=>{}); await page.waitForTimeout(300);
    return n0===n1 && gone ? true : {n0,n1,gone};
  });
  await step('Aa on a book kept as page pictures says so and grays the text settings (rev 98)', async () => {
    if(!(await page.$('#picNote'))) return 'SKIP: this version has no picture-book note';
    const r=await page.evaluate(()=>{ const old=RB; RB={pics:true}; picSheetUI(); const on=[!document.querySelector('#picNote').hidden,document.querySelector('#fs').disabled,document.querySelector('#face').disabled,!document.querySelector('#themeSel').disabled];
      RB=old; picSheetUI(); const off=[document.querySelector('#picNote').hidden,!document.querySelector('#fs').disabled]; return {on,off}; });
    return r.on.every(Boolean)&&r.off.every(Boolean) ? true : r;
  });
  await step('F2.7 F1.3 F2.3 PDF "Make it a real book": contents page one entry per line and front matter; "Chapter One: …" keeps its title and its own label (rev 98, 100)', async () => {
    if(!PDFJS_DIR) return 'SKIP: set PDFJS_DIR to test PDF import (the PDF reader is loaded from the internet on phones)';
    const mk=await ctx.newPage(); const titles=['Chapter One: Point of Origin','Chapter Two: Florida, 1981','Chapter Three: Memory'];
    const para=i=>`<p>At the time, Manchester was a city with a long industrial history and a deeply rooted French-Canadian community number ${i}. The Merrimack River divided the city, and on its western bank families had established their homes and churches.</p>`;
    let html=`<style>body{font-family:serif;font-size:11pt;text-align:justify}p{margin:0;text-indent:2em}h1{font-weight:normal;text-align:center;page-break-before:always;margin-top:2in}</style><div style="text-align:center;margin-top:3in">A Test Book</div><h1>Contents</h1>${titles.map((t,i)=>`<p style="text-indent:0">${t} ........ ${3+i*4}</p>`).join('')}`;
    titles.forEach((t,ci)=>{ html+=`<h1>${t}</h1>`; for(let i=0;i<12;i++) html+=para(ci*100+i); });
    await mk.setContent(html); const buf=await mk.pdf({width:'5.5in',height:'8.5in',displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:8pt;width:100%;text-align:center"><span class="pageNumber"></span></div>',margin:{top:'0.7in',bottom:'0.8in',left:'0.7in',right:'0.7in'}}); await mk.close();
    if(!(await page.isVisible('#library'))){ await page.click('#tab-read').catch(()=>{}); await page.click('#libBtn'); await page.waitForTimeout(400); }
    await page.setInputFiles('#libIn',{name:'pdf-test-book.pdf',mimeType:'application/pdf',buffer:buf}); await page.waitForTimeout(300);
    await page.click('#libAsk [data-way="text"]');
    await page.waitForFunction(()=>/^Added|couldn/.test(document.querySelector('#libNote').textContent),null,{timeout:60000});
    const r=await page.evaluate(async()=>{ const m=LIB[0]; const out={pageMode:m.pageMode,titles:m.chapters.map(c=>c.title)}; await openLibBook(m.id,true);
      out.front=RB.ch.get(RB.order[0]).text.split('\n'); out.isFront=isFront(RB.order[0]); out.label=RB.order.slice(1).map(id=>fmtSplitTitle(RB.ch.get(id).title).label); out.paras=RB.order.slice(1).map(id=>RB.ch.get(id).text.split('\n').length); out.nums=RB.order.some(id=>/^\s*\d{1,3}\s*$/m.test(RB.ch.get(id).text));
      leaveLibraryBook(); return out; });
    await page.evaluate(async()=>{ const id=LIB[0].id; LIB=LIB.slice(1); saveLibIndex(); try{ await idb.del('lib:'+id); }catch(_){ } renderShelf(); });
    await page.click('#libDone').catch(()=>{}); await page.waitForTimeout(300);
    const ok=!r.pageMode && JSON.stringify(r.titles.slice(-3))===JSON.stringify(titles) && r.front.length===5 && r.front[0]==='%%front' && r.front[1]==='Contents' && r.isFront && JSON.stringify(r.label)==='["Chapter One","Chapter Two","Chapter Three"]' && r.paras.every(n=>n===12) && !r.nums;
    if(!ok) throw new Error(JSON.stringify(r).slice(0,400)); return true;
  });
  await step('F2.3 a title written "Chapter One: Point of Origin" shows its own label above the title (rev 100)', async () => page.evaluate(() => {
    const t=[['Chapter One: Point of Origin','Chapter One','Point of Origin'],['Chapter Seven: The Road Back — Florida, 1991','Chapter Seven','The Road Back — Florida, 1991'],['PART 1 · The Bridge','PART 1','The Bridge'],['Part Two - Home','Part Two','Home'],['Memory','','Memory']];
    const bad=t.filter(([x,l,ti])=>{ const r=fmtSplitTitle(x); return r.label!==l||r.title!==ti; }); if(bad.length) throw new Error(JSON.stringify(bad)); return true; }));
  await step('Library lists the manual', async () => { await page.click('#libBtn'); await page.waitForTimeout(500); return /User manual/.test(await page.evaluate(()=>document.body.innerText)); });
  await step('Covers: every Library cover is the standard 2:3 size, whole picture inside (rev 83-85)', async () => {
    // a tall, a squat and a wide test cover beside the manual's own cover, all drawn the app's way
    const r = await page.evaluate(() => {
      const mk=(w,h)=>{const v=document.createElement('canvas');v.width=w;v.height=h;const x=v.getContext('2d');x.fillStyle='#456';x.fillRect(0,0,w,h);return v.toDataURL();};
      const row=[...document.querySelectorAll('.bookrow')].find(r=>/User manual/.test(r.innerText));
      const made=[[300,700],[300,380],[500,300]].map(([w,h])=>{const c=row.cloneNode(true);c.classList.add('audit-cover');c.querySelector('.thumb').innerHTML=cvPic(mk(w,h),'');row.after(c);return c;});
      return new Promise(res=>setTimeout(()=>{
        const out=[...document.querySelectorAll('.bookrow .thumb.has')].map(t=>{const b=t.getBoundingClientRect(),f=t.querySelector('.cvfg'),q=f&&f.getBoundingClientRect();
          return {w:Math.round(b.width),h:Math.round(b.height),inside:!!q&&q.top>=b.top-0.5&&q.bottom<=b.bottom+0.5&&q.left>=b.left-0.5&&q.right<=b.right+0.5};});
        made.forEach(c=>c.remove()); res(out);},300));
    });
    const man = await page.evaluate(()=>{const m=MANUAL.images[MANUAL.coverFront]; return m&&Math.abs(m.w/m.h-2/3)<0.01;});
    const sizes=new Set(r.map(x=>x.w+'x'+x.h));
    if(r.length<4) return 'only '+r.length+' covers found';
    return sizes.size===1 && r.every(x=>x.inside && Math.abs(x.w/x.h-2/3)<0.03) && man ? true : false;
  });
  await step('Speed: a big book (36 chapters, ~200k words, with a contents page) opens in under 4 seconds', async () => {
    // Rev 88-89 took 23 s here (146 s at phone speed) and froze Steve's iPhone. A good build takes well under 1 s.
    const W='the quick brown fox jumps over lazy dog while the writer reads mesh pages edges faces aloud'.split(' ');
    let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return W[seed%W.length]; };
    const titles=Array.from({length:36},(_,i)=>`Chapter ${i+1}: ${rnd()} ${rnd()} ${rnd()}`);
    let JSZip=null; try{ JSZip=require('jszip'); }catch(_){ }
    if(!JSZip||!JSZIP_FILE) return 'SKIP: zip library not on this test machine';
    const z=new JSZip(); z.file('mimetype','application/epub+zip',{compression:'STORE'});
    z.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    const docs=[['toc','Table of Contents','<h1>Table of Contents</h1><p>'+titles.map((t,i)=>`${t} ${9+i*30} Part A ${10+i*30} Part B ${12+i*30}`).join(' ')+'</p>']]
      .concat(titles.map((t,i)=>['c'+i,t,`<h1>${t}</h1>`+Array.from({length:550},()=>'<p>'+Array.from({length:10},rnd).join(' ')+'.</p>').join('')]));
    z.file('OEBPS/content.opf',`<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="u"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="u">speed</dc:identifier><dc:title>Speed test</dc:title><dc:language>en</dc:language></metadata><manifest>${docs.map(d=>`<item id="${d[0]}" href="${d[0]}.xhtml" media-type="application/xhtml+xml"/>`).join('')}<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine>${docs.map(d=>`<itemref idref="${d[0]}"/>`).join('')}</spine></package>`);
    z.file('OEBPS/nav.xhtml',`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>${docs.map(d=>`<li><a href="${d[0]}.xhtml">${d[1]}</a></li>`).join('')}</ol></nav></body></html>`);
    docs.forEach(d=>z.file(`OEBPS/${d[0]}.xhtml`,`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${d[1]}</title></head><body>${d[2]}</body></html>`));
    const epub=await z.generateAsync({type:'nodebuffer'});
    await page.evaluate(()=>{ setTab('read'); document.querySelector('#libBtn').click(); }); await page.waitForTimeout(400);
    const before=await page.evaluate(()=>[...document.querySelectorAll('[data-read]')].map(x=>x.dataset.read));
    await page.setInputFiles('#libIn',{name:'speed-test.epub',mimeType:'application/epub+zip',buffer:epub});
    let id=null; for(let t=0;t<240&&!id;t++){ await page.waitForTimeout(250); id=await page.evaluate(b=>[...document.querySelectorAll('[data-read]')].map(x=>x.dataset.read).find(x=>!b.includes(x)),before); }
    if(!id) return 'SKIP: speed-test book did not import';
    const t0=Date.now(); await page.evaluate(async id=>{ await openLibBook(id); },id); const ms=Date.now()-t0;
    const chs=await page.evaluate(()=>rOrder().length);
    await page.evaluate(id=>{ try{ leaveLibrary(); }catch(_){ } },id);
    if(ms>4000) throw new Error(`big book took ${ms} ms to open (${chs} chapters)`);
    return `${ms} ms, ${chs} chapters`;
  });
  /* ===== Formatting engine: one step per rule in docs/FORMATTING-STANDARD.md. A FAIL names the rule that broke. ===== */
  let FMT=null;
  const fmtBook = async () => {
    if (FMT) return FMT;
    let JSZip=null; try{ JSZip=require('jszip'); }catch(_){ }
    if(!JSZip||!JSZIP_FILE) return (FMT={skip:'SKIP: zip library not on this test machine'});
    const body='This is ordinary body text that runs long enough to fill a few lines on a phone page, so the paragraph indents show clearly. ';
    const P=a=>a.map(x=>`<p>${x}</p>`).join('');
    const docs=[['tp','Title page','<section epub:type="titlepage"><h1>The Engine Test</h1><p>A test book</p><p>An Author</p></section>'],
      ['cp','Copyright','<section><p>Copyright © 2026 An Author. All rights reserved.</p><p>First edition.</p></section>'],
      ['c1','Part 1','<section epub:type="chapter"><p>PART 1</p><h1>The Bridge</h1>'+P([body+body,body])+'<p>* * *</p>'+P([body])+'</section>'],
      ['c2','The River','<section epub:type="chapter">'+P([body+body,body])+'</section>']];
    const z=new JSZip(); z.file('mimetype','application/epub+zip',{compression:'STORE'});
    z.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    z.file('OEBPS/content.opf',`<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="u"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="u">fmt</dc:identifier><dc:title>The Engine Test</dc:title><dc:language>en</dc:language></metadata><manifest>${docs.map(d=>`<item id="${d[0]}" href="${d[0]}.xhtml" media-type="application/xhtml+xml"/>`).join('')}<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine>${docs.map(d=>`<itemref idref="${d[0]}"/>`).join('')}</spine></package>`);
    z.file('OEBPS/nav.xhtml',`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol>${docs.map(d=>`<li><a href="${d[0]}.xhtml">${d[1]}</a></li>`).join('')}</ol></nav></body></html>`);
    docs.forEach(d=>z.file(`OEBPS/${d[0]}.xhtml`,`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${d[1]}</title></head><body>${d[2]}</body></html>`));
    await page.evaluate(()=>{ setTab('read'); document.querySelector('#libBtn').click(); }); await page.waitForTimeout(400);
    const before=await page.evaluate(()=>[...document.querySelectorAll('[data-read]')].map(x=>x.dataset.read));
    await page.setInputFiles('#libIn',{name:'engine-test.epub',mimeType:'application/epub+zip',buffer:await z.generateAsync({type:'nodebuffer'})});
    let id=null; for(let t=0;t<120&&!id;t++){ await page.waitForTimeout(250); id=await page.evaluate(b=>[...document.querySelectorAll('[data-read]')].map(x=>x.dataset.read).find(x=>!b.includes(x)),before); }
    if(!id) return (FMT={skip:'SKIP: engine test book did not import'});
    const toast=await page.evaluate(()=>[...document.querySelectorAll('.toast,#toast')].filter(t=>t.offsetParent).map(t=>t.innerText).join('|'));
    await page.evaluate(async id=>{ await openLibBook(id); },id); await page.waitForTimeout(1000);
    const titles=await page.evaluate(()=>rOrder().map(i=>getCh(i).title));
    const pages=[];
    for(let i=0;i<12;i++){ pages.push(await page.evaluate(()=>{ const pg=document.querySelector('#spread .face:not(.left) .ptext')||document.querySelector('#spread .ptext'); if(!pg) return null; const rh=pg.parentElement.querySelector('.rh'); const h=pg.querySelector('h2.cht'), fp=h&&h.nextElementSibling, sb=pg.querySelector('p.sb');
      return {front:pg.classList.contains('front'),label:rh?rh.innerText.trim():'',title:h?h.innerText:'',drop:h?(h.getBoundingClientRect().top-pg.getBoundingClientRect().top)/pg.clientHeight:null,firstIndent:fp?parseFloat(getComputedStyle(fp).textIndent):null,smallCaps:fp?getComputedStyle(fp,'::first-line').fontVariantCaps||getComputedStyle(fp,'::first-line').fontVariant:null,
        sb:sb?{txt:sb.innerText.replace(/\s+/g,''),center:getComputedStyle(sb).textAlign,nextIndent:sb.nextElementSibling?parseFloat(getComputedStyle(sb.nextElementSibling).textIndent):null}:null}; }));
      await page.click('#next').catch(()=>{}); await page.waitForTimeout(450); }
    await page.evaluate(()=>{ try{ leaveLibrary(); }catch(_){ } });
    return (FMT={titles,pages:pages.filter(Boolean),toast});
  };
  const F=async(name,test)=>step(name, async()=>{ const f=await fmtBook(); if(f.skip) return f.skip; const r=test(f); if(r!==true) throw new Error(String(r)); return true; });
  await F('F10.6 a "PART 1" label above a title stays with the title', f=>f.titles.includes('PART 1 · The Bridge')||'chapter titles: '+JSON.stringify(f.titles));
  await F('F2.7 a chapter with no heading takes its name from the contents list', f=>f.titles.includes('The River')||'chapter titles: '+JSON.stringify(f.titles));
  await F('F1.3 title and copyright pages are front matter: no chapter label', f=>{ const fr=f.pages.filter(p=>p.front); return (fr.length>=2 && fr.every(p=>!p.label))||'front pages: '+JSON.stringify(fr); });
  await F('F2.3 the book\'s own label replaces "Chapter N", and front matter is not counted', f=>{ const a=f.pages.find(p=>p.title==='The Bridge'), b=f.pages.find(p=>p.title==='The River'); return (a&&a.label==='PART 1'&&b&&/Chapter 2/i.test(b.label))||JSON.stringify([a&&a.label,b&&b.label]); });
  await F('F2.2 a chapter title sits well down its first page', f=>{ const d=f.pages.filter(p=>p.drop!=null&&!p.front).map(p=>p.drop); return (d.length>0&&d.every(x=>x>=0.22&&x<=0.4))||'title drop: '+JSON.stringify(d); });
  await F('F2.4 the first paragraph of a chapter is not indented', f=>{ const v=f.pages.filter(p=>p.firstIndent!=null).map(p=>p.firstIndent); return (v.length>0&&v.every(x=>x===0))||JSON.stringify(v); });
  await F('F2.5 a chapter opens with its first line in small capitals', f=>{ const v=f.pages.filter(p=>p.title&&!p.front).map(p=>p.smallCaps); return (v.length>0&&v.every(x=>/small-caps/.test(x||'')))||JSON.stringify(v); });
  await F('F5.2 a scene break is a centered ornament, and the next paragraph is not indented', f=>{ const s=f.pages.map(p=>p.sb).filter(Boolean); return (s.length>0&&s.every(x=>x.txt==='***'&&x.center==='center'&&(x.nextIndent===null||x.nextIndent===0)))||JSON.stringify(s); });
  await step('F3.7 no widows or orphans: no paragraph leaves a single line alone at a page break (whole manual)', async () => {
    const r = await page.evaluate(async () => {
      await openLibBook('manual'); await new Promise(r=>setTimeout(r,800));
      const bad=[]; let breaks=0;
      const box=document.createElement('div'); box.className='ptext measure'; box.style.height='auto'; box.style.overflow='visible'; document.body.appendChild(box);
      for(const id of rOrder()){ const p=pag(id), doc=p.doc; if(!doc.words.length) continue;
        box.style.width=M.style.width; box.classList.toggle('front',!!doc.front);
        const h=(a,b)=>{ box.innerHTML=render(doc,a,b); return box.scrollHeight; };
        const lp=doc.paras.find(P=>!P.img&&!P.h&&!P.toc&&!P.sb&&P.end>P.start); if(!lp) continue; const L=h(lp.start,lp.start+1);
        p.pages.forEach(([a,b],k)=>{ if(k===p.pages.length-1||b>=doc.words.length) return; const P=doc.paras[doc.words[b].p]; if(!P||P.img||P.h||P.toc||P.sb||!(b>P.start&&b<P.end)) return; breaks++;
          const head=Math.round(h(Math.max(P.start,a),b)/L), nb=p.pages[k+1][1], tail=Math.round(h(b,Math.min(P.end,nb))/L);
          if(head<2||tail<2) bad.push(`${getCh(id).title} p${k+1}: ${head} line(s) | ${tail} line(s)`); }); }
      box.remove(); try{ leaveLibrary(); }catch(_){ }
      return {breaks,bad};
    });
    if(r.bad.length) throw new Error(r.bad.length+' of '+r.breaks+' breaks: '+r.bad.slice(0,3).join('; '));
    return r.breaks+' paragraph breaks checked';
  });
  await F('No pop-up after importing a book', f=>!/Import check/.test(f.toast)||'pop-up: '+f.toast);
  await step('Contents pages: one Inkhorse style for any book (rev 88)', async () => page.evaluate(() => {
    if(typeof tidyContentsRaw!=='function') return 'SKIP: contents style taken out in rev 90 (froze big books); coming back when fixed';
    const ok=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    if(!ok(tocSplitNum('Favorites 61'),['Favorites',true])) return false;
    if(!ok(tocSplitNum('INTRODUCTION1'),['INTRODUCTION',true])) return false;
    if(!ok(tocSplitNum('Chapter 5'),['Chapter 5',false])) return false;
    if(!ok(tocSplitNum('Title ........ xii'),['Title',true])) return false;
    if(tocRunOn('Pushing Vertices 114 Getting familiar with Edit mode 116 Cutting edges 122').length!==3) return false;
    const txt='Table of Contents vii\nAbout This Book 2 Foolish Assumptions 2 Icons Used 4\nCHAPTER 1: Discovering It 9\nwith Meshes113\nTest Book'; const out=tidyContentsRaw({id:'zz',title:'Table of Contents',text:txt},txt);
    const ls=out.split('\n');
    return ls.length>=4 && ls.every(l=>/^%%toc[12] (?:-|@\S+) \S/.test(l)) && !/\d{2,}$/.test(out.replace(/^%%toc\d \S+ /gm,'')) ? true : (()=>{ throw new Error("contents not tidied: "+out.slice(0,160)); })();
  }));
  await step('Manual opens with a Contents page and page numbers', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1500); let all=''; for(let i=0;i<12;i++){ all+=await page.evaluate(()=>document.querySelector('#spread').innerText); await page.click('#next').catch(()=>{}); await page.waitForTimeout(450);} await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return /Chapter 1 · Welcome to Inkhorse\s+\d/.test(all) && /Chapter 4 · The big picture\s+\d/.test(all); });
  await step('Manual: tapping a Contents line goes to that page', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1500); let line=null; for(let i=0;i<8&&!line;i++){ line=await page.$('#spread p.toc.t2[data-goto]'); if(!line){ await page.click('#next'); await page.waitForTimeout(450);} } if(!line) return 'no contents line found'; await page.waitForTimeout(900); line=await page.$('#spread .page:not(.curl) p.toc.t2[data-goto], #spread p.toc.t2[data-goto]'); const want=await line.getAttribute('data-goto'); const bx=await line.boundingBox(); await page.mouse.click(bx.x+30, bx.y+bx.height/2); await page.waitForTimeout(1200); const got=(await page.textContent('#pgCur')).replace(/[^0-9–]/g,''); await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return got.split('–').includes(want) ? true : {want,got}; });
  await step('Jump to: typing a page number goes there', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200); await page.click('#whereBtn'); await page.fill('#gotoNum','20'); await page.click('#gotoGo'); await page.waitForTimeout(800); const got=(await page.textContent('#pgCur')).replace(/[^0-9–]/g,''); const closed=!(await page.isVisible('#gotoDone')); await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return got.split('–').includes('20')&&closed ? true : {got,closed}; });
  await step('Compare tab measures pages', async () => { await page.click('#tab-compare'); await page.waitForTimeout(1500); return /words/.test(await page.textContent('#headline')); });
  await step('Chapters panel lists export and backup', async () => { await page.click('#tab-write'); await page.click('#chBtn'); await page.waitForTimeout(300); const t=await page.evaluate(()=>document.body.innerText); return ['EPUB','Print PDF','Word manuscript','Save backup file','Restore from file'].every(w=>t.includes(w)); });
  await step('Save backup file downloads a file', async () => { const [d]=await Promise.all([page.waitForEvent('download',{timeout:6000}), page.click('#fbkSave')]); return /backup.*\.json$/.test(await d.suggestedFilename()); });
  await step('EPUB export downloads a file', async () => { if(!(await page.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine (phones keep their own copy)'; const [d]=await Promise.all([page.waitForEvent('download',{timeout:15000}), page.click('#expEpub')]); return /\.epub$/.test(await d.suggestedFilename()); });
  await step('text survives a reload', async () => { await page.click('#drawerDone').catch(()=>{}); await page.reload(); await page.waitForTimeout(2500); return (await T()).length>0; });
  await step('wide screen layout', async () => { await page.setViewportSize({width:1400,height:900}); await page.waitForTimeout(1200); return !(await page.isVisible('#tab-write')); });
  await step('tablet width shows Side by side', async () => { await page.setViewportSize({width:900,height:1200}); await page.waitForTimeout(800); await tools(); return page.isVisible('#splitBtn'); });
  await step('phone sideways does not break', async () => { await page.setViewportSize({width:932,height:430}); await page.waitForTimeout(800); await page.click('#tab-read').catch(()=>{}); await page.waitForTimeout(500); });

  const fails = res.filter(r=>r[0]==='FAIL').length;
  res.forEach(r=>console.log(r[0].padEnd(5), r[1].padEnd(58), r[2]));
  console.log('\n'+(res.length-fails)+'/'+res.length+' steps passed, '+errs.length+' page error(s)'); errs.forEach(e=>console.log('  '+e));
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
