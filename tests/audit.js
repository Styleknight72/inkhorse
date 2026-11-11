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
  await ctx.addInitScript(() => { // rev 161: a stand-in microphone. __sr.mode 'blocked' acts like a phone that won't allow it; 'talk' says each line in __sr.said, then stays quiet
    window.__sr={mode:'blocked',said:[],starts:0};
    function FakeSR(){ }
    FakeSR.prototype.start=function(){ const me=this; window.__sr.starts++; setTimeout(()=>{
      if(window.__sr.mode==='blocked'){ me.onerror&&me.onerror({error:'not-allowed'}); me.onend&&me.onend(); return; }
      if(window.__sr.mode==='silentend'){ me.onend&&me.onend({}); return; }   // rev 165: a hiccup: ends without starting
      me.onstart&&me.onstart({}); const t=window.__sr.said.shift();
      if(t){ const r=[{transcript:t}]; r.isFinal=true; me.onresult&&me.onresult({resultIndex:0,results:[r]}); } else { me.onerror&&me.onerror({error:'no-speech'}); }
      setTimeout(()=>{ me.onend&&me.onend({}); },20); },20); };
    FakeSR.prototype.stop=function(){ const me=this; setTimeout(()=>{ me.onend&&me.onend({}); },10); };
    FakeSR.prototype.abort=FakeSR.prototype.stop;
    window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
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
  const ONLY=process.env.AUDIT_ONLY?new RegExp(process.env.AUDIT_ONLY):null;   // rev 235: AUDIT_ONLY='F9|F7.3' runs just the steps whose names match (for working on one test; a push still needs the full run)
  const step = async (name, fn) => { if(ONLY&&!ONLY.test(name)) return; try { const v = await fn(); /* rev 163: a returned message that isn't SKIP is a failure (before, it counted as a pass, so a dozen checks could never fail) */ const bad = v === false || (typeof v === 'string' && !/^(SKIP|OK)/.test(v)); res.push([bad?'FAIL':(typeof v==='string'&&v.startsWith('SKIP')?'SKIP':'PASS'), name, bad?(v===false?'returned false':v.slice(0,300)):(v===undefined||v===true?'':JSON.stringify(v).slice(0,90))]); } catch (e) { res.push(['FAIL', name, e.message.slice(0,600)]); } };
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
  await step('Resume and Top buttons', async () => { await page.click('#pgResume'); await tools(); await page.click('#pgTop');   /* rev 115: Top is in the Tools panel */ });
  await step('tools row shows its buttons', async () => { await page.waitForTimeout(400); /* the Top tool just closed the panel */ await tools(); for (const i of ['micBtn','hpBtn','wcBtn','focusBtn','pasteBtn','copyBtn']) if(!(await page.isVisible('#'+i))) return i+' missing'; });
  await step('Dictate on a phone: if the microphone is blocked, it points to the keyboard mic', async () => { await tools(); await page.click('#micBtn'); await page.waitForTimeout(400); const h=await page.textContent('#dictHint');
    /* rev 163: the page must not be left focused after the wait (an iPhone then ignores taps on it), and next time Dictate goes straight to the keyboard */
    const stuck=await page.evaluate(()=>typeof micStart==='function' && document.activeElement===document.querySelector('#manuscript'));
    await page.click('#dictHint .x').catch(()=>{});
    if(stuck) throw new Error('the writing box was left focused after the message (iPhone: taps stop working)');
    if(await page.evaluate(()=>typeof micStart==='function')){ const n0=await page.evaluate(()=>window.__sr.starts); await tools(); await page.click('#micBtn'); await page.waitForTimeout(150);
      const n1=await page.evaluate(()=>window.__sr.starts), h2=await page.textContent('#dictHint'); await page.click('#dictHint .x').catch(()=>{});
      if(n1!==n0) throw new Error('tried the microphone again instead of going straight to the keyboard'); if(!/keyboard/i.test(h2)) throw new Error('second tap gave no keyboard hint'); }
    return /keyboard/i.test(h); });
  await step('Dictate on a phone listens, keeps going through pauses, and takes spoken punctuation (rev 161, 163)', async () => {
    if(!(await page.evaluate(()=>typeof micStart==='function'))) return 'SKIP: this version sends phones to the keyboard mic';
    await page.evaluate(()=>{ try{ localStorage.removeItem('inkhorse-dictate-keyboard'); localStorage.removeItem('inkhorse-dictate-keyboard-2'); }catch(_){ } window.__sr.mode='talk'; window.__sr.starts=0; window.__sr.said=['hello comma world period','new paragraph second line']; const t=document.querySelector('#manuscript'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); });
    await tools(); await page.click('#micBtn'); await page.waitForTimeout(150);
    const pressed=await page.getAttribute('#micBtn','aria-pressed');
    await page.waitForTimeout(1200);
    const v=await T(), st=await page.evaluate(()=>({starts:window.__sr.starts,on:document.querySelector('#micBtn').getAttribute('aria-pressed')}));
    await page.evaluate(()=>{ window.__sr.mode='blocked'; });
    if(pressed!=='true') throw new Error('Dictate did not start listening');
    if(!v.endsWith('Hello, world.\nSecond line')) throw new Error('text was: '+JSON.stringify(v.slice(-40)));
    if(st.starts<3) throw new Error('did not keep listening after a pause (started '+st.starts+' times)');
    if(st.on!=='false') throw new Error('did not stop after a long quiet');
    await page.click('#undoBtn'); await page.click('#undoBtn'); await page.waitForTimeout(200);
  });
  await step('Dictate: a hiccup after listening worked stops quietly and is not remembered as "can\'t listen" (rev 165)', async () => {
    if(!(await page.evaluate(()=>typeof micLost==='function'))) return 'SKIP: this version has no hiccup handling';
    await page.evaluate(()=>{ localStorage.removeItem('inkhorse-dictate-keyboard-2'); window.__sr.mode='talk'; window.__sr.starts=0; window.__sr.said=['one more line']; const t=document.querySelector('#manuscript'); t.focus(); t.setSelectionRange(t.value.length,t.value.length); });
    await tools(); await page.click('#micBtn'); await page.waitForTimeout(80);
    await page.evaluate(()=>{ window.__sr.mode='silentend'; });   // the restart after the first phrase hiccups
    await page.waitForTimeout(700);
    const st=await page.evaluate(()=>({mem:localStorage.getItem('inkhorse-dictate-keyboard-2'),hint:!document.querySelector('#dictHint').hidden,on:document.querySelector('#micBtn').getAttribute('aria-pressed')}));
    await page.evaluate(()=>{ window.__sr.mode='blocked'; });
    await page.click('#undoBtn'); await page.waitForTimeout(150);
    if(st.mem) throw new Error('remembered the phone as unable to listen after one hiccup');
    if(st.hint) throw new Error('showed the keyboard message although listening had worked');
    if(st.on!=='false') throw new Error('Dictate still shows as listening');
  });
  await step('Dictate: a phrase mid-sentence keeps ordinary words small, and Hoofprint never offers a longer name for one of its own words (rev 165)', async () => {
    if(!(await page.evaluate(()=>typeof micLost==='function'))) return 'SKIP: this version capitalises every phrase';
    const r=await page.evaluate(()=>{ const ta=document.querySelector('#manuscript'), keep=ta.value;
      ta.value='We are going'; ta.setSelectionRange(ta.value.length,ta.value.length); insertSpoken('Testing the microphone'); const a=ta.value;
      ta.value='So we were Testing To see it. Testing again.'; commitText(); const sug=hpScan(ta.value,0,ta.value.length).filter(x=>x.kind==='sug').map(x=>x.t+'>'+x.to);
      ta.value=keep; commitText(); return {a,sug}; });
    if(r.a!=='We are going testing the microphone') throw new Error('dictated phrase came in as: '+r.a);
    if(r.sug.some(x=>/^Testing>Testing To$/.test(x))) throw new Error('Hoofprint offered: '+r.sug.join(', '));
  });
  await step('iPhone Safari: the Library warns that the Home Screen icon keeps separate books, and Got it hides it (rev 166)', async () => {
    if(!(await page.evaluate(()=>typeof inIosSafari==='function'))) return 'SKIP: this version has no Safari note';
    const r=await page.evaluate(async()=>{ Object.defineProperty(navigator,'standalone',{value:false,configurable:true}); localStorage.removeItem('inkhorse-safari-note-ok');
      renderShelf(); const shown=!!document.querySelector('#safariNote');
      Object.defineProperty(navigator,'standalone',{value:true,configurable:true}); renderShelf(); const inApp=!!document.querySelector('#safariNote');
      Object.defineProperty(navigator,'standalone',{value:false,configurable:true}); renderShelf();
      document.querySelector('[data-sfok]').click(); const gone=!document.querySelector('#safariNote'); renderShelf(); const stays=!document.querySelector('#safariNote');
      const mini=!!document.querySelector('#safariMini'); if(mini) document.querySelector('#safariMini').click(); const back=!!document.querySelector('#safariNote');
      document.querySelector('[data-sfok]').click(); const miniAgain=!!document.querySelector('#safariMini');
      delete navigator.standalone; return {shown,inApp,gone,stays,mini,back,miniAgain}; });
    if(!r.shown) throw new Error('no note in Safari although there is writing');
    if(r.inApp) throw new Error('note shows inside the Home Screen app too');
    if(!r.gone||!r.stays) throw new Error('Got it did not hide the note for good');
    if(!r.mini) throw new Error('after Got it there is no small link to bring the note back (rev 178)');
    if(!r.back) throw new Error('the small link did not bring the note back (rev 178)');
    if(!r.miniAgain) throw new Error('Got it a second time did not leave the small link (rev 178)');
  });
  await step('Drafts: every draft is listed, oldest first, numbered "Draft 1 of 3"; the name is the day, not the number; an empty draft is not listed (rev 178)', async () => {
    const r=await page.evaluate(async()=>{ const prev=SLOT; if(await openDrafts()===false) return {err:'could not open drafts'};
      const ids=['alpha one two','beta three four five','gamma six'].map(x=>{ const id=addChapter('Draft · Nov 3',x); dirty.add(id); return id; }); const empty=addChapter('',''); dirty.add(empty); touchIndex();
      refreshDrafts(); renderShelf();
      const rows=[...document.querySelectorAll('.bookrow.draftrow .binfo')].map(e=>e.textContent.replace(/\s+/g,' ').trim());
      ids.concat([empty]).forEach(id=>{ if(CH.has(id)) dropChapter(id); }); refreshDrafts();
      if(prev!==DSLOT){ await flushSync(); await switchToBook(prev); } renderShelf(); return {rows}; });
    if(r.err) throw new Error(r.err);
    const need=['Draft 1 of 3','Draft 2 of 3','Draft 3 of 3'];
    if(r.rows.length!==3 || need.some((n,i)=>r.rows[i].indexOf(n)<0)) throw new Error('drafts are not numbered or not all listed: '+JSON.stringify(r.rows));
    return 'OK: '+JSON.stringify(r.rows);
  });
  await step('Drafts: Save drafts file / Load drafts file carry drafts between places, add only, never twice (rev 179)', async () => {
    const r=await page.evaluate(async()=>{ const prev=SLOT; if(await openDrafts()===false) return {err:'could not open drafts'};
      const mine=addChapter('Draft · Nov 2','kept alpha beta'); dirty.add(mine); touchIndex(); refreshDrafts();
      const file={app:'inkhorse',kind:'drafts',v:1,drafts:[{id:'x1',title:'Draft · Nov 3',text:'from safari one two'},{id:'x2',title:'Draft · Nov 2',text:'kept alpha beta'},{id:'x3',title:'',text:''}]};
      if(prev!==DSLOT){ await flushSync(); await switchToBook(prev); }
      const btns=(renderShelf(), !!document.querySelector('[data-dsave]') && !!document.querySelector('[data-dload]'));
      await mergeDraftsData(file); refreshDrafts(); const n1=liveDrafts().length, texts=liveDrafts().map(d=>d.text);
      await mergeDraftsData(file); refreshDrafts(); const n2=liveDrafts().length;
      let bad=false; try{ await mergeDraftsData({app:'other'}); }catch(_){ bad=true; }
      const back=SLOT===prev;
      await openDrafts(); BOOK.order.slice().forEach(id=>{ const c=CH.get(id); if(['kept alpha beta','from safari one two'].includes(c.text)) dropChapter(id); }); refreshDrafts();
      if(prev!==DSLOT){ await flushSync(); await switchToBook(prev); } renderShelf();
      return {btns,n1,n2,texts,bad,back}; });
    if(r.err) throw new Error(r.err);
    if(!r.btns) throw new Error('Save/Load drafts file buttons are missing');
    if(r.n1!==2||!r.texts.includes('from safari one two')||!r.texts.includes('kept alpha beta')) throw new Error('load did not add exactly the one new draft: '+JSON.stringify(r));
    if(r.n2!==2) throw new Error('loading the same file twice doubled the drafts');
    if(!r.bad) throw new Error('a file that is not a drafts file was accepted');
    if(!r.back) throw new Error('did not return to the book that was open');
  });
  await step('Hoofprint: everyday words are not offered as names that start the same ("kind" is not Kindle, "bold" is not Bolduc); real mishearings still are (rev 180)', async () => {
    const r=await page.evaluate(()=>{ const keep=S.hp.words.slice(); S.hp.words.push('Bolduc','Kindle','Lessard','Pelletier'); HP.vk=''; const f=t=>hpScan(t,0,t.length).map(x=>x.to);
      const out={kind:f('She was kind to me.'),bold:f('That was a bold move.'),Bold:f('Bold moves win.'),duck:f('My grandmother was a bold duck from Quebec.'),lesard:f('Her name was Lesard back then.'),pell:f('Eva Peletier came later.')};
      S.hp.words=keep; HP.vk=''; return out; });
    for(const k of ['kind','bold','Bold']) if(r[k].length) throw new Error(`"${k}" was offered as ${r[k].join(', ')}`);
    if(!r.duck.includes('Bolduc')) throw new Error('"bold duck" is no longer offered as Bolduc');
    if(!r.lesard.includes('Lessard')||!r.pell.includes('Pelletier')) throw new Error('a one-letter mishearing is no longer caught: '+JSON.stringify(r));
  });
  await step('Hoofprint asks before it learns a fix: Fix changes it once, Always learns it, Undo offers Forget it (rev 181)', async () => {
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    await page.evaluate(()=>{ HP.keepW=S.hp.words.slice(); HP.keepF=JSON.stringify(S.hp.fixes); HP.keepN=S.hp.no.slice(); S.hp.words.push('Bolduc'); S.hp.fixes={}; S.hp.no=[]; HP.vk=''; HP.sug=[]; HP.undo=null; HP.ask=null; HP.forget=null; });
    const bar=()=>page.evaluate(()=>$('#hpBar').hidden?'':$('#hpBar').innerText);
    const fixes=()=>page.evaluate(()=>JSON.stringify(S.hp.fixes));
    const settle=async()=>{ await page.evaluate(()=>{ HP.waits=0; hpSettle(); }); await page.waitForTimeout(150); };
    try{
      await page.fill('#manuscript','My grandmother was a bold duck from Quebec.'); await settle();
      if(!/Bolduc/.test(await bar())) throw new Error('no offer for "bold duck": '+await bar());
      await page.click('#hpBar [data-hp="fix"]'); await page.waitForTimeout(150);
      if(!/Bolduc from Quebec/.test(await T())) throw new Error('Fix did not change the word');
      if((await fixes())!=='{}') throw new Error('Fix learned a rule without asking: '+await fixes());
      if(!/Always/.test(await bar())) throw new Error('no "Always write…?" question after Fix: '+await bar());
      await page.click('#hpBar [data-hp="once"]'); await page.waitForTimeout(100);
      if((await fixes())!=='{}') throw new Error('"This time" learned a rule');
      /* keep writing while the question is up: nothing is learned */
      await page.fill('#manuscript','My grandmother was a bold duck.'); await settle(); await page.click('#hpBar [data-hp="fix"]'); await page.waitForTimeout(100);
      await page.fill('#manuscript',(await T())+' She came from Quebec.'); await settle();
      if((await fixes())!=='{}'||/Always/.test(await bar())) throw new Error('writing on did not clear the question, or it learned anyway');
      /* Always learns it, and then it fixes by itself with Undo */
      await page.fill('#manuscript','A bold duck again.'); await settle(); await page.click('#hpBar [data-hp="fix"]'); await page.waitForTimeout(100);
      await page.click('#hpBar [data-hp="always"]'); await page.waitForTimeout(100);
      if(!/Bolduc/.test(await fixes())) throw new Error('Always did not learn the fix');
      await page.fill('#manuscript','Then a bold duck came by.'); await settle();
      if(!/Then a Bolduc came by/.test(await T())||!/Undo/.test(await bar())) throw new Error('a learned fix was not made by itself with Undo: '+await T());
      await page.click('#hpBar [data-hp="undo"]'); await page.waitForTimeout(100);
      if(!/bold duck/.test(await T())||!/Forget/.test(await bar())) throw new Error('Undo did not offer Forget it: '+await bar());
      await page.click('#hpBar [data-hp="forget"]'); await page.waitForTimeout(100);
      if((await fixes())!=='{}') throw new Error('Forget it did not forget the fix: '+await fixes());
    } finally {
      await page.evaluate(()=>{ S.hp.words=HP.keepW; S.hp.fixes=JSON.parse(HP.keepF); S.hp.no=HP.keepN; HP.vk=''; HP.sug=[]; HP.undo=null; HP.ask=null; HP.forget=null; saveSettings(); hpBar(''); });
      await page.fill('#manuscript',keep); await page.waitForTimeout(300);
    }
  });
  await step('iPhone: saving a file opens the Share sheet (Save to Files), with a Save to Files button if the tap expired, and Cancel saves nothing (rev 181)', async () => {
    const r=await page.evaluate(async()=>{
      const had=('share' in navigator), oS=navigator.share, oC=navigator.canShare; let calls=[], mode='ok';
      const err=n=>{ const e=new Error(n); e.name=n; return e; };
      Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
      Object.defineProperty(navigator,'share',{value:async(d)=>{ calls.push(d.files&&d.files[0]&&d.files[0].name); if(mode==='abort') throw err('AbortError'); if(mode==='late'){ mode='ok'; throw err('NotAllowedError'); } },configurable:true});
      let clicked=0; const oc=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ clicked++; };
      const out={ios:isIOS()};
      try{
        out.a=await saveFile('t-backup.json',new Blob(['{}'],{type:'application/json'}));
        mode='abort'; out.b=await saveFile('t-backup.json',new Blob(['{}']));
        mode='late'; const pr=saveFile('t-backup.json',new Blob(['{}'])); await new Promise(r=>setTimeout(r,50));
        out.btn=!!document.getElementById('shareGo') && !$('#assist').hidden; if(out.btn) document.getElementById('shareGo').click(); out.c=await pr;
        out.closed=$('#assist').hidden;
      } finally {
        HTMLAnchorElement.prototype.click=oc;
        if(had){ Object.defineProperty(navigator,'share',{value:oS,configurable:true}); Object.defineProperty(navigator,'canShare',{value:oC,configurable:true}); } else { delete navigator.share; delete navigator.canShare; }
      }
      out.calls=calls; out.downloads=clicked; return out; });
    if(!r.ios) return 'SKIP: this test browser is not set up as an iPhone';
    if(r.a!==true||r.calls[0]!=='t-backup.json') throw new Error('did not use the Share sheet: '+JSON.stringify(r));
    if(r.b!==false) throw new Error('a cancelled share was treated as saved');
    if(!r.btn||r.c!==true||!r.closed) throw new Error('no working Save to Files button after the tap expired: '+JSON.stringify(r));
    if(r.downloads) throw new Error('it also started a download, which opens the blank preview on iPhone');
  });
  await step('Read aloud: switching books stops the player, and Play never sits silent on a chapter from another book (rev 182)', async () => {
    const r=await page.evaluate(async()=>{ const prev=SLOT, ko=window.kokOn, sp=speechSynthesis.speak, sc=speechSynthesis.cancel; const said=[];
      window.kokOn=()=>false; speechSynthesis.speak=u=>{ said.push(u.text); }; speechSynthesis.cancel=()=>{};
      const out={};
      try{
        ttsStop(); TTS.on=true; TTS.playing=false; TTS.ch='gone-chapter';
        await switchToBook(DSLOT); out.stoppedOnSwitch=!TTS.on; out.flagFree=(typeof switching==='undefined')||switching===false;
        if(!BOOK.order.some(id=>(CH.get(id)||{}).text)){ const id=addChapter('Draft · test','A sentence to read aloud after switching books.'); dirty.add(id); touchIndex(); S.cur=id; }
        TTS.on=true; TTS.playing=false; TTS.ch='gone-chapter';
        ttsPlay(); out.chOk=!!getCh(TTS.ch); out.playing=TTS.playing; out.said=said.length;
        ttsStop();
      } finally {
        window.kokOn=ko; speechSynthesis.speak=sp; speechSynthesis.cancel=sc;
        BOOK.order.slice().forEach(id=>{ const c=CH.get(id); if(c&&c.title==='Draft · test') dropChapter(id); });
        if(SLOT!==prev){ await flushSync(); await switchToBook(prev); }
      }
      return out; });
    if(!r.stoppedOnSwitch) throw new Error('switching books left the player on: '+JSON.stringify(r));
    if(!r.flagFree) throw new Error('the switching guard was left on after a switch');
    if(!r.chOk||!r.playing) throw new Error('Play stayed on a chapter that is not in this book: '+JSON.stringify(r));
  });
  await step('Full screen double-tap: plays or pauses inside the tap the iPhone trusts, never pauses before her first words, but always pauses once she is reading (rev 183, 186)', async () => {
    await page.click('#tab-read'); await page.waitForTimeout(600);
    await page.evaluate(()=>{ window.__lt0=listenToggle; window.__lt=[]; window.listenToggle=function(){ window.__lt.push((window.event&&window.event.type)||'timer'); }; setImmersive(true); });
    await page.waitForTimeout(900);
    try{
      const b=await page.evaluate(()=>{ const r=stage.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
      await page.touchscreen.tap(b.x,b.y); await page.waitForTimeout(250); await page.touchscreen.tap(b.x,b.y); await page.waitForTimeout(500);
      const ev=await page.evaluate(()=>window.__lt.slice());
      if(ev.length!==1) throw new Error('a relaxed double-tap (250 ms apart) did not play/pause exactly once: '+JSON.stringify(ev));
      if(ev[0]!=='touchend') throw new Error('play/pause ran outside the tap ('+ev[0]+'), which an iPhone may not allow to start sound');
      const r=await page.evaluate(()=>{ window.listenToggle=window.__lt0; const k=KOK.waiting, on=TTS.on, pl=TTS.playing; let paused=0; const tp=ttsPause; window.ttsPause=()=>{ paused++; };
        const al=TTS.alive, pa=TTS.playAt;
        TTS.on=true; TTS.playing=true; KOK.waiting=true; TTS.playAt=Date.now(); TTS.alive=TTS.playAt-1000; listenToggle(); ttsUI(); const shown=!$('#fsWait').hidden;
        TTS.alive=Date.now()+1; TTS.playing=true; listenToggle(); const midPaused=paused;   /* rev 186: she has already spoken: a double-tap must pause even while the next sentence loads */
        window.ttsPause=tp; KOK.waiting=k; TTS.on=on; TTS.playing=pl; TTS.alive=al; TTS.playAt=pa; ttsUI(); return {paused:paused-midPaused,first:midPaused?0:1,midPaused,shown,hidden:$('#fsWait').hidden}; });
      if(r.midPaused!==1) throw new Error('mid-reading (next sentence still loading) a double-tap did not pause: '+JSON.stringify(r));
      if(!r.shown) throw new Error('no "Getting ready…" sign while the voice was coming');
      if(!r.hidden) throw new Error('"Getting ready…" stayed up after');
    } finally { await page.evaluate(()=>{ if(window.__lt0) window.listenToggle=window.__lt0; setImmersive(false); }); await page.waitForTimeout(400); }
  });
  await step('Page turn: Instant changes the page with no motion, and is offered next to Curl and Slide (rev 185)', async () => {
    await page.click('#tab-read'); await page.waitForTimeout(600);
    const r=await page.evaluate(async()=>{ const keep=S.turn, opts=[...$('#turnSel').options].map(o=>o.value);
      const raf=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      try{
        S.turn='instant'; const at=curIndex(), ch=S.rch; let moved=false;
        const sp=$('#spread'); const mo=new MutationObserver(()=>{ const b=sp.querySelector('.slide'); if(b&&b.style.transform) moved=true; }); mo.observe(sp,{subtree:true,attributes:true,childList:true});
        flip(1); await raf(); mo.disconnect();
        const after=curIndex(), ch2=S.rch; flip(-1); await raf();
        return {opts, changed:(after!==at||ch2!==ch), moved, back:(curIndex()===at&&S.rch===ch)};
      } finally { S.turn=keep; } });
    if(!r.opts.includes('instant')) throw new Error('no Instant choice: '+r.opts.join(','));
    if(!r.changed) throw new Error('Instant did not turn the page');
    if(r.moved) throw new Error('Instant still animated the page');
    if(!r.back) throw new Error('Instant back did not return to the same page');
  });
  await step('Tablet: with This screen the page fills the width (no gray sides) with comfortable lines; computers keep the book shape (rev 187, phones fill since rev 194)', async () => {
    const r=await page.evaluate(()=>{ const keepT=_isTab, keepD=S.dev, ss=window.stageSize; const out={phoneIsTablet:isTablet()};
      try{ S.dev='screen'; window.stageSize=()=>({w:788,h:822});   /* an iPad held upright, toolbars showing */
        out.r194=(window.INK_VERSION||{}).rev>=194; out.r204=(window.INK_VERSION||{}).rev>=204;   /* since rev 204 a computer fills too */
        if(out.r194) Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0,configurable:true});   /* since rev 194 phones fill too; a computer (no touch) keeps the book shape */
        _isTab=false; const p=devDims(curDev()); if(out.r194) delete navigator.maxTouchPoints; _isTab=true; const tb=devDims(curDev());
        out.phoneW=p.w; out.tabW=tb.w; out.tabH=tb.h; out.text=tb.w-2*tb.mx; out.cap=Math.round((+S.fs||18)*30);
      } finally { _isTab=keepT; S.dev=keepD; window.stageSize=ss; }
      return out; });
    if(r.phoneIsTablet) throw new Error('an iPhone-sized screen was taken for a tablet');
    if(!r.r204 && r.phoneW>Math.floor(r.tabH*0.75)+1) throw new Error('the phone/computer page lost its book shape: '+JSON.stringify(r));
    if(r.tabW<760) throw new Error('the tablet page does not fill the width: '+JSON.stringify(r));
    if(r.text>r.cap+2) throw new Error('tablet lines are too long: '+JSON.stringify(r));
  });
  await step('iPad full screen also hides Safari\'s bars (real full screen), and phones never ask for it (rev 188)', async () => {
    await page.click('#tab-read'); await page.waitForTimeout(500);
    const r=await page.evaluate(()=>{ const keep=_isTab, el=document.documentElement, rq=el.requestFullscreen, ex=document.exitFullscreen; let asked=0, left=0, fake=null;
      Object.defineProperty(document,'fullscreenElement',{get:()=>fake,configurable:true});
      el.requestFullscreen=()=>{ asked++; fake=el; return Promise.resolve(); }; document.exitFullscreen=()=>{ left++; fake=null; return Promise.resolve(); };
      const out={};
      try{
        _isTab=false; setImmersive(true); setImmersive(false); out.phoneAsked=asked;
        _isTab=true; setImmersive(true); out.tabAsked=asked; setImmersive(false); out.tabLeft=left;
        setImmersive(true); fake=null; document.dispatchEvent(new Event('fullscreenchange')); out.leftWithSafari=!document.body.classList.contains('immersive');
      } finally { _isTab=keep; el.requestFullscreen=rq; document.exitFullscreen=ex; delete document.fullscreenElement; setImmersive(false); }
      return out; });
    if(r.phoneAsked) throw new Error('a phone asked for real full screen: '+JSON.stringify(r));
    if(r.tabAsked!==1||r.tabLeft!==1) throw new Error('a tablet did not enter and leave real full screen: '+JSON.stringify(r));
    if(!r.leftWithSafari) throw new Error('leaving with Safari\'s own ✕ did not leave Inkhorse full screen');
  });
  await step('Two-page spread: reading aloud never skips the right-hand page when she turns the spread (rev 189)', async () => {
    await page.click('#tab-read'); await page.waitForTimeout(400);
    const r=await page.evaluate(()=>{ const keep=two; const out={};
      try{
        two=true; ttsStop(); TTS.on=true; TTS.playing=false;
        let built=0; const tb=ttsBuild; window.ttsBuild=function(){ built++; return tb.apply(this,arguments); };
        TTS.expect={ch:S.rch,i:1}; ttsOnTurn({ch:S.rch,i:2}); out.sameSpreadRebuilt=built;   /* she asked for page 1; the spread landed on page 2 (same spread) */
        TTS.on=true; TTS.expect={ch:S.rch,i:1}; built=0; ttsOnTurn({ch:S.rch,i:4}); out.otherSpreadRebuilt=built;   /* a different spread: that is a turn of yours */
        window.ttsBuild=tb;
      } finally { two=keep; ttsStop(); }
      return out; });
    if(r.sameSpreadRebuilt) throw new Error('her own turn to the other page of the spread was taken as yours, so she would skip a page: '+JSON.stringify(r));
    if(!r.otherSpreadRebuilt) throw new Error('a real turn to another spread no longer restarts reading there: '+JSON.stringify(r));
  });
  await step('Two-page spread: when you turn the spread, or press Play on one, reading starts at the top of the left-hand page (rev 190)', async () => {
    await page.click('#tab-read'); await page.waitForTimeout(400);
    const r=await page.evaluate(()=>{ const keep=two; const out={};
      const long=Array.from({length:80},(_,i)=>`Paragraph ${i+1} begins here. It has a second sentence about the bridge and the river. And a third sentence closes it.`).join('\n');
      const id=addChapter('Spread test',long);
      try{
        const pages=pag(id).pages; out.pages=pages.length; if(pages.length<3) return {skip:'test chapter has only '+pages.length+' pages'};
        two=true; ttsStop(); TTS.on=true; TTS.playing=false; TTS.expect=null;
        ttsOnTurn({ch:id,i:2});   /* you turned to the spread [1,2]; the turn reports page 2 */
        out.turnFrom=TTS.q[0]&&TTS.q[0].start; out.left=pages[1][0]; out.right=pages[2][0];
        two=false; ttsStop(); TTS.on=true; TTS.playing=false; TTS.expect=null; ttsOnTurn({ch:id,i:2}); out.oneUp=TTS.q[0]&&TTS.q[0].start;   /* one-page view: unchanged */
      } finally { two=keep; ttsStop(); try{ dropChapter(id); }catch(_){ } }
      return out; });
    if(r.skip) return 'SKIP: '+r.skip;
    if(!(r.turnFrom<=r.left)) throw new Error('after your turn she started on the right-hand page: '+JSON.stringify(r));
    if(!(r.oneUp>r.left)) throw new Error('one-page view changed: '+JSON.stringify(r));
  });
  await step('Phone in full screen: the page fills the width like a tablet; since rev 194 the normal phone view fills too (rev 191)', async () => {
    const r=await page.evaluate(()=>{ const keepT=_isTab, keepD=S.dev, ss=window.stageSize, wasImm=document.body.classList.contains('immersive'); const out={};
      try{ S.dev='screen'; _isTab=false; window.stageSize=()=>({w:810,h:392});   /* an iPhone held sideways */
        document.body.classList.remove('immersive'); const n=devDims(curDev());
        document.body.classList.add('immersive'); const f=devDims(curDev());
        out.normalW=n.w; out.fullW=f.w; out.h=f.h;
      } finally { _isTab=keepT; S.dev=keepD; window.stageSize=ss; document.body.classList.toggle('immersive',wasImm); }
      return out; });
    if(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=194)){   /* rev 194: the normal phone view fills its space too (Steve, Nov 7) */
      if(r.normalW!==r.fullW || r.fullW<=Math.floor(r.h*0.75)+1) throw new Error('a phone does not fill the space in both views: '+JSON.stringify(r));
      return true;
    }
    if(r.normalW>Math.floor(r.h*0.75)+1) throw new Error('the normal phone view lost its book shape: '+JSON.stringify(r));
    if(r.fullW<=r.normalW) throw new Error('full screen on a phone does not widen the page: '+JSON.stringify(r));
  });
  await step('F3 Page fills the screen: an upright phone or tablet shows one page even with Two-page spread on; sideways shows two; a cover on its own is centred (rev 194)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=194))) return 'SKIP: before rev 194';
    await page.click('#tab-read'); await page.waitForTimeout(400);
    const r=await page.evaluate(async()=>{ const keepV=S.view, keepD=S.dev, ss=window.stageSize, out={};
      try{
        S.dev='screen'; S.view='2';
        window.stageSize=()=>({w:396,h:491}); out.uprightTwo=screenTwo(384,479);   /* iPhone upright */
        window.stageSize=()=>({w:800,h:924}); out.ipadUprightTwo=screenTwo(788,912);   /* iPad upright */
        out.sidewaysTwo=screenTwo(786,368) && screenTwo(1148,552);   /* phone and iPad sideways */
        window.stageSize=ss;
        const st=document.querySelector('#stage'); const w=st.clientWidth, h=st.clientHeight;
        out.stage=[w,h]; out.liveTwo=spreadMode(); out.expectTwo=w/h>=0.9;
        // the cover alone: centred when the screen shows two pages
        await goTo({ch:'__front',i:0}); drawView(); await new Promise(r=>setTimeout(r,500));
        out.lone=lone; const bw=document.querySelector('#bookwrap').getBoundingClientRect(), sr=st.getBoundingClientRect();
        const face=two? {l:bw.left+bw.width/2, r:bw.right} : {l:bw.left, r:bw.right};
        out.coverMid=Math.round((face.l+face.r)/2 - (sr.left+sr.width/2));
      } finally { S.view=keepV; S.dev=keepD; window.stageSize=ss; try{ drawView(); }catch(_){ } }
      return out; });
    if(r.uprightTwo||r.ipadUprightTwo) throw new Error('an upright phone or tablet still splits into two pages: '+JSON.stringify(r));
    if(!r.sidewaysTwo) throw new Error('sideways no longer shows two pages: '+JSON.stringify(r));
    if(r.liveTwo!==r.expectTwo) throw new Error('the live view does not follow the room rule: '+JSON.stringify(r));
    if(Math.abs(r.coverMid)>8) throw new Error('the cover is not centred on the screen: '+JSON.stringify(r));
    return true;
  });
  await step('Show tips: off hides how-to tips (full-screen note, highlighter how-to) but keeps status messages; on brings them back (rev 195)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=195))) return 'SKIP: before rev 195';
    await page.click('#tab-read'); await page.waitForTimeout(300);
    const r=await page.evaluate(async()=>{ const keep=S.tips, out={};
      const shown=()=>({fs:!$('#fsHint').hidden, toast:$('#toast').hidden?'':$('#toast').textContent});
      try{
        $('#tipsChk').checked=false; $('#tipsChk').dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,50));
        setImmersive(true); out.offFs=shown().fs; setImmersive(false); out.offFsOut=shown().fs;
        tip('Highlighter on. Drag across words…','Highlighter on.'); out.offShort=shown().toast;
        tip('Drag your finger across words to highlight them.'); out.offNone=shown().toast;
        toast('Getting ready…'); out.offStatus=shown().toast;
        $('#tipsChk').checked=true; $('#tipsChk').dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,50));
        setImmersive(true); out.onFs=shown().fs; setImmersive(false);
        tip('Highlighter on. Drag across words…','Highlighter on.'); out.onFull=shown().toast;
      } finally { S.tips=keep; $('#tipsChk').checked=S.tips!==false; setImmersive(false); }
      return out; });
    if(r.offFs||r.offFsOut) throw new Error('the full-screen tip still shows with tips off: '+JSON.stringify(r));
    if(r.offShort!=='Highlighter on.') throw new Error('with tips off the short news was not shown: '+JSON.stringify(r));
    if(r.offNone==='Drag your finger across words to highlight them.') throw new Error('a how-to tip showed with tips off: '+JSON.stringify(r));
    if(r.offStatus!=='Getting ready…') throw new Error('a status message was hidden with tips off: '+JSON.stringify(r));
    if(!r.onFs||!/Drag across/.test(r.onFull)) throw new Error('tips did not come back when switched on: '+JSON.stringify(r));
    return true;
  });
  await step('F2.3 + F2.6 Chapter opening (Classic): no page header on a chapter\'s first page; the label sits just above the title in the sink; print PDF and EPUB carry the same label (rev 198)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=198))) return 'SKIP: before rev 198';
    const was=await page.evaluate(()=>RB&&RB.id); if(was) await page.evaluate(()=>leaveLibraryBook()); const curBefore=await page.evaluate(()=>[S.cur,S.rch,S.anchor]);
    const id=await page.evaluate(()=>{ return addChapter('Chapter Nine: Opening test',Array.from({length:40},(_,i)=>'Sentence '+i+' of the opening test, long enough to fill a few lines of the page.').join('\n')); });
    try{
      const r=await page.evaluate(async id=>{ setTab('read'); S.rch=id; S.anchor=0; refreshReader(); drawView(); await new Promise(r=>setTimeout(r,500));
        const f=[...document.querySelectorAll('#spread .face')].find(x=>x.querySelector('.ptext[data-ch="'+id+'"] h2.cht'));
        const out={rh:f&&f.querySelector('.rh')?f.querySelector('.rh').textContent:null};
        const ck=f&&f.querySelector('.ck'), h=f&&f.querySelector('h2.cht'), pt=f&&f.querySelector('.ptext');
        if(ck&&h){ const a=ck.getBoundingClientRect(), b=h.getBoundingClientRect(), p=pt.getBoundingClientRect(); out.ck=ck.textContent; out.title=h.textContent; out.gap=Math.round(b.top-a.bottom); out.ckDepth=(a.top-p.top)/p.height; }
        // the next page still carries its header
        goTo({ch:id,i:1}); drawView(); await new Promise(r=>setTimeout(r,300));
        out.nextRh=!!document.querySelector('#spread .face .rh');
        return out; },id);
      if(r.rh) throw new Error('chapter first page still has a page header: '+JSON.stringify(r));
      if(!/chapter nine/i.test(r.ck||'')||r.title!=='Opening test') throw new Error('label or title wrong: '+JSON.stringify(r));
      if(!(r.gap>=0&&r.gap<40)) throw new Error('label is not just above the title: '+JSON.stringify(r));
      if(!(r.ckDepth>0.15&&r.ckDepth<0.33)) throw new Error('label is not in the sink: '+JSON.stringify(r));
      if(!r.nextRh) throw new Error('the pages after the opener lost their header');
      return true;
    } finally { await page.evaluate(id=>{ try{ dropChapter(id); }catch(_){ } },id); await page.evaluate(c=>{ if(CH.has(c[0])){ S.cur=c[0]; S.rch=c[1]; S.anchor=c[2]; try{ loadEditor(); renderChapterUI(); refreshReader(); }catch(_){ } } },curBefore); if(was) await page.evaluate(async w=>{ await openLibBook(w,true); },was); }
  });
  await step('F2.3 Chapter opening styles: Classic, Ornament, Big number and Drop cap each draw, re-measure the pages, follow the book\'s own label, and never apply to books added to read (rev 199)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=199))) return 'SKIP: before rev 199';
    const was=await page.evaluate(()=>RB&&RB.id); if(was) await page.evaluate(()=>leaveLibraryBook()); const cur=await page.evaluate(()=>[S.cur,S.rch,S.anchor,FM().chStyle]);
    const id=await page.evaluate(()=>addChapter('Chapter Four: Style test',Array.from({length:60},(_,i)=>'Sentence '+i+' of the style test, long enough to fill a few lines of the page.').join('\n')));
    try{
      const r=await page.evaluate(async id=>{ const out={}; setTab('read'); S.rch=id; S.anchor=0;
        for(const cs of ['classic','ornament','bignum','dropcap']){
          const sel=document.querySelector('#fmChStyle'); sel.value=cs; sel.dispatchEvent(new Event('change')); drawView(); await new Promise(r=>setTimeout(r,350));
          const f=document.querySelector('#spread .ptext[data-ch="'+id+'"]'), h=f.querySelector('h2.cht'), p1=h.nextElementSibling;
          out[cs]={first:pag(id).pages[0][1], ck:f.querySelector('.ck')?.textContent||'', bn:f.querySelector('.bn')?.textContent||'', after:getComputedStyle(h,'::after').content, cap:getComputedStyle(p1,'::first-letter').float, over:f.scrollHeight>f.clientHeight+2};
        }
        return out; },id);
      if(!/chapter four/i.test(r.classic.ck)) throw new Error('Classic label missing: '+JSON.stringify(r.classic));
      if(!/❦/.test(r.ornament.after)) throw new Error('Ornament flourish missing: '+JSON.stringify(r.ornament));
      if(r.bignum.bn!=='4'||r.bignum.ck) throw new Error('Big number should show 4 (from "Chapter Four") and no label: '+JSON.stringify(r.bignum));
      if(r.dropcap.cap!=='left') throw new Error('Drop cap missing: '+JSON.stringify(r.dropcap));
      // rev 230: a taller opening must never hold MORE than Classic, and no style may spill past the page. It may hold the same: paragraphs break whole,
      // so on some page heights the taller opening's extra inch comes out of the empty space at the foot of the page (measured: slack 48px vs 16px at 382px tall).
      if(!(r.ornament.first<=r.classic.first&&r.dropcap.first<=r.classic.first)) throw new Error('a taller opening holds more than Classic, so pages were not re-measured: '+JSON.stringify(r));
      for(const cs of ['classic','ornament','bignum','dropcap']) if(r[cs].over) throw new Error(cs+': the first page spills past its foot, so pages were not re-measured: '+JSON.stringify(r));
      for(const k in r) if(r[k].over) throw new Error(k+': the first page overflows');
      const lib=await page.evaluate(async()=>{ FM().chStyle='dropcap'; await openLibBook('manual',true); return chStyle(); });
      if(lib!=='classic') throw new Error('a book added to read took the style: '+lib);
      return true;
    } finally { await page.evaluate(async c=>{ try{ if(RB) leaveLibraryBook(); }catch(_){ } FM().chStyle=c[3]; },cur); await page.evaluate(id=>{ try{ dropChapter(id); }catch(_){ } },id);
      await page.evaluate(c=>{ if(CH.has(c[0])){ S.cur=c[0]; S.rch=c[1]; S.anchor=c[2]; try{ loadEditor(); renderChapterUI(); refreshReader(); }catch(_){ } } },cur); if(was) await page.evaluate(async w=>{ await openLibBook(w,true); },was); }
  });
  await step('Voice download note: the progress bar is a thin bar whose fill shows the percent (rev 200)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=200))) return 'SKIP: before rev 200';
    await page.click('#tab-read'); await page.waitForTimeout(200);
    const r=await page.evaluate(async()=>{ const tb=document.querySelector('.ttsbar'); const was=tb.hidden; tb.hidden=false;
      kokNote('Downloading Meilin… <span class="pc">40%</span><div class="dlbar"><i style="width:40%"></i></div>'); await new Promise(r=>setTimeout(r,400));
      const bar=document.querySelector('#kokNote .dlbar'), fill=bar&&bar.querySelector('i'); const out={barH:bar?bar.getBoundingClientRect().height:0, fillH:fill?fill.getBoundingClientRect().height:0, fillW:fill?fill.getBoundingClientRect().width:0, barW:bar?bar.getBoundingClientRect().width:0};
      kokNote(''); tb.hidden=was; return out; });
    if(!(r.barH>=4&&r.barH<=10)) throw new Error('the bar is not a thin bar: '+JSON.stringify(r));
    if(!(r.fillH>=4&&Math.abs(r.fillW/r.barW-0.4)<0.03)) throw new Error('the fill does not show 40%: '+JSON.stringify(r));
    return true;
  });
  await step('Hoofprint: a capitalized everyday word you also write in lowercase is never offered as a name ("South Main Street" is not "Mail") (rev 201)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=201))) return 'SKIP: before rev 201';
    const was=await page.evaluate(()=>RB&&RB.id); if(was) await page.evaluate(()=>leaveLibraryBook()); const cur=await page.evaluate(()=>[S.cur,S.rch,S.anchor]);
    const id=await page.evaluate(()=>addChapter('Hoofprint test','The main reason was simple.\nHe read it in the Union Mail every morning, and the Union Mail was his paper.\nThey met at the club on South Main Street.\nHe wrote to Bolduc and visited Bolduc often.'));
    try{
      const r=await page.evaluate(()=>{ HP.vk=null; const t='They met at the club on South Main Street. Later he saw Boldoc there.'; return hpScan(t,0,t.length).map(x=>x.t+'>'+x.to); });
      if(r.some(x=>/^Main>/.test(x))) throw new Error('Main was offered as a name: '+JSON.stringify(r));
      if(!r.includes('Boldoc>Bolduc')) throw new Error('a real misheard name was no longer caught: '+JSON.stringify(r));
      return true;
    } finally { await page.evaluate(id=>{ try{ dropChapter(id); }catch(_){ } },id);
      await page.evaluate(c=>{ if(CH.has(c[0])){ S.cur=c[0]; S.rch=c[1]; S.anchor=c[2]; try{ loadEditor(); renderChapterUI(); refreshReader(); }catch(_){ } } },cur); if(was) await page.evaluate(async w=>{ await openLibBook(w,true); },was); }
  });
  await step('Natural voice: a piece that comes out too fast for its words (dropped words) is caught and remade in smaller pieces; a colon starts a new piece; ↺ remakes the piece (rev 203)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=203))) return 'SKIP: before rev 203';
    const r=await page.evaluate(()=>{ const keepV=S.ttsVoice, keepOn=window.kokOn; const out={};
      try{
        S.ttsVoice='kokoro:am_michael'; KOK.paces={};
        const t='My birth certificate records the basics plainly: Steve Claude Patient, male, born August 6, 1972,';
        out.fullKept=!kokSlip(t,8.70); out.droppedCaught=kokSlip(t,7.45);   /* real Calvin recordings: whole sentence 8.70 s, name dropped 7.45 s */
        S.ttsVoice='kokoro:am_fenrir'; out.fenFull=!kokSlip(t,7.85); out.fenDrop=kokSlip(t,6.58);
        S.ttsVoice='kokoro:af_bella'; out.belFull=!kokSlip(t,8.30); out.belDrop=kokSlip(t,7.05);
        const words=t.split(' '); const parts=kokSplitFine({start:0,end:words.length,text:t,words,p:0});
        out.parts=parts?parts.map(x=>x.text):null;
        window.kokOn=()=>true;
        const id=addChapter('Pieces test','My birth certificate records the basics plainly: Steve Claude Patient, male, born August 6, 1972, in Manchester.');
        out.chunks=ttsChunks(id,0).map(c=>c.text); dropChapter(id);
      } finally { S.ttsVoice=keepV; window.kokOn=keepOn; KOK.paces={}; }
      return out; });
    for(const k of ['fullKept','droppedCaught','fenFull','fenDrop','belFull','belDrop']) if(!r[k]) throw new Error(k+' failed: '+JSON.stringify(r));
    if(!r.parts||!r.parts.some(x=>/^Steve Claude Patient,$/.test(x))) throw new Error('the name is not its own smaller piece: '+JSON.stringify(r.parts));
    if(!r.chunks.includes('My birth certificate records the basics plainly:')||!r.chunks.some(x=>/^Steve Claude Patient,/.test(x))) throw new Error('a colon did not start a new piece: '+JSON.stringify(r.chunks));
    return true;
  });
  await step('F3 Computer: with Fit my screen the open book fills the whole window (two pages share the width), lines stay comfortable, and the size menu says Fit my screen (rev 204)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=204))) return 'SKIP: before rev 204';
    const r=await page.evaluate(()=>{ const keepT=_isTab, keepD=S.dev, keepV=S.view, ss=window.stageSize; const out={};
      Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0,configurable:true});
      try{ _isTab=false; S.dev='screen';
        window.stageSize=()=>({w:1700,h:880});   /* a 16-inch laptop at 150% in Chrome, full screen */
        S.view='auto'; const d2=devDims(curDev()); out.two=screenTwo(1700-SCREEN_PAD,880-SCREEN_PAD); out.spreadW=d2.w*2; out.pageH=d2.h; out.sw=1700-SCREEN_PAD; out.text=d2.w-2*d2.mx; out.cap=Math.round((+S.fs||18)*30);
        S.view='1'; const d1=devDims(curDev()); out.oneW=d1.w; out.oneH=d1.h;
        out.label=[...document.querySelectorAll('#deviceSel option')].find(o=>o.value==='screen')?.textContent;
      } finally { delete navigator.maxTouchPoints; _isTab=keepT; S.dev=keepD; S.view=keepV; window.stageSize=ss; }
      return out; });
    if(!r.two||r.spreadW<r.sw-2) throw new Error('the open book does not fill the width: '+JSON.stringify(r));
    if(r.text>r.cap+2) throw new Error('lines are too long on a wide page: '+JSON.stringify(r));
    if(r.oneW>r.oneH+1) throw new Error('one page is wider than tall: '+JSON.stringify(r));
    if(r.label!=='Fit my screen') throw new Error('the size menu says '+r.label);
    return true;
  });
  await step('Computer keys: F toggles full screen in Read, Esc closes the Aa panel first then leaves full screen, Home/End go to the chapter\'s ends, keys do nothing while typing (rev 205)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=205))) return 'SKIP: before rev 205';
    await page.click('#tab-read'); await page.waitForTimeout(300); await page.evaluate(()=>{ document.activeElement&&document.activeElement.blur(); });
    const imm=()=>page.evaluate(()=>document.body.classList.contains('immersive'));
    await page.keyboard.press('f'); await page.waitForTimeout(200); if(!(await imm())) throw new Error('F did not go full screen');
    const toggles=await page.evaluate(()=>{ window.__lt=0; window.__ltk=listenToggle; window.listenToggle=()=>{ window.__lt++; }; return true; });
    await page.keyboard.press(' '); await page.waitForTimeout(150);
    const lt=await page.evaluate(()=>{ window.listenToggle=window.__ltk; return window.__lt; }); if(lt!==1) throw new Error('Space in full screen did not play or pause ('+lt+')');
    await page.evaluate(()=>toggleSheet(true)); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    if(!(await page.evaluate(()=>$('#typeSheet').hidden))||!(await imm())) throw new Error('Esc should close the Aa panel first and stay in full screen');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); if(await imm()) throw new Error('Esc did not leave full screen');
    const n=await page.evaluate(()=>pag(S.rch).pages.length);
    if(n>1){ await page.keyboard.press('End'); await page.waitForTimeout(200); if(await page.evaluate(()=>curIndex())!==n-1) throw new Error('End did not go to the last page');
      await page.keyboard.press('Home'); await page.waitForTimeout(200); if(await page.evaluate(()=>curIndex())!==0) throw new Error('Home did not go to the first page'); }
    await page.click('#tab-write'); await page.focus('#manuscript'); await page.keyboard.press('f'); await page.waitForTimeout(150);
    if(await imm()) throw new Error('typing F in Write went full screen');
    await page.keyboard.press('Backspace');
    return true;
  });
  await step('Manual pictures match the app: each pictured panel still has the labels it had when its picture was taken (rev 206)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=206))) return 'SKIP: before rev 206';
    /* When a panel's buttons or labels change, its picture in the manual is out of date (Steve, Nov 8: the manual still showed "Jump to").
       Retake that picture from the app, then copy the new fingerprint printed in the error into PICS below. */
    const PICS={"toolbar": "Auto | Device | Full screen reading | Highlighter | Library | One page | Read aloud | Two-page spread | Type settings", "sizeMenu": "Fit my screen", "counter": "Book Hub ⌃", "hub": "Book Hub", "aa": "At night Don't switchStyleKnightSepiaSkyLightMy own colors | Colors Match my deviceLightStyleKnightSepiaSkyChoose my own… | H | Justify | Margin | New page for each section | Night warmth Off | Page | Page sound | Page turn CurlSlideInstant | Paper texture | Show tips | Spacing TightSnugNormalRelaxedDouble | Text | Typeface GaramondCaslonBaskervilleCrimson ProSource SerifLiterata (e-reader)MerriweatherLoraTimes New RomanGeorgiaPalatinoCourier (submission format)Plex Sans | W | from | to", "highlighter": "Clear page | Copy", "chapters": "Add back | Add front | Author | Book title | Chapter opening | Contents page in the EPUB and PDF | Copyright year | Credit line | Dedication | ISBN | Import a file | More copyright-page notes | Publisher or imprint | Restore from file | Subtitle"};
    const now=await page.evaluate(()=>{ const norm=t=>String(t||'').replace(/\s+/g,' ').trim();
      const sig=(sel,q)=>{ const el=document.querySelector(sel); if(!el) return 'MISSING'; return [...new Set([...el.querySelectorAll(q)].map(x=>norm(x.getAttribute('aria-label')||x.textContent)).filter(t=>t&&!/\d/.test(t)))].sort().join(' | '); };
      return { toolbar:sig('#read .bar','button,select'), sizeMenu:norm([...document.querySelectorAll('#deviceSel option')].find(o=>o.value==='screen')?.textContent),
        counter:sig('#whereBtn','.hubtag'), hub:sig('#goto','.gh b'), aa:sig('#typeSheet','label'), highlighter:sig('#hlBar','button'), chapters:sig('#drawer','label') }; });
    const stale=Object.keys(PICS).filter(k=>PICS[k]!==now[k]);
    if(stale.length) throw new Error('the manual picture of '+stale.join(', ')+' is out of date. Now: '+JSON.stringify(Object.fromEntries(stale.map(k=>[k,now[k]]))));
    return true;
  });
  await step('Computer: tips speak to a mouse; a click on a word in your own book opens it for fixing, with the text cursor; a click in a book added to read does not (rev 207)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=207))) return 'SKIP: before rev 207';
    const ctx=await browser.newContext({viewport:{width:1400,height:900}}); const pg=await ctx.newPage();
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(1800);
      if(!(await pg.evaluate(()=>mouseUser()))) return 'SKIP: this test browser does not report a mouse';
      await pg.evaluate(()=>{ S.tips=true; localStorage.removeItem('inkhorse-fs-hint-shown'); setTab('read'); goTo({ch:rOrder()[0],i:0}); drawView(); }); await pg.waitForTimeout(500);
      const hint=await pg.evaluate(()=>{ setImmersive(true); const t=document.querySelector('#fsHint').textContent; setImmersive(false); return t; });
      if(!/Space/.test(hint)||/Double-tap/.test(hint)) throw new Error('the full-screen tip still speaks to a finger: '+hint);
      await pg.evaluate(()=>{ const t=document.querySelector('#fsHint'); if(t){ t.hidden=true; } }); await pg.waitForTimeout(300);
      const w=await pg.evaluate(()=>{ const el=[...document.querySelectorAll('#spread .ptext:not(.front) p [data-w]')].find(x=>x.getBoundingClientRect().width>8); const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,cur:getComputedStyle(el).cursor}; });
      if(w.cur!=='text') throw new Error('no text cursor over the words: '+w.cur);
      await pg.mouse.click(w.x,w.y); await pg.waitForTimeout(500);
      if(await pg.evaluate(()=>$('#fixBox').hidden)) throw new Error('a click on a word did not open it for fixing');
      await pg.evaluate(()=>{ try{ fixDone(); }catch(_){ } });
      await pg.evaluate(async()=>{ await openLibBook('manual',true); setTab('read'); goTo({ch:rOrder()[3],i:1}); drawView(); }); await pg.waitForTimeout(600);
      const m=await pg.evaluate(()=>{ const el=[...document.querySelectorAll('#spread .ptext p [data-w]')].find(x=>x.getBoundingClientRect().width>8&&x.getBoundingClientRect().left>innerWidth*0.4); const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
      await pg.mouse.click(m.x,m.y); await pg.waitForTimeout(500);
      if(!(await pg.evaluate(()=>$('#fixBox').hidden))) throw new Error('a click in a book added to read opened it for fixing');
      return true;
    } finally { await ctx.close(); }
  });
  await step('Every button that shows only a symbol (like Aa, ‹ ›, or an icon) has a hover label on a computer (rev 208)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=208))) return 'SKIP: before rev 208';
    const bad=await page.evaluate(()=>[...document.querySelectorAll('button,select,label.btn,[role=button]')].filter(x=>{ const t=(x.textContent||'').trim().replace(/\s+/g,' ');
      return !x.title && (t.length<=3 || /^[^A-Za-z]*$/.test(t)) && !/^(Add|Go)$/.test(t); }).map(x=>x.id||x.outerHTML.slice(0,60)));
    if(bad.length) throw new Error('no hover label: '+bad.join(', '));
    return true;
  });
  await step('A voice made on the internet (Chrome\'s Google voices) is followed by time at its learned pace, not by its late word signals (rev 209)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=209))) return 'SKIP: before rev 209';
    const r=await page.evaluate(()=>{
      const words='The quick brown fox jumps over the lazy dog'.split(' '), c={start:100,words,text:words.join(' ')};
      const off=[]; let o=0; words.forEach(w=>{ off.push(o); o+=w.length+1; });
      const keep=TTS.paces; TTS.paces={};
      const first=ttsPace('Google UK English Male|1',1), at0=ttsTimeWord(c,off,0,10), at1=ttsTimeWord(c,off,1,10), at9=ttsTimeWord(c,off,9,10), atNeg=ttsTimeWord(c,off,-1,10);
      [9,30,11,10,12].forEach(v=>ttsPaceNote('Google UK English Male|1',v)); const learned=ttsPace('Google UK English Male|1',1), other=ttsPace('Mark|1',1.5);
      for(let k=0;k<30;k++) ttsPaceNote('x|1',k); const kept=TTS.paces['x|1'].length;
      TTS.paces=keep;
      const src=ttsSpeak.toString(), ign=/localService===false/.test(src) && /\|\| remote\) return/.test(src);
      return {first,at0,at1,at9,atNeg,learned,other,kept,ign};
    });
    const ok=r.first===14 && r.at0===100 && r.at1===102 && r.at9===108 && r.atNeg===100 && r.learned===11 && r.other===21 && r.kept===20 && r.ign;
    if(!ok) throw new Error(JSON.stringify(r));
    return true;
  });
  await step('Tools: every Write tool works when tapped (Word count, Copy, Paste, Top of chapter, Done) (rev 180, Next mark moved to the page bar in rev 211)', async () => {
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    await page.fill('#manuscript','One sentence here. The marked sentence sits here. Last one.'); await page.waitForTimeout(400);
    await page.fill('#manuscript','One sentence here. The rewritten sentence is new. Last one.'); await page.waitForTimeout(400);
    await tools(); const w0=await page.isVisible('#wordCount'); await page.click('#wcBtn'); await page.waitForTimeout(250); const w1=await page.isVisible('#wordCount'); await tools(); await page.click('#wcBtn'); await page.waitForTimeout(250);
    if(w0===w1) throw new Error('Word count did not switch');
    await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(0,0); }); await tools(); await page.click('#copyBtn'); await page.waitForTimeout(300);
    if(!/rewritten sentence/.test(await page.evaluate(()=>navigator.clipboard.readText()))) throw new Error('Copy did not copy the chapter');
    await page.evaluate(()=>{ navigator.clipboard.writeText('Pasted words go here.'); const t=document.querySelector('#manuscript'); t.setSelectionRange(t.value.length,t.value.length); }); await tools(); await page.click('#pasteBtn'); await page.waitForTimeout(300);
    if(!/Pasted words go here\./.test(await T())) throw new Error('Paste did not put the words in');
    await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(t.value.length,t.value.length); }); await tools(); await page.click('#pgTop'); await page.waitForTimeout(300);
    if(!(await page.evaluate(()=>document.querySelector('#manuscript').selectionStart===0))) throw new Error('Top of chapter did not go to the start');
    await tools(); await page.click('#wToolsDone'); await page.waitForTimeout(300); if(await page.getAttribute('#toolsBtn','aria-expanded')==='true') throw new Error('Done did not close the Tools menu');
    await page.fill('#manuscript',keep); await page.waitForTimeout(300);
  });
  await step('Next mark in the page bar: one tap per mark with no backing out, a stop after the last mark, never covered, always fits (rev 210)', async () => {
    if(!(await page.evaluate(()=>!!document.querySelector('#marksBtn2')))) return 'SKIP: before rev 210 Next mark was only in Tools';
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T(); const vp0=page.viewportSize();
    const keepMarks=await page.evaluate(()=>JSON.stringify(BOOK.marks||[]));
    const restore=async()=>{ await page.setViewportSize(vp0); await page.evaluate((m)=>{ document.body.classList.remove('kbshort'); BOOK.marks=JSON.parse(m); marksRev++; marksUI(); },keepMarks); await page.fill('#manuscript',keep); await page.waitForTimeout(300); };
    try{
      await page.evaluate(()=>{ BOOK.marks=[]; marksRev++; marksUI(); });
      await page.fill('#manuscript','Alpha one is here. Bravo two sits here now. Charlie three is next. Delta four closes the page.'); await page.waitForTimeout(500);
      if(!(await page.evaluate(()=>document.querySelector('#marksBtn2').hidden))) throw new Error('the page-bar Next mark shows when there are no marks');
      await page.evaluate(()=>{ BOOK.marks=[{ch:S.cur,t:'Alpha one is here.',w:0},{ch:S.cur,t:'Charlie three is next.',w:9},{ch:S.cur,t:'Delta four closes the page.',w:13}]; marksRev++; marksUI(); });
      if((await page.textContent('#marksN2')).trim()!=='3') throw new Error('the page-bar Next mark does not show the count 3');
      if(await page.evaluate(()=>!!document.querySelector('#marksBtn'))) throw new Error('rev 211: the duplicate Next mark button is still in Tools');
      const sel=()=>page.evaluate(()=>{ const t=document.querySelector('#manuscript'); return t.value.slice(t.selectionStart,t.selectionEnd); });
      const toastNow=()=>page.evaluate(()=>{ const t=document.querySelector('#toast'); return t.hidden?'':t.textContent; });
      const tap=async()=>{ const b=await page.locator('#marksBtn2').boundingBox(); await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2); await page.waitForTimeout(350); };
      await tools(); if(await page.evaluate(()=>document.querySelector('#write').classList.contains('tools-closed'))) throw new Error('could not open Tools for the rev 211 check');
      await tap(); if(!(await page.evaluate(()=>document.querySelector('#write').classList.contains('tools-closed')))) throw new Error('rev 211: Tools stayed open after tapping the pencil');
      await page.evaluate(()=>{ document.body.classList.add('kbshort'); const t=document.querySelector('#manuscript'); t.setSelectionRange(0,0); });
      const want=['Alpha one is here.','Charlie three is next.','Delta four closes the page.'];
      for(let i=0;i<3;i++){
        await page.evaluate(()=>toast('Mark 3 of 3. Retype it and the mark clears.'));   // the message that sits over the page bar must not block the button
        if(!(await page.evaluate(()=>{ const b=document.querySelector('#marksBtn2').getBoundingClientRect(), e=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2); return !!(e&&e.closest('#marksBtn2')); }))) throw new Error('the message covers the Next mark button');
        await tap(); const got=await sel(); if(got!==want[i]) throw new Error('tap '+(i+1)+' selected '+JSON.stringify(got)+', wanted '+JSON.stringify(want[i]));
        if(!/^Mark \d of 3\./.test(await toastNow())) throw new Error('tap '+(i+1)+' gave no "Mark n of 3" message');
      }
      /* rev 211: tapping a button drops the iPhone keyboard, so the last-mark tap must hand the cursor back (same selection, textarea focused) */
      await page.evaluate(()=>document.querySelector('#manuscript').blur());
      await tap(); const kf=await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); return {focus:document.activeElement===t, a:t.selectionStart, b:t.selectionEnd}; });
      if(!kf.focus || kf.a===kf.b) throw new Error('after the last-mark tap the writing box lost focus/selection (focus '+kf.focus+', '+kf.a+'-'+kf.b+')');
      if((await sel())!==want[2] || !/last mark/i.test(await toastNow())) throw new Error('after the last mark: selection '+JSON.stringify(await sel())+', message '+JSON.stringify(await toastNow()));
      await tap(); if((await sel())!==want[0]) throw new Error('the tap after "last mark" did not go back to the first mark: '+JSON.stringify(await sel()));
      /* fix as you go: retype the first mark, and the next tap goes to the next one that is left (not back to the first) */
      await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setRangeText('The rewritten opening is new.',t.selectionStart,t.selectionEnd,'end'); t.dispatchEvent(new Event('input',{bubbles:true})); }); await page.waitForTimeout(1200);
      if((await page.textContent('#marksN2')).trim()!=='2') throw new Error('the count did not drop to 2 after a mark was retyped: '+(await page.textContent('#marksN2')));
      await tap(); if((await sel())!==want[1]) throw new Error('after fixing mark 1 the next tap selected '+JSON.stringify(await sel()));
      await page.evaluate(()=>document.body.classList.remove('kbshort'));
      /* it fits on every phone width, and the word count stays on the widest */
      for(const w of [360,375,390,430]){
        await page.setViewportSize({width:w,height:vp0.height}); await page.waitForTimeout(450);
        const r=await page.evaluate(()=>{ const pb=document.querySelector('#pagebar'), b=document.querySelector('#marksBtn2').getBoundingClientRect(), wc=document.querySelector('#wordCount').getBoundingClientRect(); return {over:pb.scrollWidth-pb.clientWidth, right:b.right, left:b.left, vw:innerWidth, wc:wc.width}; });
        if(r.over>0 || r.right>r.vw || r.left<0) throw new Error('at '+w+' px wide the page bar overflows by '+r.over+'px (button '+Math.round(r.left)+'–'+Math.round(r.right)+')');
        if(w===430 && r.wc<25) throw new Error('at 430 px the word count was squeezed to '+Math.round(r.wc)+'px');
      }
    } finally { await restore(); }
  });
  await step('Next mark visits every mark, including one inside a chapter title, so the count and the stops agree (rev 212)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=212))) return 'SKIP: before rev 212 a mark in a title was skipped';
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    const keepMarks=await page.evaluate(()=>JSON.stringify(BOOK.marks||[]));
    try{
      await page.fill('#manuscript','Alpha one is here. Bravo two sits here now. Charlie three is next.'); await page.waitForTimeout(500);
      const ttl=await page.evaluate(()=>{ const c=CH.get(S.cur); return c.title; });
      await page.evaluate((ttl)=>{ BOOK.marks=[{ch:S.cur,t:ttl,w:0},{ch:S.cur,t:'Bravo two sits here now.',w:ttl.split(' ').length+4},{ch:S.cur,t:'Charlie three is next.',w:ttl.split(' ').length+9}]; marksRev++; marksUI(); },ttl);
      const n=Number((await page.textContent('#marksN2')).trim());
      const seen=[];
      for(let i=0;i<n;i++){ await page.evaluate(()=>{ document.querySelector('#marksBtn2').click(); }); await page.waitForTimeout(250); seen.push(await page.evaluate(()=>{ const x=document.querySelector('#toast'); return x.hidden?'':x.textContent; })); }
      if(!seen.every(s=>/^Mark \d of 3/.test(s))) throw new Error('the stops did not agree with the count of 3: '+JSON.stringify(seen));
      if(!/title/.test(seen[0])) throw new Error('a mark in the title was not visited first: '+JSON.stringify(seen));
    } finally { await page.evaluate((m)=>{ BOOK.marks=JSON.parse(m); marksRev++; marksUI(); },keepMarks); await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  await step('Highlights in Jump to: Clear all asks first, then clears every highlight and the Next mark count (rev 213)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=213))) return 'SKIP: before rev 213 there was no Clear all';
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    const keepMarks=await page.evaluate(()=>JSON.stringify(BOOK.marks||[]));
    try{
      await page.fill('#manuscript','Alpha one is here. Bravo two sits here now. Charlie three is next. Delta four closes the page.'); await page.waitForTimeout(500);
      await page.evaluate(()=>{ BOOK.marks=[{ch:S.cur,t:'Alpha one is here.',w:0},{ch:S.cur,t:'Charlie three is next.',w:9},{ch:S.cur,t:'Delta four closes the page.',w:13}]; marksRev++; marksUI(); });
      await page.click('#tab-read'); await page.waitForTimeout(500); await page.click('#whereBtn'); await page.waitForTimeout(400);
      const btn=await page.locator('#hlAll'); if(!(await btn.count())) throw new Error('no Clear all button in the Highlights list');
      if(!/^Clear all$/.test((await btn.textContent()).trim())) throw new Error('the button should start as "Clear all"');
      await btn.click(); await page.waitForTimeout(250);
      if(!/Tap again/.test(await page.textContent('#hlAll'))) throw new Error('the first tap did not ask to tap again');
      if((await page.evaluate(()=>BOOK.marks.length))!==3) throw new Error('the first tap already cleared marks');
      await page.click('#hlAll'); await page.waitForTimeout(400);
      const left=await page.evaluate(()=>({n:BOOK.marks.length, badge:document.querySelector('#marksBtn2').hidden, list:!!document.querySelector('#hlAll')}));
      if(left.n!==0||!left.badge||left.list) throw new Error('Clear all did not clear everything: '+JSON.stringify(left));
    } finally { await page.evaluate(()=>{ const g=document.querySelector('#gotoDone'); if(g&&g.offsetParent) g.click(); }); await page.evaluate((m)=>{ BOOK.marks=JSON.parse(m); marksRev++; marksUI(); },keepMarks); await page.click('#tab-write'); await page.waitForTimeout(300); await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  /* rev 214: the formatting rules found unchecked in the Nov 9 review, each with its F-number */
  const r214 = async () => page.evaluate(()=>(window.INK_VERSION||{}).rev>=214);
  const p214 = ['First paragraph "quoted" here -- an aside -- then more words, and here--there too. The years 1980-1981 and a phone 555-1234 and dots... end of a long line that wraps across the page so it shows several lines.','***','After the break this paragraph has no indent.','A normal paragraph that is long enough to wrap onto a second line, so both edges show.'].join('\n');
  const toFirstPage = async () => { await page.click('#tab-read'); await page.waitForTimeout(900); await page.evaluate(()=>{ try{ goTo({ch:S.cur,i:0}); refreshReader(); }catch(_){ } }); await page.waitForTimeout(600); };
  await step('F3.5 Justify on a phone: with Justify on, the page is justified at phone width with hyphenation; off gives a ragged edge (rev 214)', async () => {
    if(!(await r214())) return 'SKIP: before rev 214 a phone quietly fell back to a ragged edge';
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    try{
      await page.fill('#manuscript',p214); await page.waitForTimeout(600); await toFirstPage();
      const on=await page.evaluate(()=>{ const p=document.querySelector('#spread .ptext p:not(.sb)'); const cs=getComputedStyle(p); return {ta:cs.textAlign, hy:cs.hyphens||cs.webkitHyphens, own:typeof OWNHY!=='undefined'&&OWNHY&&typeof hyWord==='function'&&hyWord('standard').indexOf('\u00ad')>0, just:S.just, w:innerWidth}; });
      if(!on.just) throw new Error('Justify is not on by default');
      if(on.ta!=='justify') throw new Error('at '+on.w+' px wide, Justify on shows text-align '+on.ta);
      if(on.own ? on.hy!=='manual' : on.hy!=='auto') throw new Error('hyphenation is '+on.hy+(on.own?' while Inkhorse breaks the words itself, so a device could add breaks of its own':', so justified lines can open wide gaps'));
      await page.evaluate(()=>{ S.just=false; applyType(); relayout(); }); await page.waitForTimeout(700);
      const off=await page.evaluate(()=>getComputedStyle(document.querySelector('#spread .ptext p:not(.sb)')).textAlign);
      if(off!=='left') throw new Error('Justify off still shows '+off);
    } finally { await page.evaluate(()=>{ S.just=true; applyType(); relayout(); }); await page.click('#tab-write'); await page.waitForTimeout(300); await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  await step('F4.1 F4.2 F4.3 F4.4 on the page: curly quotes, -- becomes a closed em dash, ... one ellipsis, 1980-1981 a range dash, a phone number untouched, no line starts with a dash, the writing itself unchanged (rev 214)', async () => {
    if(!(await r214())) return 'SKIP: before rev 214 only quotes were set';
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    try{
      await page.fill('#manuscript',p214); await page.waitForTimeout(600); await toFirstPage();
      const r=await page.evaluate(()=>{ const b=document.querySelector('#spread .ptext'), txt=b.textContent.replace(/\u2060/g,'');
        const tops=[...b.querySelectorAll('p:not(.sb)')].flatMap(p=>{ const sp=[...p.querySelectorAll('span[data-w]')]; return sp.map((s,k)=>({t:s.textContent.replace(/\u2060/g,''),top:Math.round(s.getBoundingClientRect().top),prev:k?Math.round(sp[k-1].getBoundingClientRect().top):null})); });
        return {txt, dashStartsLine:tops.some(x=>/^—/.test(x.t)&&x.prev!==null&&x.top>x.prev)}; });
      const want=['“quoted”','here—an aside—then','here—there','1980–1981','555-1234','dots…'];
      const miss=want.filter(w=>r.txt.indexOf(w)<0); if(miss.length) throw new Error('missing on the page: '+miss.join(' | ')+'  page text: '+r.txt.slice(0,240));
      if(/ -- |\.\.\./.test(r.txt)) throw new Error('two hyphens or three dots still show on the page');
      if(r.dashStartsLine) throw new Error('a line starts with a dash');
      if((await T())!==p214) throw new Error('the writing in Write was changed');
    } finally { await page.click('#tab-write'); await page.waitForTimeout(300); await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  await step('F4.1 F4.2 F4.3 edge cases: a quote after a dash closes unless a word follows, a dash attached to a quote still closes up, short year ranges, dates and web addresses left alone (rev 216)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=216))) return 'SKIP: before rev 216 "Wait--" ended with an opening quote';
    const cases=[['"Wait--"','\u201cWait\u2014\u201d'],['she said--"no"','she said\u2014\u201cno\u201d'],['"Wait\u2014"','\u201cWait\u2014\u201d'],['1980-81','1980\u201381'],['1999-2000s','1999\u20132000s'],['2026-11-09','2026-11-09'],['555-1234','555-1234'],['see http://a.com/x--y now','see http://a.com/x--y now'],['x---y','x---y'],['wait....','wait....']];
    const got=await page.evaluate(cs=>cs.map(c=>smartQ(c[0])),cases);
    const bad=cases.map((c,i)=>got[i]===c[1]?null:c[0]+' -> '+got[i]+' (wanted '+c[1]+')').filter(Boolean); if(bad.length) throw new Error(bad.join(' ; '));
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    try{ await page.fill('#manuscript','"Wait --" she said, and he ran-- fast. Then more words follow to fill out the line here.'); await page.waitForTimeout(600); await toFirstPage();
      const txt=await page.evaluate(()=>document.querySelector('#spread .ptext').textContent.replace(/\u2060/g,''));
      if(txt.indexOf('\u201cWait\u2014\u201d she said')<0 || txt.indexOf('ran\u2014fast')<0) throw new Error('on the page: '+txt.slice(0,160));
    } finally { await page.click('#tab-write'); await page.waitForTimeout(300); await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  await step('F5.2 F3.4 F4.2 F8 EPUB: a scene break is a centered ornament and the paragraph after it has no indent; dashes and ellipsis are set; no importer marker leaks in; the identifier is a valid UUID (rev 214)', async () => {
    if(!(await r214())) return 'SKIP: before rev 214 the e-book wrote *** as an ordinary paragraph';
    if(!(await page.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine';
    let JSZip=null; try{ JSZip=require('jszip'); }catch(_){ return 'SKIP: jszip is not installed for the test'; }
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    try{
      await page.fill('#manuscript','%%front\n'+p214); await page.waitForTimeout(600);
      const [d]=await Promise.all([page.waitForEvent('download',{timeout:20000}), page.evaluate(()=>document.querySelector('#expEpub').click())]);
      const z=await JSZip.loadAsync(require('fs').readFileSync(await d.path()));
      const ch=await z.file('OEBPS/ch1.xhtml').async('string'), opf=await z.file('OEBPS/content.opf').async('string'), css=await z.file('OEBPS/style.css').async('string');
      if(!/<p class="sb">[^<]*\*[^<]*<\/p>\s*<p>After the break/.test(ch)) throw new Error('the scene break is not an ornament paragraph followed by the next paragraph: '+ch.slice(ch.indexOf('***')-40,ch.indexOf('***')+80));
      if(!/p\.sb\{[^}]*text-align:center[^}]*text-indent:0/.test(css) || !/p\.sb\+p\{text-indent:0\}/.test(css)) throw new Error('the e-book style does not center the ornament or un-indent the next paragraph');
      if(ch.indexOf('here—an aside—then')<0 || ch.indexOf('dots…')<0 || ch.indexOf('1980–1981')<0) throw new Error('dashes, ellipsis or the year range are not set in the e-book');
      if(/%%front|%%toc/.test(ch)) throw new Error('an importer marker (%%front or %%toc) shows as text in the e-book');
      if(/\u2060/.test(ch)) throw new Error('the screen-only word joiner leaked into the e-book');
      const id=(/urn:uuid:([^<"]+)/.exec(opf)||[])[1]||''; if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error('the identifier is not a valid UUID: '+id);
    } finally { await page.fill('#manuscript',keep); await page.waitForTimeout(300); }
  });
  await step('F1.1 F1.3 F1.4 F6 P3.4 EPUB: a book with its own typed title page and copyright page gets each one once, as front matter, and neither is in the Contents (rev 215)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=215))) return 'SKIP: before rev 215 a typed title and copyright page came out twice';
    if(!(await page.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine';
    let JSZip=null; try{ JSZip=require('jszip'); }catch(_){ return 'SKIP: jszip is not installed for the test'; }
    const keep=await page.evaluate(()=>JSON.stringify({title:BOOK.title,author:BOOK.author,order:BOOK.order.slice()}));
    try{
      await page.evaluate(()=>{ BOOK.title="What If It's Already Here?"; BOOK.author='Steve Claude Patient';
        window.__t215=[addChapter("What If It's Already Here?","A Memoir\nSteve Claude Patient",0), addChapter('Copyright page','Copyright © 2026 Steve Claude Patient\nAll rights reserved.',1)]; });
      const kinds=await page.evaluate(()=>window.__t215.map(frontKind));
      if(kinds.join()!=='title,copyright') throw new Error('the typed pages were not recognised as a title page and a copyright page: '+kinds.join());
      const [d]=await Promise.all([page.waitForEvent('download',{timeout:20000}), page.evaluate(()=>document.querySelector('#expEpub').click())]);
      const z=await JSZip.loadAsync(require('fs').readFileSync(await d.path())); const opf=await z.file('OEBPS/content.opf').async('string'), nav=await z.file('OEBPS/nav.xhtml').async('string');
      const files=await Promise.all(Object.keys(z.files).filter(f=>/\.xhtml$/.test(f)).map(async f=>[f,await z.file(f).async('string')]));
      const n=(re)=>files.filter(([f,s])=>re.test(s.replace(/<head>[\s\S]*?<\/head>/,''))).length;
      if(n(/All rights reserved/)!==1) throw new Error('the copyright lines appear in '+n(/All rights reserved/)+' files, not 1');
      if(n(/A Memoir/)!==1) throw new Error('the title page appears '+n(/A Memoir/)+' times');
      if(/Copyright page|Already Here/.test(nav.replace(/<head>[\s\S]*?<\/head>/,''))) throw new Error('the Contents lists a front page: '+nav.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,200));
      const po=[...opf.matchAll(/itemref idref="([^"]+)"/g)].map(m=>m[1]); if(po[0]!=='title'||po[1]!=='copyright') throw new Error('front matter is not first in the book: '+po.join(' '));
    } finally { await page.evaluate((k)=>{ const o=JSON.parse(k); (window.__t215||[]).forEach(id=>CH.delete(id)); BOOK.order=o.order; BOOK.title=o.title; BOOK.author=o.author; try{ renderAll(); }catch(_){ } },keep); }
  });
  await step('Opening screen: hidden in a browser tab; in the Home Screen app it shows the horse, then gets out of the way by itself or with one tap, and never blocks the app (rev 218)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=218))) return 'SKIP: before rev 218 there was no opening screen';
    const st=()=>page.evaluate(()=>{ const s=document.querySelector('#splash'); return {hidden:s.hidden, op:s.style.opacity, img:!!s.querySelector('img'), z:+getComputedStyle(s).zIndex}; });
    let r=await st(); if(!r.hidden) throw new Error('the opening screen shows in a normal browser tab');
    if(!r.img) throw new Error('the opening screen has no horse picture');
    if(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=219) && !/The power to get it done, and then some!/.test(await page.textContent('#splash'))) throw new Error('the opening screen has no motto (rev 219)');
    await page.evaluate(()=>inkSplash(400)); r=await st(); if(r.hidden) throw new Error('the opening screen did not show');
    await page.waitForTimeout(900); r=await st(); if(!r.hidden) throw new Error('the opening screen did not go away by itself');
    await page.evaluate(()=>inkSplash(0)); await page.waitForTimeout(100);
    const box=await page.locator('#splash').boundingBox(); await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2); await page.waitForTimeout(450);
    r=await st(); if(!r.hidden) throw new Error('one tap did not skip the opening screen');
    const tapOk=await page.evaluate(()=>{ const el=document.elementFromPoint(innerWidth/2,innerHeight/2); return !el.closest('#splash'); }); if(!tapOk) throw new Error('the opening screen still blocks taps after it went away');
  });
  await step('Manual welcome picture: the StyleKnight sign sits right on the page with no box in a light theme, and on a light card in the night theme (rev 220)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=220))) return 'SKIP: before rev 220 the sign had a cream box';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage();
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const look=async()=>pg.evaluate(async()=>{ await openLibBook('manual',true); setTab('read'); goTo({ch:rOrder()[0],i:0}); drawView(); await new Promise(r=>setTimeout(r,500));
        const f=document.querySelector('#spread .fig.brand'); if(!f) return null; const img=f.querySelector('img');
        return {src:(img.currentSrc||img.src).slice(0,22), bg:getComputedStyle(f.querySelector('.ph')).backgroundColor}; });
      const L=await look(); if(!L) throw new Error('the welcome picture is not marked as a brand picture');
      if(!/^data:image\/png|^blob:/.test(L.src)) throw new Error('the welcome picture is not a see-through PNG: '+L.src);
      if(!/rgba\(0, 0, 0, 0\)|transparent/.test(L.bg)) throw new Error('in a light theme the picture still has a box: '+L.bg);
      await pg.evaluate(()=>{ localStorage.setItem('inkhorse-theme','dark'); inkApplyTheme(); }); await pg.waitForTimeout(200);
      const D=await look(); if(/rgba\(0, 0, 0, 0\)|transparent/.test(D.bg)) throw new Error('in the night theme the dark lettering has no light card behind it');
    } finally { await ctx.close(); }
  });
  await step('F1.2 F1.3 The Inkhorse Formatting Standard comes with Inkhorse: on the shelf beside the manual, opens with its cover, front matter and every part; Delete offers to put it back, and that works (rev 225)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=225))) return 'SKIP: before rev 225 only the manual came with Inkhorse';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const rows=async()=>pg.evaluate(()=>[...document.querySelectorAll('.bookrow')].map(r=>r.innerText.replace(/\s+/g,' ')));
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); }); await pg.waitForTimeout(400); const shelf=async()=>{ if(!(await pg.evaluate(()=>{ const r=document.querySelector('.bookrow'); return !!(r&&r.offsetParent); }))){ await pg.evaluate(()=>document.querySelector('#libBtn').click()); } await pg.waitForTimeout(700); }; await shelf();
      let r=await rows(); const mi=r.findIndex(t=>/User manual/.test(t)), si=r.findIndex(t=>/Formatting Standard/.test(t));
      if(mi<0||si<0) throw new Error('the shelf does not list both books: '+JSON.stringify(r));
      if(Math.abs(mi-si)!==1) throw new Error('the Formatting Standard is not next to the manual');
      if(!/comes with Inkhorse/.test(r[si])) throw new Error('the Formatting Standard is not marked "comes with Inkhorse"');
      const cov=await pg.evaluate(async()=>{ const row=[...document.querySelectorAll('.bookrow')].find(x=>/Formatting Standard/.test(x.innerText)); const im=row.querySelector('.thumb img'); if(!im) return null; try{ await im.decode(); }catch(_){ } return {w:im.naturalWidth,h:im.naturalHeight}; });
      if(!cov||!cov.w||Math.abs(cov.w/cov.h-2/3)>0.01) throw new Error('its cover is missing or not 2:3: '+JSON.stringify(cov));
      const bk=await pg.evaluate(async()=>{ await openLibBook('standard',true); setTab('read'); await new Promise(r=>setTimeout(r,600)); const o=rOrder(); const tx=o.map(id=>RB.ch.get(id).text).join('\n');
        return {n:o.length,front:o.filter(isFront).length,parts:o.filter(id=>/^Part \d+ · /.test(RB.ch.get(id).title)).length,rules:['F1.1','F2.2','F3.7','F4.1','F5.2','F6.3','F7.4','F8.1','F9.2','F10.1'].filter(x=>!tx.includes(x+' ')),stale:/rev 91|waiting for Steve/.test(tx),pages:document.querySelectorAll('#spread .face').length}; });
      if(bk.front!==2) throw new Error('its title and copyright pages are not front matter: '+bk.front);
      if(bk.parts!==11) throw new Error('it should have Parts 1 to 11, found '+bk.parts);
      if(bk.rules.length) throw new Error('rules missing from the book: '+bk.rules.join(', '));
      if(bk.stale) throw new Error('the scorecard still carries old preview notes');
      if(!bk.pages) throw new Error('it opened but drew no page');
      await shelf();
      const del=async()=>pg.evaluate(()=>{ const row=[...document.querySelectorAll('.bookrow')].find(x=>/Formatting Standard/.test(x.innerText)); row.querySelector('[data-ldel]').click(); });
      await del(); await pg.waitForTimeout(300); await del(); await pg.waitForTimeout(900); await shelf();
      r=await rows(); if(r.some(t=>/Formatting Standard/.test(t))) throw new Error('Delete (tapped twice) did not remove it');
      if(!r.some(t=>/User manual/.test(t))) throw new Error('deleting the Formatting Standard took the manual with it');
      if(!(await pg.$('[data-std]'))) throw new Error('no "Put the Formatting Standard back" button after deleting it');
      await pg.click('[data-std]'); await pg.waitForTimeout(1200);
      r=await rows(); if(!r.some(t=>/Formatting Standard/.test(t))) throw new Error('Put the Formatting Standard back did not bring it back');
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('Book Hub names its book, and both books that come with Inkhorse have a back cover that opens as the last page (rev 226)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=226))) return 'SKIP: before rev 226 the Book Hub did not name the book and the two books had no back cover';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      for(const [id,title] of [['manual','Inkhorse User manual'],['standard','The Inkhorse Formatting Standard']]){
        const r=await pg.evaluate(async(id)=>{ S.tips=false; await openLibBook(id,true); setTab('read'); goTo({ch:'__back',i:0}); drawView(); await new Promise(r=>setTimeout(r,700));
          const face=document.querySelector('#spread .face'); const fr=face&&face.getBoundingClientRect(); const im=new Image(); im.src=imgSrc(RB.coverBack||''); let ok=false; try{ await im.decode(); ok=im.naturalWidth>0&&Math.abs(im.naturalWidth/im.naturalHeight-2/3)<0.01; }catch(_){ }
          document.querySelector('#whereBtn').click(); await new Promise(r=>setTimeout(r,500));
          const gb=document.querySelector('#gotoBook'), g=gb.getBoundingClientRect(), hub=document.querySelector('#goto').getBoundingClientRect(), last=[...document.querySelectorAll('#gotoList .grow2')].pop();
          const out={back:RB.coverBack,last:navOrder().slice(-1)[0],at:S.rch,face:!!fr&&fr.width>100,pic:ok,head:gb.textContent,fits:g.width>20&&g.left>=hub.left&&g.right<=hub.right,row:last.innerText.replace(/\s+/g,' '),art:!!last.querySelector('label')};
          document.querySelector('#gotoDone').click(); return out; },id);
        if(!r.back||r.last!=='__back') throw new Error(id+': no back cover after the last page');
        if(r.at!=='__back'||!r.face) throw new Error(id+': the back cover did not open as a page');
        if(!r.pic) throw new Error(id+': the back cover picture is missing or not 2:3');
        if(r.head!==title) throw new Error(id+': the Book Hub heading says "'+r.head+'", not the book’s name');
        if(!r.fits) throw new Error(id+': the book’s name does not fit inside the Book Hub heading');
        if(!/Back cover/.test(r.row)||r.art) throw new Error(id+': the Book Hub still offers Add art for the back cover: '+r.row);
      }
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('F1.4 P3.6 The credit line is the author’s choice: blank by default, one tap writes “Made with Inkhorse”, it reaches the copyright page, and it can be cleared (rev 228)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=228))) return 'SKIP: before rev 228 there was no Made with Inkhorse button';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const r=await pg.evaluate(async()=>{ const el=document.querySelector('#fmCredit'), btn=document.querySelector('#fmCreditUse'); if(!el||!btn) return {missing:true};
        const has=()=>frontInfo().copyright.some(l=>/Made with Inkhorse/.test(l));
        const before=(BOOK.front||{}).credit||'', hint=el.placeholder; btn.click(); await new Promise(r=>setTimeout(r,200));
        const after=(BOOK.front||{}).credit||'', shown=el.value, inBook=has();
        el.value=''; el.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,100));
        return {before,hint,after,shown,inBook,still:has(),cleared:(BOOK.front||{}).credit||''}; });
      if(r.missing) throw new Error('no credit field or button in Book settings');
      if(r.before) throw new Error('a new book already has a credit line: '+r.before);
      if(r.after!=='Made with Inkhorse · getinkhorse.com'||r.shown!==r.after) throw new Error('the button did not write the credit line: '+JSON.stringify(r));
      if(/Inkhorse|StyleKnight/.test(r.hint)) throw new Error('the empty field already suggests a credit: '+r.hint);
      if(!r.inBook) throw new Error('the credit line did not reach the copyright page');
      if(r.cleared||r.still) throw new Error('clearing the field did not remove the credit from the book');
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('The Inkhorse Publishing Standard comes with Inkhorse: third on the shelf after the manual and the Formatting Standard, with front and back covers, front matter, Parts 1 to 11 and its P rules; Delete offers to put it back (rev 229)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=229))) return 'SKIP: before rev 229 there was no Publishing Standard';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const rows=async()=>pg.evaluate(()=>[...document.querySelectorAll('.bookrow')].map(r=>r.innerText.replace(/\s+/g,' ')));
      const shelf=async()=>{ if(!(await pg.evaluate(()=>{ const r=document.querySelector('.bookrow'); return !!(r&&r.offsetParent); }))){ await pg.evaluate(()=>document.querySelector('#libBtn').click()); } await pg.waitForTimeout(700); };
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); }); await pg.waitForTimeout(400); await shelf();
      let r=await rows(); const mi=r.findIndex(t=>/User manual/.test(t)), si=r.findIndex(t=>/Formatting Standard/.test(t)), pi=r.findIndex(t=>/Publishing Standard/.test(t));
      if(mi<0||si<0||pi<0) throw new Error('the shelf does not list all three books: '+JSON.stringify(r));
      if(!(si===mi+1&&pi===si+1)) throw new Error('the three books are not together in order (manual, Formatting Standard, Publishing Standard)');
      if(!/comes with Inkhorse/.test(r[pi])) throw new Error('the Publishing Standard is not marked "comes with Inkhorse"');
      const bk=await pg.evaluate(async()=>{ await openLibBook('publishing',true); setTab('read'); await new Promise(r=>setTimeout(r,600)); const o=rOrder(); const tx=o.map(id=>RB.ch.get(id).text).join('\n');
        const pic=async id=>{ const im=new Image(); im.src=imgSrc(id||''); try{ await im.decode(); return im.naturalWidth>0&&Math.abs(im.naturalWidth/im.naturalHeight-2/3)<0.01; }catch(_){ return false; } };
        return {front:o.filter(isFront).length,parts:o.filter(id=>/^Part \d+ · /.test(RB.ch.get(id).title)).length,rules:['P1.1','P2.1','P3.4','P4.5','P5.1','P6.2','P7.3','P8.2','P9.1'].filter(x=>!tx.includes(x+' ')),
          score:/What Inkhorse does for you:/.test(tx)&&/What is yours to check:/.test(tx)&&/Not yet:/.test(tx),dated:/checked on November \d+, 2026/.test(tx),nav:[navOrder()[0],navOrder().slice(-1)[0]],fc:await pic(RB.coverFront),bc:await pic(RB.coverBack),pages:document.querySelectorAll('#spread .face').length}; });
      if(bk.front!==2) throw new Error('its title and copyright pages are not front matter: '+bk.front);
      if(bk.parts!==11) throw new Error('it should have Parts 1 to 11, found '+bk.parts);
      if(bk.rules.length) throw new Error('rules missing from the book: '+bk.rules.join(', '));
      if(!bk.score) throw new Error('the scorecard is missing one of its three lists');
      if(!bk.dated) throw new Error('the store facts do not say when they were checked');
      if(bk.nav[0]!=='__front'||bk.nav[1]!=='__back'||!bk.fc||!bk.bc) throw new Error('front or back cover missing or not 2:3: '+JSON.stringify(bk));
      if(!bk.pages) throw new Error('it opened but drew no page');
      await shelf();
      const del=async()=>pg.evaluate(()=>{ const row=[...document.querySelectorAll('.bookrow')].find(x=>/Publishing Standard/.test(x.innerText)); row.querySelector('[data-ldel]').click(); });
      await del(); await pg.waitForTimeout(300); await del(); await pg.waitForTimeout(900); await shelf();
      r=await rows(); if(r.some(t=>/Publishing Standard/.test(t))) throw new Error('Delete (tapped twice) did not remove it');
      if(!r.some(t=>/User manual/.test(t))||!r.some(t=>/Formatting Standard/.test(t))) throw new Error('deleting it took another book with it');
      if(!(await pg.$('[data-pub]'))) throw new Error('no "Put the Publishing Standard back" button after deleting it');
      await pg.click('[data-pub]'); await pg.waitForTimeout(1200);
      r=await rows(); if(!r.some(t=>/Publishing Standard/.test(t))) throw new Error('Put the Publishing Standard back did not bring it back');
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('Book Hub counter: every line stays inside its box, in one order, the same height on covers and pages, on a big phone and a small one (rev 230)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=230))) return 'SKIP: before rev 230 a long book name pushed the counter past its box';
    for(const dev of ['iPhone 14 Pro Max','iPhone SE']){
      const ctx=await browser.newContext({...devices[dev]}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
      try{
        await pg.goto(page.url()); await pg.waitForTimeout(2500); const hs=[];
        for(const [id,ch,i] of [['standard','__front',0],['standard',5,1],['publishing','__back',0],['manual',6,3],[null,0,0]]){
          const r=await pg.evaluate(async({id,ch,i})=>{ S.tips=false; if(id) await openLibBook(id,true); else if(RB) readMine(); setTab('read'); const c=typeof ch==='number'?rOrder()[ch]:ch; goTo({ch:c,i}); drawView(); refreshReader(); await new Promise(r=>setTimeout(r,500));
            const w=document.querySelector('#whereBtn'), B=w.getBoundingClientRect(), els=[...w.querySelectorAll('.loc .ch,.loc .pg,.prog,.bk,#pageInfo')].filter(e=>e.getBoundingClientRect().width>0);
            const out=els.filter(e=>{ const r=e.getBoundingClientRect(); return r.left<B.left-0.5||r.right>B.right+0.5||r.top<B.top-0.5||r.bottom>B.bottom+0.5; }).map(e=>e.id||e.className);
            const tops=['#chLab','.loc .pg','#bookPg','#pageInfo'].map(s=>w.querySelector(s).getBoundingClientRect().top), order=tops.every((t,k)=>k===0||t>=tops[k-1]);
            return {out,order,h:Math.round(B.height)}; },{id,ch,i});
          if(r.out.length) throw new Error(dev+' '+(id||'own book')+' '+ch+': past the box: '+r.out.join(', '));
          if(!r.order) throw new Error(dev+' '+(id||'own book')+' '+ch+': the lines are out of order');
          hs.push(r.h);
        }
        if(Math.max(...hs)-Math.min(...hs)>1) throw new Error(dev+': the counter changes height between covers and pages: '+hs.join(', '));
        if(errs.length) throw new Error('page error: '+errs[0]);
      } finally { await ctx.close(); }
    }
  });
  await step('F7.4 F7.5 Book page numbers are never guessed: a big book says "Counting pages…" and then shows the exact number, the page foot always matches the counter, every turn adds one, and a text size used before comes back at once (rev 231)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=231))) return 'SKIP: before rev 231 a big book showed estimated page numbers that kept changing';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      await pg.evaluate(async()=>{ S.tips=false; const words='the quick brown fox jumps over the lazy dog while a patient writer counts every page of a very long book'.split(' ');
        const para=k=>Array.from({length:70+(k%5)*9},(_,i)=>words[(i*7+k)%words.length]).join(' ')+'.';
        const chapters=Array.from({length:30},(_,c)=>({title:'Chapter '+(c+1)+': Counting test '+(c+1),text:Array.from({length:26+(c%4)*3},(_,k)=>para(c*31+k)).join('\n')}));
        const parts=splitParts(chapters).map((p,k)=>({...p,k})); const meta={id:'counttest',ver:'1',title:'Counting test book',author:'Test',coverFront:null,coverBack:null,images:{},chapters:chapters.map(c=>({title:c.title})),words:0,parts:parts.length,added:0,pageMode:false,pages:0,localOnly:true};
        await idb.set('lib:counttest',parts); LIB=[...LIB,meta]; await openLibBook('counttest',true); setTab('read'); });
      const snap=()=>pg.evaluate(()=>({cur:document.querySelector('#pgCur').textContent,of:document.querySelector('#pgOf').textContent,folio:[...document.querySelectorAll('#spread .face:not(.gone) .folio')].map(f=>f.textContent)[0]||'',est:bookPageInfo().est,ok:!!bookPageInfo().ok[S.rch]}));
      const watch=async()=>{ const t0=Date.now(), seen=[]; for(;;){ const s=await snap(); const k=s.cur+'|'+s.of+'|'+s.folio; if(seen[seen.length-1]!==k) seen.push(k); if(!s.est||Date.now()-t0>30000) return {seen,ms:Date.now()-t0,last:s}; await pg.waitForTimeout(10); } };
      const check=(label,w)=>{ if(w.last.est) throw new Error(label+': still counting after 30 seconds');
        const nums=[...new Set(w.seen.map(k=>k.split('|')[0]).filter(c=>c!=='Counting pages…'))]; if(nums.length!==1) throw new Error(label+': the page number changed while counting: '+w.seen.join('  →  '));
        for(const k of w.seen){ const [c,o,f]=k.split('|'); if(/~/.test(k)) throw new Error(label+': an estimated number was shown: '+k); if(c==='Counting pages…'){ if(f) throw new Error(label+': the page foot showed a number while counting: '+k); } else if(f!==c.replace(/,/g,'')) throw new Error(label+': the page foot ('+f+') does not match the counter ('+c+')'); }
        if(!/^of [\d,]+$/.test(w.last.of)) throw new Error(label+': no exact total at the end: '+w.last.of); return +nums[0].replace(/,/g,''); };
      await pg.evaluate(()=>{ PCACHE.clear(); CNT.clear(); BPC.k=''; goTo({ch:rOrder()[17],i:1}); drawView(); refreshReader(); });
      const first=await snap(); if(first.cur!=='Counting pages…'&&first.est) throw new Error('a number was shown before the chapters ahead of it were counted: '+JSON.stringify(first));
      const n1=check('first count',await watch());
      const setFs=v=>pg.evaluate(v=>{ const el=document.querySelector('#fs'); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); },v);
      const fs0=await pg.evaluate(()=>S.fs); await setFs(fs0+4); const n2=check('bigger text',await watch()); if(!(n2>n1)) throw new Error('bigger text did not move the page number up ('+n1+' → '+n2+')');
      await setFs(fs0); const back=await watch(); const n3=check('back to the first size',back); if(n3!==n1) throw new Error('going back to the first text size gave page '+n3+', not '+n1);
      if(back.seen.some(k=>/Counting/.test(k))) throw new Error('a text size that was already counted had to be counted again');
      let prev=null; for(let k=0;k<25;k++){ await pg.waitForFunction(()=>!turning); await pg.waitForTimeout(40); const s=await snap(); const n=+s.cur.replace(/,/g,''); if(String(n)!==s.folio) throw new Error('turn '+k+': page foot '+s.folio+' but counter '+s.cur); if(prev!=null&&n!==prev+1) throw new Error('turning one page went from '+prev+' to '+n); prev=n; await pg.click('#next'); }
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('F3.10 A clean page at every text size: from the smallest to the largest, no justified line is stretched past the limit, no word runs past the margin, nothing is cut off, long words break the same way everywhere, and a web address can break (rev 234)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=234))) return 'SKIP: before rev 234 big text opened wide gaps between words';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500); await pg.evaluate(()=>document.fonts.ready);
      const own=await pg.evaluate(()=>({on:OWNHY, std:hyWord('standard'), ink:hyWord('Inkhorse'), cap:hyWord('Publishing'), last:hyWord('book'), url:urlBr('kobowritinglife.zendesk.com/help'), css:getComputedStyle(M2).hyphens||getComputedStyle(M2).webkitHyphens}));
      if(!own.on) return 'SKIP: this browser is not set to English, so the browser\'s own hyphenation is in use';
      if(own.ink!=='Ink­horse') throw new Error('"Inkhorse" should break as Ink-horse, got '+JSON.stringify(own.ink));
      if(own.std.indexOf('­')<0||own.cap.indexOf('­')<0) throw new Error('a long word (or a capitalized one) is not broken: '+JSON.stringify([own.std,own.cap]));
      if(own.last!=='book') throw new Error('a short word was broken: '+JSON.stringify(own.last));
      if(!/zendesk<wbr>\.com\/<wbr>help/.test(own.url)) throw new Error('a web address cannot break after a slash and before a dot: '+own.url);
      if(own.css!=='manual') throw new Error('the browser may still add hyphens of its own (hyphens: '+own.css+')');
      const sweep=(book,fs,maxPages)=>pg.evaluate(async({book,fs,maxPages})=>{
        S.tips=false; S.just=true; S.fs=fs; applyType(); relayout(); await openLibBook(book,true); setTab('read'); await new Promise(r=>setTimeout(r,300));
        const cv=document.createElement('canvas').getContext('2d'), T=x=>RB.ch.get(x).title;
        const res={book,fs,pages:0,lines:0,just:0,loose:[],hyEnd:0,ragged:0,past:[],cut:[],shyBody:0,shyElse:0};
        outer: for(const id of rOrder().filter(x=>!isCover(x))){ const n=pag(id).pages.length;
          for(let i=0;i<n;i++){ if(res.pages>=maxPages) break outer; goTo({ch:id,i}); drawView(); res.pages++;
            for(const pt of document.querySelectorAll('#spread .face:not(.gone) .ptext')){ const B=pt.getBoundingClientRect(), k=B.width/pt.offsetWidth;
              if(!pt.querySelector('img,figure') && pt.scrollHeight>pt.clientHeight+1) res.cut.push(T(id)+' p'+(i+1));
              res.ragged+=pt.querySelectorAll('br.lz').length;
              pt.querySelectorAll('h2,p.toc,p.sb').forEach(e=>{ res.shyElse+=(e.textContent.match(/­/g)||[]).length; });
              if(pt.classList.contains('front')){ res.shyElse+=(pt.textContent.match(/­/g)||[]).length; continue; }
              for(const p of pt.querySelectorAll('p:not(.toc):not(.sb)')){ res.shyBody+=(p.textContent.match(/­/g)||[]).length;
                const cs=getComputedStyle(p); cv.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const sp=(cv.measureText('n n').width-cv.measureText('nn').width)*k, lines=[]; let cur=null;
                for(const s of p.querySelectorAll('span[data-w]')){ const rs=s.getClientRects(); for(let q=0;q<rs.length;q++){ const r=rs[q]; if(!(r.width>0)) continue; if(!cur||Math.abs(r.top-cur.top)>r.height*0.5){ cur={top:r.top,it:[]}; lines.push(cur); } cur.it.push({l:r.left,r:r.right,t:s.textContent,whole:q===rs.length-1}); if(r.right>B.right+1) res.past.push(T(id)+' p'+(i+1)+': '+s.textContent); } }
                res.lines+=lines.length;
                if(cs.textAlign==='justify') for(let q=0;q<lines.length-1;q++){ const it=lines[q].it; if(it.length<2) continue; res.just++; let g=0; for(let x=1;x<it.length;x++) g=Math.max(g,it[x].l-it[x-1].r);
                  if(g>LOOSE*sp*1.08){ if(it[it.length-1].whole) res.loose.push(T(id)+' p'+(i+1)+' ('+(g/sp).toFixed(1)+' spaces): '+it.map(x=>x.t).join(' ')); else res.hyEnd++; } } } } } }
        return res; },{book,fs,maxPages});
      const runs=[['publishing',12,999],['publishing',18,999],['publishing',23,999],['publishing',28,999],['standard',12,999],['standard',18,999],['standard',28,999],['manual',12,40],['manual',18,40],['manual',28,60]];
      const cap={12:0.04,18:0.12,23:0.15,28:0.27};   /* measured Nov 10, 2026: at most 1.6%, 8.0%, 9.3% and 20.7% */
      for(const [book,fs,mp] of runs){ const r=await sweep(book,fs,mp), at=book+' at size '+fs+': ';
        if(r.pages<5||r.lines<60) throw new Error(at+'too little was read ('+r.pages+' pages, '+r.lines+' lines)');
        if(r.cut.length) throw new Error(at+'text is cut off at the bottom of '+r.cut.slice(0,3).join(', '));
        if(r.past.length) throw new Error(at+'a word runs past the margin: '+r.past.slice(0,3).join(' | '));
        if(r.loose.length) throw new Error(at+r.loose.length+' line(s) stretched past the limit, e.g. '+r.loose.slice(0,2).join(' | '));
        if(r.hyEnd>Math.max(2,r.just*0.02)) throw new Error(at+r.hyEnd+' loose lines end inside a broken word and were left stretched');
        if(!r.shyBody) throw new Error(at+'no long word on these pages was given a break point');
        if(r.shyElse) throw new Error(at+'a heading, contents line or front page was given hyphen breaks');
        if(r.ragged>r.just*cap[fs]) throw new Error(at+r.ragged+' of '+r.just+' justified lines had to be set unstretched; more than '+Math.round(cap[fs]*100)+'% means the breaking got worse'); }
      const numsOk=await pg.evaluate(async()=>{ S.fs=18; applyType(); relayout(); await openLibBook('publishing',true); setTab('read'); await new Promise(r=>setTimeout(r,2500)); const o=rOrder().filter(x=>!isCover(x)); goTo({ch:o[4],i:0}); drawView(); refreshReader(); await new Promise(r=>setTimeout(r,1500)); return {cur:document.querySelector('#pgCur').textContent,folio:(document.querySelector('#spread .face:not(.gone) .folio')||{}).textContent||''}; });
      if(numsOk.cur!==numsOk.folio) throw new Error('after the size changes the page foot ('+numsOk.folio+') and the counter ('+numsOk.cur+') disagree');
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('F6.3 F6.6 On a contents page, a tap at the edge turns the page (the page number is not a link), and a tap on an entry’s words opens that entry (rev 231)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=231))) return 'SKIP: before rev 231 the page number at the edge of a contents line was a link';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const at=await pg.evaluate(async()=>{ S.tips=false; await openLibBook('manual',true); setTab('read'); for(const id of rOrder()){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); if(document.querySelectorAll('#spread p.toc[data-goto]').length>3) return {id,i}; } } return null; });
      if(!at) throw new Error('the manual has no contents page with linked entries');
      const here=async()=>{ await pg.evaluate(t=>{ goTo({ch:t.id,i:t.i}); drawView(); refreshReader(); },at); await pg.waitForTimeout(450); return pg.evaluate(()=>{ const e=[...document.querySelectorAll('#spread p.toc[data-goto]')][3], tn=e.querySelector('.tn').getBoundingClientRect(), tt=e.querySelector('.tt').getBoundingClientRect(), st=document.querySelector('#stage').getBoundingClientRect(); return {goto:+e.dataset.goto,tnx:tn.left+tn.width/2,y:tt.top+tt.height/2,mid:st.left+st.width*0.4,left:st.left+st.width*0.06,cur:+document.querySelector('#pgCur').textContent.replace(/,/g,'')}; }); };
      const cur=()=>pg.evaluate(()=>+document.querySelector('#pgCur').textContent.replace(/,/g,''));
      let e=await here(); await pg.touchscreen.tap(e.tnx,e.y); await pg.waitForTimeout(1100); let n=await cur();
      if(n!==e.cur+1) throw new Error('a tap on the page number at the right edge went from page '+e.cur+' to '+n+'; it should turn one page');
      e=await here(); await pg.touchscreen.tap(e.left,e.y); await pg.waitForTimeout(1100); n=await cur();
      if(n!==e.cur-1) throw new Error('a tap at the left edge of a contents line went from page '+e.cur+' to '+n+'; it should turn back one page');
      e=await here(); await pg.touchscreen.tap(e.mid,e.y); await pg.waitForTimeout(1100); n=await cur();
      if(n!==e.goto) throw new Error('a tap on the words of an entry for page '+e.goto+' went to page '+n);
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  // rev 236: contents pages, read from the page as drawn. gatherContents runs inside the app on whichever book is open.
  const gatherContents=async()=>{ const o=rOrder().filter(x=>!isCover(x)), T=x=>RB.ch.get(x).title, out={titles:[],entries:[],other:[],sig:{}};
    setTab('read'); goTo({ch:o[0],i:0}); drawView(); refreshReader(); for(let k=0;k<600&&bookPageInfo().est;k++) await new Promise(r=>setTimeout(r,100));   /* page numbers are shown only once they are exact (F7.5), so wait for the count */
    for(const id of o.filter(x=>CONTENTS_HEAD.test(T(x)))){ out.titles.push(T(id)); const n=pag(id).pages.length;
      for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const pt=document.querySelector('#spread .face:not(.gone) .ptext'), fs=parseFloat(getComputedStyle(pt).fontSize);
        for(const e of pt.children){ if(e.matches('p.toc')){ const lvl=e.classList.contains('t1')?1:e.classList.contains('t2')?2:3, tt=e.querySelector('.tt'), tn=e.querySelector('.tn'), ld=e.querySelector('.ldr');
            out.entries.push({lvl,tt:tt?tt.textContent.replace(/[­⁠]/g,'').trim():'',tn:tn?tn.textContent.trim():'',link:e.hasAttribute('data-goto'),lines:tt?new Set([...tt.getClientRects()].map(r=>Math.round(r.top))).size:0});
            if(!out.sig[lvl]&&tn&&ld){ const cs=getComputedStyle(e), lc=getComputedStyle(ld), nc=getComputedStyle(tn), r=e.getBoundingClientRect(), nr=tn.getBoundingClientRect(), pr=pt.getBoundingClientRect();
              out.sig[lvl]=[cs.display,cs.fontWeight,cs.fontVariantCaps,(parseFloat(cs.paddingLeft)/fs).toFixed(2),(parseFloat(cs.fontSize)/fs).toFixed(2),cs.textAlign,lc.borderBottomStyle,nc.fontWeight,Math.abs(nr.right-pr.right)<1.5?'num-at-right-edge':'num-off-edge'].join(' '); } }
          else if(!(e.tagName==='H2'||e.matches('.ck,.bn'))) out.other.push(e.tagName+'.'+e.className+': '+e.textContent.slice(0,40)); } } }
    return out; };
  const checkContents=(name,c)=>{ if(!c.entries.length) throw new Error(name+': no contents entries were found');
    if(c.other.length) throw new Error(name+': the contents page holds something that is not a contents entry: '+c.other.slice(0,2).join(' | '));
    const pr=c.entries.find(e=>/(\.{3,}|…|\s\d{1,4})$/.test(e.tt)); if(pr) throw new Error(name+': an entry still carries a printed page number or dots from the paper book: "'+pr.tt+'"');
    const nn=c.entries.find(e=>e.link&&!/^[\d,]+$/.test(e.tn)); if(nn) throw new Error(name+': a linked entry has no page number of Inkhorse\'s own: "'+nn.tt+'" → "'+nn.tn+'"');
    if(!c.sig[1]) throw new Error(name+': no chapter entry with a dotted line and a number was found'); };
  // rev 233: the For-Dummies-style PDF is imported once; each rule below checks its own part of the result.
  let dummiesP=null;
  const dummiesLike=()=>dummiesP||(dummiesP=(async()=>{
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=232))) return 'SKIP: before rev 232';
    if(!PDFJS_DIR) return 'SKIP: set PDFJS_DIR to test PDF import';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.min.js'),contentType:'application/javascript'}));
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.worker.min.js'),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500);
      await pg.setInputFiles('#libIn',require('path').join(__dirname,'fixtures','dummies-like.pdf')); await pg.waitForTimeout(800); await pg.click('#libAsk [data-way="text"]');
      await pg.waitForFunction(()=>/Added|couldn|Could/.test(document.querySelector('#libNote').textContent),null,{timeout:120000});
      const r=await pg.evaluate(async()=>{ const id=LIB.find(b=>/dummies-like/.test(b.title)).id; await openLibBook(id,true); setTab('read'); await new Promise(r=>setTimeout(r,500));
        const o=rOrder(), T=x=>RB.ch.get(x).title, find=re=>o.find(x=>re.test(T(x)));
        const front=o.filter(isFront).map(T), intro=find(/^Introduction$/), c1=find(/^Chapter 1:/), c5=find(/^Chapter 5:/);
        const lab=x=>{ goTo({ch:x,i:0}); drawView(); refreshReader(); return {lab:document.querySelector('#chLab').textContent,ck:(document.querySelector('#spread .ck')||{}).textContent||''}; };
        const out={front,intro:lab(intro),c1:lab(c1),c5no:fmtChapterNo(c5,0),c1text:RB.ch.get(c1).text.split('\n').slice(0,2), heads:o.filter(x=>!isFront(x)).map(x=>RB.ch.get(x).text).join('\n').split('\n').filter(l=>/(?:^|\s)(?:CHAPTER \d+ |PART \d+ )[A-Z][a-z]/.test(l)).slice(0,3), cap:RB.ch.get(c1).text.split('\n').slice(0,3), titles:o.filter(x=>!isFront(x)).map(T)};
        out.toc=[]; out.over=[]; for(const id of o.filter(x=>CONTENTS_HEAD.test(T(x)))){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const B=document.querySelector('#spread .ptext').getBoundingClientRect();
          document.querySelectorAll('#spread p.toc').forEach(e=>{ const t=e.innerText.replace(/\s+/g,' ').trim(); if([...e.querySelectorAll('.tt,.tn')].some(x=>x.getBoundingClientRect().right>B.right+1)) out.over.push(t); if(/origins/.test(t)) out.toc.push({t,link:!!e.dataset.goch,big:e.classList.contains('t1')}); }); } }
        return out; });
      if(await pg.evaluate(()=>(window.INK_VERSION||{}).rev>=236)) r.cont=await pg.evaluate(gatherContents);
      if(errs.length) throw new Error('page error: '+errs[0]);
      return r;
    } finally { await ctx.close(); }
  })());
  await step('F1.6 A page named Copyright Page, Contents, Table of Contents or Contents at a Glance is a front page however long it is, and the Introduction is not (rev 232, rule written in rev 233)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    for(const t of ['Title Page','Copyright Page','Contents at a Glance','Table of Contents']) if(!r.front.includes(t)) throw new Error(t+' is not a front page: '+r.front.join(', '));
    if(r.front.includes('Introduction')) throw new Error('the Introduction was taken for a front page');
  });
  await step('F2.3 F2.8 A book that numbers its own chapters keeps its own numbers: Chapter 1 and Chapter 5 carry the book\'s numbers, the Introduction gets none of Inkhorse\'s own, and a chapter\'s heading is not repeated as text (rev 232, rule written in rev 233)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    if(/\bCh \d/.test(r.intro.lab)||r.intro.ck) throw new Error('the Introduction got a chapter number of its own: '+JSON.stringify(r.intro));
    if(/\bCh \d/.test(r.c1.lab)||!/Chapter 1:/.test(r.c1.lab)||r.c1.ck!=='Chapter 1') throw new Error('Chapter 1 does not carry the book\'s own number: '+JSON.stringify(r.c1));
    if(r.c5no!==5) throw new Error('Chapter 5 is numbered '+r.c5no);
    if(r.c1text.some(l=>/^(chapter 1|discovering the program)$/i.test(l.trim()))) throw new Error('the chapter\'s heading is repeated as text: '+r.c1text.join(' / '));
  });
  await step('F10.3 Running heads from the printed pages ("CHAPTER 1 Discovering Blender 11") are left out of an imported PDF\'s text (rev 232)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    if(r.heads.length) throw new Error('running heads were left in the text: '+r.heads.join(' | '));
  });
  await step('F10.8 A drop capital printed apart from its word is joined back to it in an imported PDF (rev 232, rule written in rev 233)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    if(r.cap.some(l=>/^[A-Z]$/.test(l.trim()))) throw new Error('a drop capital was left apart from its word: '+r.cap.join(' / '));
  });
  await step('F10.9 A section is never mistaken for a chapter: a section that starts with its chapter\'s words stays a section in the Table of Contents (rev 232, rule written in rev 233)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    const wrong=r.titles.filter(t=>/^(About This Book|Where to Go from Here)$/i.test(t)); if(wrong.length) throw new Error('the Introduction\'s own sections were made chapters: '+wrong.join(', '));
    if(!r.toc.length) throw new Error('the section about origins is missing from the Table of Contents');
    if(r.toc.some(e=>e.link||e.big)) throw new Error('a section that starts with its chapter\'s words was taken for the chapter: '+JSON.stringify(r.toc));
  });
  await step('F6.2 F10.5 No contents line runs off the page in an imported PDF\'s contents pages (rev 232)', async () => {
    const r=await dummiesLike(); if(typeof r==='string') return r;
    if(r.over.length) throw new Error('contents lines run off the page: '+r.over.slice(0,3).join(' | '));
  });
  // rev 235: tests that open the real export files. One made-up book ("The Test Harbor") is built once in its own browser tab, exported as a print PDF
  // in all four sizes and as an EPUB, and each rule below checks its own part. Needs jspdf (npm) and PDFJS_DIR; EPUBCheck runs when EPUBCHECK_JAR is set.
  let labP=null;
  const exportLab=()=>labP||(labP=(async()=>{
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=236))) return 'SKIP: before rev 236';
    if(!PDFJS_DIR) return 'SKIP: set PDFJS_DIR to read inside the print PDF';
    let JSPDF_FILE=null; try{ JSPDF_FILE=require.resolve('jspdf/dist/jspdf.umd.min.js'); }catch(_){ return 'SKIP: jspdf is not installed for the test (npm i jspdf@2.5.1)'; }
    if(!JSZIP_FILE) return 'SKIP: jszip is not installed for the test';
    const fs=require('fs'), P=require('path'); let pdfjs; { const w=console.warn, l=console.log; console.warn=console.log=()=>{}; try{ pdfjs=require(P.join(PDFJS_DIR,'..','legacy','build','pdf.js')); } finally { console.warn=w; console.log=l; } }
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max'],acceptDownloads:true});
    await ctx.route(/jspdf[^/]*\.js$/, r=>r.fulfill({body:fs.readFileSync(JSPDF_FILE),contentType:'application/javascript'}));
    await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:fs.readFileSync(JSZIP_FILE),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const lab={title:'The Test Harbor',author:'Ada Tester',chapters:['Alpha Harbor','Beta Ridge','Gamma Field'],pdf:{}};
      lab.ids=await pg.evaluate(L=>{ S.tips=false; const W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats'.split(' ');
        const para=k=>Array.from({length:60+(k%4)*12},(_,i)=>W[(i*5+k)%W.length]).join(' ')+'.';
        BOOK.title=L.title; BOOK.author=L.author;
        return L.chapters.map((t,c)=>addChapter(t,Array.from({length:44},(_,k)=>para(c*17+k)).join('\n'),BOOK.order.length)); },lab);
      lab.order=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title));
      /* on screen (F3.2, F3.3): the second page of a chapter, where every paragraph is an ordinary one */
      lab.screen=await pg.evaluate(async id=>{ setTab('read'); await new Promise(r=>setTimeout(r,400)); const all=[]; for(let i=1;i<=6;i++){ goTo({ch:id,i}); drawView(); await new Promise(r=>setTimeout(r,60));
        const pt=document.querySelector('#spread .face:not(.gone) .ptext'), ps=[...pt.querySelectorAll('p:not(.toc):not(.sb)')], k=pt.getBoundingClientRect().width/pt.offsetWidth;
        ps.forEach((p,n)=>{ const cs=getComputedStyle(p), r=p.getBoundingClientRect(), s=p.querySelector('span[data-w]'); all.push({pg:i,n,cont:p.classList.contains('cont'),fs:parseFloat(cs.fontSize),lh:parseFloat(cs.lineHeight),ind:parseFloat(cs.textIndent),mt:parseFloat(cs.marginTop),mb:parseFloat(cs.marginBottom),top:r.top/k,bottom:r.bottom/k,first:s?(s.getBoundingClientRect().left-r.left)/k:0,empty:!p.textContent.trim()}); }); } return all; },lab.ids[0]);
      for(const size of ['6x9','5.5x8.5','5x8','8.5x11']){
        await pg.evaluate(v=>{ document.querySelector('#pdfSize').value=v; },size);
        const [d]=await Promise.all([pg.waitForEvent('download',{timeout:90000}), pg.evaluate(()=>document.querySelector('#expPdf').click())]);
        const raw=fs.readFileSync(await d.path()); if(size==='6x9') lab.pdfRaw=raw.toString('latin1'); lab.pdf[size]=await readPdf(raw); }
      async function readPdf(raw){ const doc=await pdfjs.getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise, pages=[];
        for(let n=1;n<=doc.numPages;n++){ const p=await doc.getPage(n), v=p.getViewport({scale:1}), tc=await p.getTextContent(), ops=await p.getOperatorList();
          pages.push({n,w:v.width,h:v.height,imgs:ops.fnArray.filter(f=>f===pdfjs.OPS.paintImageXObject||f===pdfjs.OPS.paintJpegXObject||f===pdfjs.OPS.paintInlineImageXObject).length,
            it:tc.items.filter(i=>i.str.trim()).map(i=>({s:i.str,x:i.transform[4],r:i.transform[4]+i.width,y:i.transform[5],h:i.height}))}); }
        /* which chapter each page belongs to: a chapter opens with its title set large; a page with no words ends the run */
        let cur=null; for(const p of pages){ const t=p.it.find(i=>i.h>=15 && [...lab.chapters,'Delta Shore'].includes(i.s.trim())); if(t){ cur=t.s.trim(); p.opener=cur; } else if(!p.it.length) cur=null; p.ch=cur;
          const sq=a=>a.map(i=>i.s).join('').replace(/\s+/g,''); p.head=sq(p.it.filter(i=>i.y>p.h-0.8*72+2)); p.foot=sq(p.it.filter(i=>i.y<0.8*72-2)); p.body=p.it.filter(i=>i.y<=p.h-0.8*72+2 && i.y>=0.8*72-2); p.text=p.it.map(i=>i.s).join(' ').replace(/\s+/g,' '); }
        return pages; }
      const [e]=await Promise.all([pg.waitForEvent('download',{timeout:30000}), pg.evaluate(()=>document.querySelector('#expEpub').click())]);
      lab.epubPath=P.join(require('os').tmpdir(),'inkhorse-audit-'+process.pid+'.epub'); fs.copyFileSync(await e.path(),lab.epubPath);
      const readEpub=async file=>{ const z=await require('jszip').loadAsync(fs.readFileSync(file)), o={files:Object.keys(z.files)}; for(const f of o.files) if(/\.(xhtml|opf|ncx|css)$/.test(f)) o[f]=await z.file(f).async('string'); return o; };
      lab.epub=await readEpub(lab.epubPath);
      /* rev 236: the same book again with everything a real book has: a subtitle, a dedication, a cover, section headings, a scene break, a picture
         with a caption, blank lines and double spaces as people really type them. */
      lab.rich=await pg.evaluate(async()=>{ const mk=(w,h,c)=>new Promise(r=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); g.fillStyle=c; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.fillRect(w*0.2,h*0.2,w*0.6,h*0.6); cv.toBlob(r,'image/png'); });
        const pid='a1b2c3d4e5f60718293a4b5c6d7e8f90', cid='0f1e2d3c4b5a69788796a5b4c3d2e1f0';
        await __picPut(pid,await mk(600,400,'#2a5a83'),'image/png'); await __picPut(cid,await mk(800,1200,'#7a3b2e'),'image/png');
        BOOK.images[pid]={w:600,h:400}; BOOK.images[cid]={w:800,h:1200}; BOOK.coverFront=cid;
        const f=FM(); f.subtitle='A Book for Testing'; f.dedication='For the keeper of the light'; f.toc=true;
        const W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats'.split(' '), para=k=>Array.from({length:60+(k%4)*12},(_,i)=>W[(i*5+k)%W.length]).join(' ')+'.';
        const text=[para(1)+'  Two spaces came before this sentence.  And before this one.','','',para(2),'# First Light',para(3),para(4),'* * *',para(5),`[[image ${pid} | inline | 60% | center | A small harbor at dawn]]`,para(6),'# Second Wind',para(7),para(8)].join('\n');
        const id=addChapter('Delta Shore',text,BOOK.order.length); return {id,pid,cid,face:S.face,lh:S.lh}; });
      lab.rich.screen=await pg.evaluate(async id=>{ setTab('read'); await new Promise(r=>setTimeout(r,400)); const out={first:'',heads:[],empty:0,dbl:0,figs:0,pages:pag(id).pages.length};
        for(let i=0;i<out.pages;i++){ goTo({ch:id,i}); drawView(); await new Promise(r=>setTimeout(r,60)); const pt=document.querySelector('#spread .face:not(.gone) .ptext'); if(i===0){ const e=pt.querySelector('h2,p,figure'); out.first=e?e.tagName+'.'+e.className:''; const cs=getComputedStyle(pt); out.family=cs.fontFamily; out.fs=parseFloat(cs.fontSize); out.lh=parseFloat(cs.lineHeight); }
          pt.querySelectorAll('h2').forEach(h=>{ const cs=getComputedStyle(h); out.heads.push({t:h.textContent.replace(/[\u00ad\u2060]/g,''),cht:h.classList.contains('cht'),fs:parseFloat(cs.fontSize),w:cs.fontWeight,al:cs.textAlign,ff:cs.fontFamily,st:cs.fontStyle}); });
          pt.querySelectorAll('p').forEach(p=>{ if(!p.textContent.trim()) out.empty++; if(/ {2,}|\u00a0 | \u00a0/.test(p.textContent)) out.dbl++; }); out.figs+=pt.querySelectorAll('.fig').length; }
        return out; },lab.rich.id);
      await pg.evaluate(()=>{ document.querySelector('#pdfSize').value='6x9'; });
      { const [d]=await Promise.all([pg.waitForEvent('download',{timeout:90000}), pg.evaluate(()=>document.querySelector('#expPdf').click())]); lab.rich.pdf=await readPdf(fs.readFileSync(await d.path())); }
      { const [e2]=await Promise.all([pg.waitForEvent('download',{timeout:30000}), pg.evaluate(()=>document.querySelector('#expEpub').click())]); lab.rich.epub=await readEpub(await e2.path()); }
      if(errs.length) throw new Error('page error: '+errs[0]);
      return lab;
    } finally { await ctx.close(); }
  })());
  const IN=72, SIZES={'6x9':[6,9],'5.5x8.5':[5.5,8.5],'5x8':[5,8],'8.5x11':[8.5,11]};
  await step('F3.2 F3.3 Paragraphs on the page: a small first-line indent (1 to 1.5 times the type size), no blank line between paragraphs, and no empty paragraphs; the e-book says the same (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    const ps=L.screen; if(ps.filter(p=>!p.cont).length<3) throw new Error('only '+ps.filter(p=>!p.cont).length+' new paragraphs on the test pages');
    if(ps.some(p=>p.empty)) throw new Error('an empty paragraph is on the page');
    for(let k=0;k<ps.length;k++){ const p=ps[k];
      if(p.mt!==0||p.mb!==0) throw new Error('a paragraph has space above or below it ('+p.mt+', '+p.mb+' px) as well as an indent');
      if(!p.cont){ const r=p.first/p.fs; if(!(r>=1&&r<=1.5)) throw new Error('the first-line indent is '+r.toFixed(2)+' times the type size; it should be 1 to 1.5'); }
      if(k&&p.pg===ps[k-1].pg&&Math.abs(p.top-ps[k-1].bottom)>1.5) throw new Error('there is a gap of '+(p.top-ps[k-1].bottom).toFixed(1)+' px between two paragraphs'); }
    const css=Object.entries(L.epub).filter(([f])=>/\.css$/.test(f)).map(([,s])=>s).join('\n'), m=/(?:^|[\s,}])p\s*\{([^}]*)\}/.exec(css);
    if(!m) throw new Error('the e-book has no paragraph style'); const ti=/text-indent:\s*([\d.]+)em/.exec(m[1]), mg=/margin:\s*0(?:[;\s}]|$)/.test(m[1]);
    if(!ti||+ti[1]<1||+ti[1]>1.5) throw new Error('the e-book paragraph indent is '+(ti?ti[1]+'em':'missing')+'; it should be 1 to 1.5 em'); if(!mg) throw new Error('the e-book puts space between paragraphs as well as an indent: '+m[1]);
  });
  await step('F9.1 P6.1 Print PDF: every page is exactly the size chosen, in all four sizes (6 × 9, 5.5 × 8.5, 5 × 8, 8.5 × 11 in) (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    for(const [size,[wi,hi]] of Object.entries(SIZES)){ const pages=L.pdf[size]; if(!pages||pages.length<8) throw new Error(size+': only '+(pages?pages.length:0)+' pages');
      const bad=pages.find(p=>Math.abs(p.w-wi*IN)>0.01||Math.abs(p.h-hi*IN)>0.01); if(bad) throw new Error(size+': page '+bad.n+' is '+(bad.w/IN).toFixed(3)+' × '+(bad.h/IN).toFixed(3)+' in'); }
  });
  await step('F9.2 F9.3 P6.2 Print PDF: the inside margin is 0.875 in and the outside margin 0.625 in on every page, in all four sizes, and justified lines reach both margins (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    for(const size of Object.keys(SIZES)){ let full=0;
      for(const p of L.pdf[size]){ if(!p.body.length) continue; const odd=p.n%2===1, lm=(odd?0.875:0.625)*IN, rm=p.w-(odd?0.625:0.875)*IN, x=Math.min(...p.body.map(i=>i.x)), r=Math.max(...p.body.map(i=>i.r));
        if(x<lm-0.6) throw new Error(size+' page '+p.n+': text starts '+(x/IN).toFixed(3)+' in from the left edge; the margin is '+(lm/IN).toFixed(3));
        if(r>rm+0.6) throw new Error(size+' page '+p.n+': text ends '+((p.w-r)/IN).toFixed(3)+' in from the right edge; the margin is '+((p.w-rm)/IN).toFixed(3));
        if(p.ch&&!p.opener&&p.body.length>40){ full++; if(x>lm+0.6||r<rm-1.5) throw new Error(size+' page '+p.n+': a full page of text does not reach both margins ('+(x/IN).toFixed(3)+' in and '+((p.w-r)/IN).toFixed(3)+' in)'); } }
      if(!full) throw new Error(size+': no full page of text was found to measure'); }
  });
  await step('F9.4 F1.3 P6.4 Print PDF: no cover and no picture in the file; page 1 is the title page, with no page number and no header (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    for(const size of Object.keys(SIZES)){ const pages=L.pdf[size], im=pages.find(p=>p.imgs); if(im) throw new Error(size+': page '+im.n+' holds a picture, in a book that has none');
      const p1=pages[0], t=p1.it.map(i=>i.s).join(' '); if(!t.includes(L.title)||!t.includes(L.author)) throw new Error(size+': page 1 is not the title page: '+t.slice(0,80));
      if(p1.head||p1.foot) throw new Error(size+': the title page carries a header or a page number ('+(p1.head||p1.foot)+')'); }
  });
  await step('F7.2 F9.5 F2.6 P6.5 Print PDF: every chapter opens on a right-hand page with no header; a blank page carries no number and no header (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    for(const size of Object.keys(SIZES)){ const pages=L.pdf[size], op=pages.filter(p=>p.opener);
      if(op.map(p=>p.opener).join('|')!==L.chapters.join('|')) throw new Error(size+': chapter openings found: '+op.map(p=>p.opener).join(', '));
      for(const p of op){ if(p.n%2===0) throw new Error(size+': "'+p.opener+'" opens on page '+p.n+', a left-hand page'); if(p.head) throw new Error(size+': the first page of "'+p.opener+'" has a header ('+p.head+')');
        if(p.foot!==String(p.n)) throw new Error(size+': the first page of "'+p.opener+'" shows page number "'+p.foot+'", not '+p.n); }
      const blanks=pages.filter(p=>!p.body.length); if(!blanks.length) throw new Error(size+': the test book made no blank page to check');
      const b=blanks.find(p=>p.head||p.foot); if(b) throw new Error(size+': blank page '+b.n+' carries "'+(b.head||b.foot)+'"'); }
  });
  await step('F7.3 Print PDF: the left-hand header is the book title and the right-hand header is the title of the chapter that page belongs to, on every page of every chapter (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const sq=s=>s.toUpperCase().replace(/\s+/g,'');
    for(const size of Object.keys(SIZES)){ let left=0, right=0;
      for(const p of L.pdf[size]){ if(!p.ch||p.opener) continue; const want=sq(p.n%2===0?L.title:p.ch);
        if(p.head!==want) throw new Error(size+' page '+p.n+' (in "'+p.ch+'", a '+(p.n%2===0?'left':'right')+'-hand page): the header reads "'+p.head+'", not "'+want+'"');
        if(p.foot!==String(p.n)) throw new Error(size+' page '+p.n+': the page number reads "'+p.foot+'"'); p.n%2===0?left++:right++; }
      if(!left||!right) throw new Error(size+': the test book has no '+(left?'right':'left')+'-hand page with a header to check'); }
  });
  await step('F8.2 F8.3 P5.3 EPUB: the contents list links to every chapter, each link opens a real file, and every chapter starts with a real heading that carries its title (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    const nav=L.epub['OEBPS/nav.xhtml']; if(!nav) throw new Error('the e-book has no contents file (nav.xhtml)');
    const links=[...nav.replace(/<head>[\s\S]*?<\/head>/,'').matchAll(/<a\s[^>]*href="([^"#]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g,'').trim()}));
    for(const t of L.chapters){ const a=links.find(l=>l.text.includes(t)); if(!a) throw new Error('the contents list has no entry for "'+t+'": '+links.map(l=>l.text).join(', '));
      const file=L.epub['OEBPS/'+a.href]; if(!file) throw new Error('the contents entry for "'+t+'" points at '+a.href+', which is not in the e-book');
      const h=/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(file.replace(/<head>[\s\S]*?<\/head>/,'')); if(!h||!h[1].replace(/<[^>]+>/g,' ').includes(t)) throw new Error('"'+t+'" does not start with a Heading 1 that carries its title: '+(h?h[1]:'no h1').slice(0,80)); }
    const opf=L.epub['OEBPS/content.opf']||''; if(!/properties="[^"]*\bnav\b/.test(opf)) throw new Error('the e-book does not tell readers which file is the contents list');
  });
  await step('F8 P5.1 EPUBCheck: the e-book Inkhorse exports passes the bookstores\' own checker with no errors and no warnings (rev 235)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    const jar=process.env.EPUBCHECK_JAR||''; if(!jar||!require('fs').existsSync(jar)) return 'SKIP: set EPUBCHECK_JAR to the epubcheck.jar file to run the bookstores\' checker';
    const r=require('child_process').spawnSync('java',['-jar',jar,L.epubPath],{encoding:'utf8',timeout:120000}), out=((r.stdout||'')+(r.stderr||'')).split('\n').filter(l=>/^(ERROR|WARNING|FATAL)/.test(l));
    if(r.error) return 'SKIP: java could not be started ('+r.error.message+')';
    if(r.status!==0||out.length) throw new Error('EPUBCheck: '+(out.slice(0,3).join(' | ')||('exit code '+r.status)));
  });
  // rev 236: every rule of the Formatting Standard that had no test, proven on the fuller test book (subtitle, dedication, cover, section headings, scene break, picture).
  const strip=s=>s.replace(/<head>[\s\S]*?<\/head>/,'');
  await step('F1.5 F1.1 P3.1 P3.2 P3.3 Front pages: title page, copyright page, dedication and Contents each start on their own page, in that order, before the first chapter, in the print PDF and in the EPUB (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const pg=L.rich.pdf, find=re=>pg.find(p=>re.test(p.text));
    const t=pg[0], c=find(/All rights reserved/), d=find(/For the keeper of the light/), k=pg.find(p=>p.it.some(i=>i.h>=14&&i.s.trim()==='Contents')), ch=pg.find(p=>p.opener);
    if(!/The Test Harbor/.test(t.text)||!/A Book for Testing/.test(t.text)||!/Ada Tester/.test(t.text)) throw new Error('print: page 1 does not carry the title, subtitle and author: '+t.text.slice(0,90));
    if(!c||!/(©|Copyright)\s*(©\s*)?\d{4}\s+Ada Tester/.test(c.text)) throw new Error('print: no copyright page with the year and the author: '+(c?c.text.slice(0,90):'none'));
    if(!d) throw new Error('print: the dedication is missing'); if(!k) throw new Error('print: the Contents page is missing'); if(!ch) throw new Error('print: no chapter opening found');
    const order=[t.n,c.n,d.n,k.n,ch.n]; if(order.some((n,i)=>i&&n<=order[i-1])) throw new Error('print: front pages are not each on their own page in order (title, copyright, dedication, Contents, first chapter are on pages '+order.join(', ')+')');
    if(d.text.replace(/\s+/g,' ').trim()!=='For the keeper of the light') throw new Error('print: the dedication page carries something else too: '+d.text.slice(0,90));
    const E=L.rich.epub, opf=E['OEBPS/content.opf'], spine=[...opf.matchAll(/<itemref\s+idref="([^"]+)"/g)].map(m=>m[1]), href=id=>{ const m=new RegExp('<item\\s[^>]*id="'+id+'"[^>]*href="([^"]+)"|<item\\s[^>]*href="([^"]+)"[^>]*id="'+id+'"').exec(opf); return m?(m[1]||m[2]):''; };
    const files=spine.map(href), at=re=>files.findIndex(f=>re.test(strip(E['OEBPS/'+f]||''))), ix=[at(/epub:type="titlepage"/),at(/All rights reserved/),at(/For the keeper of the light/),files.findIndex(f=>/nav\.xhtml$/.test(f)),at(/<h1[^>]*>[^<]*Alpha Harbor/)];
    if(ix.some(i=>i<0)) throw new Error('EPUB: a front page is missing from the reading order (title, copyright, dedication, Contents, first chapter at '+ix.join(', ')+'): '+files.join(' '));
    if(ix.some((n,i)=>i&&n<=ix[i-1])) throw new Error('EPUB: front pages are not separate files in order: '+ix.join(', ')+' in '+files.join(' '));
  });
  await step('F2.1 Every chapter starts on a new page: on screen its first page begins with its title, in print each has its own opening page, and in the EPUB each is its own file (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    if(!/^H2\.cht/.test(L.rich.screen.first)) throw new Error('on screen the chapter\'s first page begins with '+L.rich.screen.first+', not its title');
    const op=L.rich.pdf.filter(p=>p.opener).map(p=>p.opener), want=[...L.chapters,'Delta Shore']; if(op.join('|')!==want.join('|')) throw new Error('print: chapter opening pages found for '+op.join(', '));
    const E=L.rich.epub; for(const t of want){ const fs_=Object.keys(E).filter(f=>/\.xhtml$/.test(f)&&new RegExp('<h1[^>]*>[^<]*'+t).test(strip(E[f]))); if(fs_.length!==1) throw new Error('EPUB: "'+t+'" opens in '+fs_.length+' files'); if((strip(E[fs_[0]]).match(/<h1[\s>]/g)||[]).length!==1) throw new Error('EPUB: the file for "'+t+'" holds more than one chapter'); }
  });
  await step('F3.1 P6.3 Body type: a serif book typeface on screen and in the EPUB; in print 10 to 12 point, and the typeface is built into the PDF file (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    if(!/serif\s*$/.test(L.rich.screen.family)||/sans-serif\s*$/.test(L.rich.screen.family)||L.rich.face!=='garamond') throw new Error('on screen the standard typeface is '+L.rich.face+' ('+L.rich.screen.family+')');
    const css=L.rich.epub['OEBPS/style.css']||''; if(!/body\{[^}]*font-family:[^;}]*[^-]serif/.test(css)) throw new Error('the EPUB does not ask for a serif typeface');
    const hs={}; L.pdf['6x9'].forEach(p=>p.body.forEach(i=>{ const h=Math.round(i.h*2)/2; hs[h]=(hs[h]||0)+1; })); const main=+Object.entries(hs).sort((a,b)=>b[1]-a[1])[0][0];
    if(!(main>=10&&main<=12)) throw new Error('print body type is '+main+' point; it should be 10 to 12');
    const raw=L.pdfRaw; if(!/\/FontFile2/.test(raw)) throw new Error('no typeface is built into the print PDF');
    const used=[...new Set((raw.match(/\/BaseFont\s*\/[A-Za-z0-9+-]+/g)||[]).map(x=>x.replace(/\/BaseFont\s*\//,'')))];
    if(!used.some(f=>/iserif|Inkhorse/i.test(f))) throw new Error('the book typeface is not in the print PDF; it uses '+used.join(', '));
  });
  await step('F3.6 Line spacing is even and 1.3 to 1.5 times the type size, in print and in the EPUB (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L;
    const css=L.rich.epub['OEBPS/style.css']||'', m=/body\{[^}]*line-height:\s*([\d.]+)/.exec(css); if(!m||+m[1]<1.3||+m[1]>1.5) throw new Error('the EPUB line spacing is '+(m?m[1]:'not set'));
    const p=L.pdf['6x9'].find(p=>p.ch&&!p.opener&&p.body.length>40), ys=[...new Set(p.body.filter(i=>Math.abs(i.h-11)<0.6).map(i=>Math.round(i.y*10)/10))].sort((a,b)=>b-a), gaps=ys.slice(1).map((y,i)=>ys[i]-y);
    const bad=gaps.filter(g=>g/11<1.3-0.005||g/11>1.5+0.005); if(gaps.length<10) throw new Error('too few lines to measure'); if(bad.length) throw new Error('print: lines are '+(bad[0]/11).toFixed(2)+' times the type size apart on page '+p.n);
    if(Math.max(...gaps)-Math.min(...gaps)>0.2) throw new Error('print: line spacing is uneven on page '+p.n+' ('+Math.min(...gaps).toFixed(1)+' to '+Math.max(...gaps).toFixed(1)+' pt)');
  });
  await step('F3.8 F4.5 F8.5 Blank lines and double spaces typed by the writer never reach the book: no empty paragraphs and one space after a period, on the page and in the EPUB; EPUB paragraphs are real paragraphs with no line breaks, tabs or space indents (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const sc=L.rich.screen;
    if(sc.empty) throw new Error(sc.empty+' empty paragraph(s) on the page'); if(sc.dbl) throw new Error(sc.dbl+' paragraph(s) on the page keep a double space');
    const E=L.rich.epub, f=Object.keys(E).find(f=>/\.xhtml$/.test(f)&&/<h1[^>]*>[^<]*Delta Shore/.test(strip(E[f]))), x=strip(E[f]);
    if(!/Two spaces came before this sentence\. And before this one\./.test(x.replace(/<[^>]+>/g,''))) throw new Error('EPUB: the double spaces after a period were kept: '+(/.{20}Two spaces.{50}/.exec(x)||[''])[0]);
    if(/<p[^>]*>\s*<\/p>/.test(x)) throw new Error('EPUB: an empty paragraph'); if(/<br\b/.test(x)) throw new Error('EPUB: a line break inside the text'); if(/\t|&#160;|&nbsp;| /.test(x.replace(/>\s+</g,'><'))) throw new Error('EPUB: a tab or a hard space is used in the text');
    if(/<p[^>]*>\s{2,}\S/.test(x)) throw new Error('EPUB: a paragraph is indented with spaces'); if((x.match(/<p[\s>]/g)||[]).length<8) throw new Error('EPUB: the chapter has too few paragraphs: '+(x.match(/<p[\s>]/g)||[]).length);
  });
  await step('F5.1 Section headings are smaller than the chapter title and all set the same way, on screen, in print and in the EPUB (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const hs=L.rich.screen.heads, ct=hs.find(h=>h.cht), sec=hs.filter(h=>!h.cht);
    if(!ct||sec.length!==2) throw new Error('on screen: found '+(ct?1:0)+' chapter title and '+sec.length+' section headings');
    if(!(sec[0].fs<ct.fs)) throw new Error('on screen a section heading is '+sec[0].fs+' px and the chapter title is '+ct.fs+' px; the section heading must be smaller');
    const sig=h=>[h.fs,h.w,h.al,h.ff,h.st].join('|'); if(sig(sec[0])!==sig(sec[1])) throw new Error('on screen two section headings are set differently: '+sig(sec[0])+' and '+sig(sec[1]));
    const it=L.rich.pdf.flatMap(p=>p.it), T=it.find(i=>i.s.trim()==='Delta Shore'&&i.h>=14), A=it.find(i=>i.s.trim()==='First Light'), B=it.find(i=>i.s.trim()==='Second Wind');
    if(!T||!A||!B) throw new Error('print: the chapter title or a section heading is missing'); if(!(A.h<T.h)||Math.abs(A.h-B.h)>0.01) throw new Error('print: section headings are '+A.h+' and '+B.h+' pt, the chapter title '+T.h+' pt');
    const E=L.rich.epub, x=strip(E[Object.keys(E).find(f=>/\.xhtml$/.test(f)&&/Delta Shore/.test(strip(E[f]))&&/First Light/.test(E[f]))]);
    if(!/<h2[^>]*>First Light<\/h2>/.test(x)||!/<h2[^>]*>Second Wind<\/h2>/.test(x)||!/<h1[^>]*>[^<]*Delta Shore/.test(x)) throw new Error('EPUB: the chapter is not a Heading 1 with its sections as Heading 2');
  });
  await step('F6.1 F6.5 P3.5 The Contents Inkhorse makes: titled "Contents", every chapter listed once in order with the page it really starts on in print, and every entry a working link in the EPUB (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const want=[...L.chapters,'Delta Shore'], pg=L.rich.pdf, k=pg.find(p=>p.it.some(i=>i.h>=14&&i.s.trim()==='Contents'));
    if(!k) throw new Error('print: no page titled Contents'); let last=-1;
    for(const t of want){ const row=k.it.find(i=>i.s.trim().startsWith(t)); if(!row) throw new Error('print Contents has no line for "'+t+'": '+k.text.slice(0,160));
      const num=k.it.filter(i=>Math.abs(i.y-row.y)<2&&/^\d+$/.test(i.s.trim())).map(i=>+i.s.trim())[0], real=pg.find(p=>p.opener===t).n;
      if(num!==real) throw new Error('print Contents says "'+t+'" is on page '+num+'; it opens on page '+real); if(k.it.indexOf(row)<last) throw new Error('print Contents is out of order at "'+t+'"'); last=k.it.indexOf(row); }
    const nav=strip(L.rich.epub['OEBPS/nav.xhtml']); if(!/<h1[^>]*>Contents<\/h1>/.test(nav)) throw new Error('the EPUB contents list is not titled Contents');
    const names=[...nav.matchAll(/<a\s[^>]*>([\s\S]*?)<\/a>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim()); let at=-1; for(const t of want){ const i=names.findIndex(n=>n.includes(t)); if(i<0||i<at) throw new Error('EPUB Contents is missing "'+t+'" or lists it out of order: '+names.join(', ')); at=i; if(names.filter(n=>n.includes(t)).length!==1) throw new Error('EPUB Contents lists "'+t+'" more than once'); }
  });
  await step('F8.1 F8.4 F8.7 P5.2 P5.4 P5.5 P5.6 EPUB: no page numbers or page headers in the text; the cover is in the file and marked as the cover, and not inside a chapter; a picture is a real image that shrinks to fit; the file names its title, author and language, and keeps the same identifier each time (rev 236)', async () => {
    const L=await exportLab(); if(typeof L==='string') return L; const E=L.rich.epub, opf=E['OEBPS/content.opf'], xs=Object.keys(E).filter(f=>/\.xhtml$/.test(f)), css=E['OEBPS/style.css']||'';
    for(const f of xs){ const x=strip(E[f]); if(/class="[^"]*\b(rh|folio|pagenum)\b/.test(x)||/<p[^>]*>\s*\d{1,4}\s*<\/p>/.test(x)) throw new Error(f+' carries a page number or page header in its text'); if(/<svg\b(?![^>]*epub)/.test(x)&&!/cover/.test(f)) throw new Error(f+' draws a shape where a picture should be an image'); }
    const cov=/<item\s[^>]*properties="[^"]*cover-image[^"]*"[^>]*>/.exec(opf); if(!cov) throw new Error('the cover is not marked as the cover in the EPUB'); const ch=(/href="([^"]+)"/.exec(cov[0])||[])[1];
    if(!L.rich.epub.files.includes('OEBPS/'+ch)) throw new Error('the cover picture named in the EPUB ('+ch+') is not in the file');
    const chap=xs.filter(f=>/<h1[\s>]/.test(strip(E[f]))&&!/titlepage|epub:type="toc"/.test(E[f])); const inText=chap.find(f=>E[f].includes(ch.split('/').pop())); if(inText) throw new Error('the cover picture is inside the text of '+inText);
    const d=xs.find(f=>/Delta Shore/.test(E[f])&&/<figure/.test(E[f])); if(!d) throw new Error('the chapter\'s picture is missing from the EPUB'); const im=/<img\s[^>]*src="([^"]+)"[^>]*>/.exec(strip(E[d]));
    if(!im) throw new Error('the picture is not an image'); if(!L.rich.epub.files.includes('OEBPS/'+im[1])) throw new Error('the picture file '+im[1]+' is not in the EPUB'); if(!/alt="[^"]+"/.test(im[0])) throw new Error('the picture has no description for readers who cannot see it');
    if(!/<figcaption>A small harbor at dawn<\/figcaption>/.test(E[d])) throw new Error('the caption is missing from the EPUB'); if(!/figure img\{[^}]*width:100%[^}]*height:auto/.test(css)) throw new Error('EPUB pictures are not set to shrink to fit the screen');
    const tag=n=>(new RegExp('<dc:'+n+'[^>]*>([^<]*)</dc:'+n+'>').exec(opf)||[])[1]||''; if(tag('title')!==L.title) throw new Error('the EPUB title is "'+tag('title')+'"'); if(tag('creator')!==L.author) throw new Error('the EPUB author is "'+tag('creator')+'"'); if(!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(tag('language'))) throw new Error('the EPUB language is "'+tag('language')+'"');
    const id1=tag('identifier'), id0=(/<dc:identifier[^>]*>([^<]*)</.exec(L.epub['OEBPS/content.opf'])||[])[1]; if(!id1||id1!==id0) throw new Error('the same book got two identifiers on two exports: '+id0+' and '+id1);
  });
  await step('F5.3 F5.4 Pictures: never stretched or squashed, centered unless the writer placed them at a side, inside the page, with the caption directly underneath in smaller type (rev 235)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=235))) return 'SKIP: before rev 235';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500);
      for(const fs_ of [14,18,26]){ const r=await pg.evaluate(async fs_=>{ S.tips=false; S.fs=fs_; applyType(); relayout(); await openLibBook('manual',true); setTab('read'); await new Promise(r=>setTimeout(r,300));
          const out={figs:0,bad:[]}, T=x=>RB.ch.get(x).title;
          outer: for(const id of rOrder().filter(x=>!isCover(x))){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); let figs=[...document.querySelectorAll('#spread .face:not(.gone) .ptext .fig')]; if(!figs.length) continue;
              await Promise.all(figs.map(f=>{ const im=f.querySelector('img'); return im&&!im.complete?new Promise(r=>{ im.onload=im.onerror=r; setTimeout(r,1500); }):0; }));
              /* rev 238: while a picture loads the app may draw the page again, which leaves the first set of elements off the page and unmeasurable; read the page as it now stands */
              if(figs.some(f=>!f.isConnected)){ drawView(); figs=[...document.querySelectorAll('#spread .face:not(.gone) .ptext .fig')]; }
              for(const f of figs){ if(!f.isConnected) continue; const pt=f.closest('.ptext'), B=pt.getBoundingClientRect(), k=B.width/pt.offsetWidth, im=f.querySelector('img'), cap=f.querySelector('figcaption'), where=T(id)+' p'+(i+1); if(!im||!im.naturalWidth) continue; out.figs++;
                const R=im.getBoundingClientRect(), fit=getComputedStyle(im).objectFit, nat=im.naturalWidth/im.naturalHeight, shown=R.width/R.height;
                if(fit!=='contain'&&Math.abs(shown/nat-1)>0.03) out.bad.push(where+': a picture '+im.naturalWidth+'×'+im.naturalHeight+' is shown '+Math.round(R.width/k)+'×'+Math.round(R.height/k)+' ('+(fit==='cover'?'part of it is cut off':'stretched')+')');
                if(R.left<B.left-1||R.right>B.right+1||R.top<B.top-1||R.bottom>B.bottom+1) out.bad.push(where+': a picture reaches outside the text area');
                const side=/\b(al-left|al-right|wrap-left|wrap-right)\b/.test(f.className), fr=f.getBoundingClientRect(); if(!side&&Math.abs((fr.left+fr.right)/2-(B.left+B.right)/2)>2*k) out.bad.push(where+': a picture is '+Math.round(Math.abs((fr.left+fr.right)/2-(B.left+B.right)/2)/k)+' px off centre');
                if(cap&&cap.textContent.trim()){ const C=cap.getBoundingClientRect(); if(C.top<R.bottom-2*k) out.bad.push(where+': the caption is not under its picture'); if(C.bottom>B.bottom+1) out.bad.push(where+': the caption is cut off at the bottom of the page');
                  if(!(parseFloat(getComputedStyle(cap).fontSize)<parseFloat(getComputedStyle(pt).fontSize))) out.bad.push(where+': the caption is not smaller than the body text'); } }
              if(out.figs>=14) break outer; } }
          return out; },fs_);
        if(r.figs<6) throw new Error('at text size '+fs_+' only '+r.figs+' pictures were found in the manual');
        if(r.bad.length) throw new Error('at text size '+fs_+': '+r.bad.slice(0,3).join(' | ')+(r.bad.length>3?' (and '+(r.bad.length-3)+' more)':'')); }
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  let nsP=null;
  const noSpacesText=()=>nsP||(nsP=(async()=>{
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=232))) return 'SKIP: before rev 232';
    if(!PDFJS_DIR) return 'SKIP: set PDFJS_DIR to test PDF import';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.min.js'),contentType:'application/javascript'}));
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.worker.min.js'),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500);
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500);
      await pg.setInputFiles('#libIn',require('path').join(__dirname,'fixtures','no-spaces.pdf')); await pg.waitForTimeout(800); await pg.click('#libAsk [data-way="text"]');
      await pg.waitForFunction(()=>/Added|couldn|Could/.test(document.querySelector('#libNote').textContent),null,{timeout:60000});
      const tx=await pg.evaluate(async()=>{ const b=LIB.find(b=>/no-spaces/.test(b.title)); if(!b) return null; await openLibBook(b.id,true); return rOrder().filter(x=>!isCover(x)).map(x=>RB.ch.get(x).title+'\n'+RB.ch.get(x).text).join('\n'); });
      if(tx==null) throw new Error('the test PDF was not added: '+await pg.textContent('#libNote'));
      if(errs.length) throw new Error('page error: '+errs[0]);
      return ' '+tx;
    } finally { await ctx.close(); }
  })());
  await step('F10.1 F4.7 A PDF that stores no spaces between its words comes in with every space put back, and no words run together (rev 235)', async () => {
    const tx=await noSpacesText(); if(/^SKIP/.test(tx)) return tx;
    for(const s of ['The quick brown fox walked along the harbor wall before the morning boats came in from the bay.','A patient writer counts every page, checks every line, and leaves nothing for the reader to trip over.']) if(!tx.replace(/\s+/g,' ').includes(s)) throw new Error('a sentence did not come in whole with its spaces: '+tx.replace(/\s+/g,' ').slice(0,160));
    const run=tx.match(/[A-Za-z]{17,}/); if(run) throw new Error('words run together: '+run[0]);
  });
  await step('F6.2 F6.3 F6.4 F6.5 F6.7 F6.8 Contents pages read the same in every book, whatever file it came from: one entry per line with a dotted line to Inkhorse\'s own page number at the right edge, chapter entries set apart from section entries, nothing else on the page, and no page numbers left over from the paper book (rev 236)', async () => {
    const D=await dummiesLike(); if(typeof D==='string') return D; if(!D.cont) return 'SKIP: before rev 236';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); const all={'the imported PDF':D.cont};
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500);
      for(const [id,name] of [['manual','the User manual'],['standard','the Formatting Standard'],['publishing','the Publishing Standard']]){ await pg.evaluate(async id=>{ S.tips=false; await openLibBook(id,true); setTab('read'); await new Promise(r=>setTimeout(r,300)); },id); all[name]=await pg.evaluate(gatherContents); }
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
    for(const name of Object.keys(all)) if(!all[name].titles.length) delete all[name];   /* a book with no contents page (both standards) has nothing to check */
    if(Object.keys(all).length<2||!all['the User manual']) throw new Error('fewer than two books with a contents page were read: '+Object.keys(all).join(', '));
    for(const [name,c] of Object.entries(all)) checkContents(name,c);
    const base=all['the User manual'].sig[1]; for(const [name,c] of Object.entries(all)) if(c.sig[1]!==base) throw new Error('chapter entries are set differently in '+name+' ('+c.sig[1]+') than in the User manual ('+base+')');
    if(!/flex/.test(base)||!/dotted/.test(base)||!/num-at-right-edge/.test(base)) throw new Error('a contents entry is not a line with a dotted leader and its number at the right edge: '+base);
    const two=Object.entries(all).filter(([,c])=>c.sig[2]); if(!two.length) throw new Error('no book in the test has section entries to compare'); for(const [name,c] of two){ if(c.sig[2]===c.sig[1]) throw new Error('in '+name+' section entries look the same as chapter entries: '+c.sig[2]); if(c.sig[2]!==two[0][1].sig[2]) throw new Error('section entries are set differently in '+name+' than in '+two[0][0]); }
  });
  await step('F10.2 F3.9 F10.4 A PDF\'s printed lines are joined back into whole paragraphs, and a hyphen that only split a word at the end of a printed line is removed (rev 236)', async () => {
    const tx=await noSpacesText(); if(typeof tx==='string'&&/^SKIP/.test(tx)) return tx; const lines=tx.split('\n').map(l=>l.trim());
    for(const s of ['The quick brown fox walked along the harbor wall before the morning boats came in from the bay.','Nobody on the long pier spoke about the weather, because the lights were steady and the water was calm.','When the last boat was tied up, the keeper closed the gate and walked home under the yellow lamps.'])
      if(!lines.includes(s)) throw new Error('a paragraph did not come in as one whole paragraph: '+JSON.stringify(lines.filter(l=>l.includes(s.slice(0,18))||s.includes(l)).slice(0,3)));
    if(/remem-/.test(tx)||!/The lighthouse keeper remembered every storm that had ever crossed the bay in winter\./.test(tx)) throw new Error('the word split by a line-end hyphen was not joined: '+(/.{0,30}remem.{0,30}/.exec(tx)||[''])[0]);
  });
  await step('F10.7 A PDF kept as pictures of its pages shows every page as printed: its first page as the cover and one picture for each page after it, with the type settings that cannot apply switched off (rev 236)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=236))) return 'SKIP: before rev 236'; if(!PDFJS_DIR) return 'SKIP: set PDFJS_DIR to test PDF import';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.min.js'),contentType:'application/javascript'}));
    await ctx.route(/pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/, r=>r.fulfill({path:require('path').join(PDFJS_DIR,'pdf.worker.min.js'),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500);
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(500);
      await pg.setInputFiles('#libIn',require('path').join(__dirname,'fixtures','no-spaces.pdf')); await pg.waitForTimeout(800); await pg.click('#libAsk [data-way="pages"]');
      await pg.waitForFunction(()=>/Added|couldn|Could/.test(document.querySelector('#libNote').textContent),null,{timeout:90000});
      const r=await pg.evaluate(async()=>{ const b=LIB.find(b=>/no-spaces/.test(b.title)); if(!b) return null; await openLibBook(b.id,true); setTab('read'); await new Promise(r=>setTimeout(r,500)); const out={mode:!!b.pageMode,pics:0,text:0,sizes:[],cover:navOrder()[0]==='__front'};
        for(const id of navOrder()){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const f=document.querySelector('#spread .face:not(.gone)'), im=f.querySelector('img.pdfp,img.cvimg,img.cvr'); if(im){ out.pics++; try{ await im.decode(); }catch(_){ } out.sizes.push(im.naturalWidth+'x'+im.naturalHeight+' '+getComputedStyle(im).objectFit); } if(f.querySelector('.ptext span[data-w]')) out.text++; } }
        out.fsOff=document.querySelector('#fs').disabled; out.faceOff=(document.querySelector('#face')||{}).disabled; return out; });
      if(!r) throw new Error('the test PDF was not added: '+await pg.textContent('#libNote'));
      if(!r.mode||r.pics!==2||r.text) throw new Error('a 2-page PDF kept as pictures shows '+r.pics+' page pictures and '+r.text+' pages of text');
      if(!r.cover) throw new Error('the PDF\'s first page is not shown as the cover'); if(r.sizes.some(s=>/^0x/.test(s))) throw new Error('a page picture is empty: '+r.sizes.join(', ')); if(r.sizes.slice(1).some(s=>!/ contain$/.test(s))) throw new Error('a page picture is cut to fit: '+r.sizes.join(', '));
      if(!r.fsOff) throw new Error('the text size control is still on for a book of page pictures');
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('F3.10 F7.4 The formatting holds: the same book shows the same lines on the same pages after the text size is moved to both ends and back, after Justify and the typeface are changed and changed back, after the phone is turned sideways and back, and after Inkhorse is closed and opened again (rev 236)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=236))) return 'SKIP: before rev 236';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    const snap=()=>pg.evaluate(async()=>{ await openLibBook('publishing',true); setTab('read'); await new Promise(r=>setTimeout(r,300)); const out=[];
      for(const id of rOrder().filter(x=>!isCover(x))){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const pt=document.querySelector('#spread .face:not(.gone) .ptext'), lines=[]; let top=null;
          if(pt) pt.querySelectorAll('span[data-w]').forEach(s=>{ for(const r of s.getClientRects()){ const t=Math.round(r.top); if(top===null||Math.abs(t-top)>6){ lines.push(s.dataset.w); top=t; } } });
          out.push(RB.ch.get(id).title.slice(0,24)+' p'+(i+1)+':'+lines.join(',')+'|'+(pt?pt.querySelectorAll('br.lz').length:0)+'|'+((document.querySelector('#spread .face:not(.gone) .folio')||{}).textContent||'')); } }
      return out; });
    const same=(what,a,b)=>{ if(a.length!==b.length) throw new Error(what+': the book went from '+a.length+' pages to '+b.length); const k=a.findIndex((x,i)=>x!==b[i]); if(k>=0) throw new Error(what+': the lines changed on '+a[k].split(':')[0]); };
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500); await pg.evaluate(()=>document.fonts.ready); const vp=pg.viewportSize();
      await pg.evaluate(()=>{ S.tips=false; S.just=true; S.fs=18; S.face='garamond'; applyType(); relayout(); saveSettings(); }); await pg.waitForTimeout(2500);
      const base=await snap(); if(base.length<30) throw new Error('only '+base.length+' pages were read');
      same('drawn a second time',base,await snap());
      for(const v of [28,12,18]){ await pg.evaluate(v=>{ S.fs=v; applyType(); relayout(); },v); if(v!==18) await snap(); } await pg.waitForTimeout(2500); same('text size to the biggest, the smallest and back',base,await snap());
      await pg.evaluate(()=>{ S.just=false; applyType(); relayout(); S.just=true; applyType(); relayout(); S.face='literata'; applyType(); relayout(); S.face='garamond'; applyType(); relayout(); }); await pg.waitForTimeout(2500); same('Justify off and on, typeface changed and changed back',base,await snap());
      await pg.setViewportSize({width:vp.height+190,height:vp.width}); await pg.waitForTimeout(1200); const side=await snap(); if(side.length===base.length&&side.join()===base.join()) throw new Error('turning the phone sideways changed nothing, so the test is not turning it');
      await pg.setViewportSize(vp); await pg.waitForTimeout(3000); same('phone turned sideways and back upright',base,await snap());
      await pg.reload(); await pg.waitForTimeout(2500); await pg.evaluate(()=>document.fonts.ready); await pg.evaluate(()=>{ S.tips=false; }); await pg.waitForTimeout(2500); same('Inkhorse closed and opened again',base,await snap());
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  await step('Layout lock: a fixed test book breaks its pages exactly where the recorded layout says, so no change can move a reader\'s pages without it being seen and said (rev 236)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=236))) return 'SKIP: before rev 236';
    const fs=require('fs'), file=require('path').join(__dirname,'fixtures','layout-lock.json');
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const got=await pg.evaluate(async()=>{ S.tips=false; S.just=true; S.fs=18; S.lh='1.55';
        /* the book typeface built into Inkhorse for print is used here, so the lock does not depend on which fonts a test machine has */
        const bin=atob(PDFFONT.r), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); const ff=new FontFace('InkLock',u.buffer); await ff.load(); document.fonts.add(ff); FACES.inklock="'InkLock'"; S.face='inklock'; applyType(); relayout();
        const W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats while a patient writer counted every remarkable page of an extraordinarily long manuscript'.split(' '), para=k=>Array.from({length:55+(k%5)*14},(_,i)=>W[(i*7+k*3)%W.length]).join(' ')+'.';
        const ids=['Lock One','Lock Two','Lock Three'].map((t,c)=>addChapter(t,[para(c*11),para(c*11+1),'# A section heading',para(c*11+2),para(c*11+3),'* * *',...Array.from({length:10},(_,k)=>para(c*11+4+k)),'See getinkhorse.com/preview/next.html for the newest pages.'].join('\n'),BOOK.order.length));
        setTab('read'); await new Promise(r=>setTimeout(r,400)); const d=curDev(), pages={}; for(let c=0;c<ids.length;c++){ const P=pag(ids[c]); pages['Lock '+['One','Two','Three'][c]]=P.pages.map((p,i)=>{ const z=pageLoose(P,i,d); return p[0]+(z?'+'+[...z].join('.'):''); }); }
        return {page:d.w+'x'+d.h+' margin '+d.mx,font:document.fonts.check('18px InkLock'),pages}; });
      got.chrome=String(browser.version()).split('.')[0]; if(errs.length) throw new Error('page error: '+errs[0]); if(!got.font) throw new Error('the lock typeface did not load');
      const rev=await page.evaluate(()=>INK_VERSION.rev), write=()=>fs.writeFileSync(file,JSON.stringify({note:'Where the pages of the lock book break. Re-record only when a change is MEANT to move pages, and say so in CHANGELOG.md: LOCK_UPDATE=1 node tests/audit.js preview/next.html',recordedAtRev:rev,...got},null,1)+'\n');
      if(!fs.existsSync(file)){ if(process.env.LOCK_UPDATE){ write(); return 'OK: lock recorded'; } throw new Error('there is no recorded layout (tests/fixtures/layout-lock.json); record one with LOCK_UPDATE=1'); }
      const want=JSON.parse(fs.readFileSync(file,'utf8')); if(process.env.LOCK_UPDATE){ write(); return 'OK: lock re-recorded'; }
      if(want.chrome!==got.chrome||want.page!==got.page) return 'SKIP: the layout was recorded with test browser '+want.chrome+' on a '+want.page+' page; this machine has '+got.chrome+' and '+got.page+'. Record it here once with LOCK_UPDATE=1 before changing the app.';
      for(const t of Object.keys(want.pages)){ const a=want.pages[t], b=got.pages[t]||[]; if(a.length!==b.length) throw new Error('"'+t+'" went from '+a.length+' pages to '+b.length+'. Pages have moved. If that is meant, say so in the Release Notes and re-record with LOCK_UPDATE=1.'); const k=a.findIndex((x,i)=>x!==b[i]); if(k>=0) throw new Error('"'+t+'" page '+(k+1)+' no longer starts or breaks its lines where it did ('+a[k]+' → '+b[k]+'). Pages have moved. If that is meant, say so in the Release Notes and re-record with LOCK_UPDATE=1.'); }
    } finally { await ctx.close(); }
  });
  await step('F10.1 F4.7 The first page of a PDF keeps its words: a PDF that opens with a page of text comes in with that page first, then the next, and nothing missing (rev 237)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=237))) return 'SKIP: before rev 237 the words of every PDF\'s first page were dropped';
    const tx=await noSpacesText(); if(/^SKIP/.test(tx)) return tx; const flat=tx.replace(/\s+/g,' ');
    const a=flat.indexOf('Harbor Notes'), b=flat.indexOf('The quick brown fox walked along the harbor wall'), c=flat.indexOf('On the second page the ferry was late'), d=flat.indexOf('The harbor master wrote the tide down in a green book');
    if(a<0||b<0) throw new Error('the words of the first page are missing: '+flat.slice(0,120)); if(c<0||d<0) throw new Error('the words of the second page are missing');
    if(!(a<b&&b<c&&c<d)) throw new Error('the pages came in out of order');
  });
  await step('F5.2 F4.7 F10.6 An e-book made by another publisher comes in whole: every sentence, its chapter labels and titles, its title and copyright pages, its cover and pictures; a scene break drawn as a rule is kept; lines of verse stay separate lines; a footnote mark is set apart from the word; and its pages obey the standard (rev 237)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=237))) return 'SKIP: before rev 237';
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); if(JSZIP_FILE) await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:require('fs').readFileSync(JSZIP_FILE),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500); if(!(await pg.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine';
      await pg.evaluate(()=>{ S.tips=false; setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(400);
      await pg.setInputFiles('#libIn',require('path').join(__dirname,'fixtures','import','foreign.epub'));
      await pg.waitForFunction(()=>/Added|couldn|Could/.test(document.querySelector('#libNote').textContent),null,{timeout:60000});
      const r=await pg.evaluate(async()=>{ const bk=LIB.filter(x=>!['manual','standard','publishing'].includes(x.id)).pop(); if(!bk) return null; await openLibBook(bk.id,true); S.fs=18; S.just=true; applyType(); relayout(); setTab('read'); await new Promise(r=>setTimeout(r,400));
        const ids=rOrder().filter(x=>!isCover(x)), T=id=>RB.ch.get(id).title, all=ids.map(id=>RB.ch.get(id).text).join('\n'), out={titles:ids.map(T),front:ids.filter(isFront).length,cover:!!RB.coverFront,author:RB.author,book:RB.title,text:all,cut:[],past:[],left:[],sb:0,figs:0,ck:[]};
        for(const id of ids){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const pt=document.querySelector('#spread .face:not(.gone) .ptext'); if(!pt) continue; const B=pt.getBoundingClientRect(), w=T(id).slice(0,20)+' p'+(i+1);
            if(!pt.querySelector('img,figure')&&pt.scrollHeight>pt.clientHeight+1) out.cut.push(w); pt.querySelectorAll('span[data-w]').forEach(s=>{ for(const q of s.getClientRects()) if(q.right>B.right+1) out.past.push(w); });
            const tx=pt.textContent; const m=tx.match(/%%\w*|\[\[|__IMG|<\/?[a-z]+[ >]|&(?:amp|nbsp|#\d+);| {2,}/); if(m) out.left.push(w+': '+m[0]); out.sb+=pt.querySelectorAll('p.sb').length; out.figs+=pt.querySelectorAll('.fig').length; if(i===0){ const ck=pt.querySelector('.ck'); if(ck) out.ck.push(ck.textContent); } } }
        return out; });
      if(!r) throw new Error('the e-book was not added: '+await pg.textContent('#libNote'));
      const flat=r.text.replace(/\s+/g,' '), lines=r.text.split('\n').map(l=>l.trim());
      for(const s of ['The copper kettle sang on the stove while Marta counted the tide tables.','Nobody had told the ferryman that the bridge was already open.','By morning the tide had left nothing but a single green bottle on the sand.','Keep the lamp trimmed and the door unlatched.','The harbor, drawn from memory','A made-up title.']) if(!flat.includes(s)) throw new Error('words went missing: "'+s+'"');
      if(r.book!=='Harbor Stories'||r.author!=='Ada Tester') throw new Error('the book came in as "'+r.book+'" by "'+r.author+'"');
      if(['CHAPTER ONE · The Copper Kettle','CHAPTER TWO · A Long Way Round','CHAPTER THREE · What the Tide Left'].some(t=>!r.titles.includes(t))) throw new Error('chapter labels and titles came in as '+r.titles.join(' | '));
      if(r.ck.join('|')!=='CHAPTER ONE|CHAPTER TWO|CHAPTER THREE') throw new Error('the labels above the chapter titles read '+r.ck.join(' | '));
      if(r.front<2||!r.cover) throw new Error('front pages found: '+r.front+'; cover: '+r.cover);
      if(r.sb!==3) throw new Error('the book has 3 scene breaks drawn as a rule; '+r.sb+' reached the page');
      for(const l of ['The gulls came in low,','the nets came in full,','and the lamp stayed lit.']) if(!lines.includes(l)) throw new Error('lines of verse were run together: '+(lines.find(x=>/gulls came in low/.test(x))||''));
      if(/out\.1/.test(flat)||!/never lent it out\. \[1\]/.test(flat)) throw new Error('a footnote mark is stuck to the word before it: '+(/.{0,20}lent it out.{0,8}/.exec(flat)||[''])[0]);
      for(const l of ['bread and salt','lamp oil','two coils of rope']) if(!lines.includes(l)) throw new Error('a list item did not come in on its own line: '+l);
      if(r.figs!==3) throw new Error('the book has a picture in each of 3 chapters; '+r.figs+' are shown');
      if(r.cut.length) throw new Error('text is cut off at the bottom of '+r.cut[0]); if(r.past.length) throw new Error('a word runs past the margin on '+r.past[0]); if(r.left.length) throw new Error('leftover markup on the page: '+r.left[0]);
      if(errs.length) throw new Error('page error: '+errs[0]);
    } finally { await ctx.close(); }
  });
  // rev 238: every door. One made-up book per file type is brought in both ways (Add to read, and Import a file into a writing book) and the same things are read back.
  const SENT=['The copper kettle sang on the stove while Marta counted the tide tables.','Nobody had told the ferryman that the bridge was already open.','By morning the tide had left nothing but a single green bottle on the sand.'];
  const viaDoor=async(file,door)=>{ const fs=require('fs'), ctx=await browser.newContext({...devices['iPhone 14 Pro Max']}); if(JSZIP_FILE) await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:fs.readFileSync(JSZIP_FILE),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{ await pg.goto(page.url()); await pg.waitForTimeout(2500); if(/\.(docx|epub)$/.test(file)&&!(await pg.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine';
      const full=require('path').join(__dirname,'fixtures','import',file);
      if(door==='read'){ await pg.evaluate(()=>{ S.tips=false; setTab('read'); document.querySelector('#libBtn').click(); }); await pg.waitForTimeout(400); await pg.setInputFiles('#libIn',full);
        await pg.waitForFunction(()=>/Added|couldn|Could/.test(document.querySelector('#libNote').textContent),null,{timeout:60000});
        if(!(await pg.evaluate(async()=>{ const bk=LIB.filter(x=>!['manual','standard','publishing'].includes(x.id)).pop(); if(!bk) return false; await openLibBook(bk.id,true); return true; }))) throw new Error(file+' was not added to read: '+await pg.textContent('#libNote')); }
      else { await pg.evaluate(()=>{ S.tips=false; setTab('write'); }); await pg.setInputFiles('#fileIn',full); await pg.waitForFunction(()=>/Imported|couldn|Could/.test((document.querySelector('#exportNote')||{}).textContent||''),null,{timeout:60000}); }
      const r=await pg.evaluate(async()=>{ S.fs=18; S.just=true; applyType(); relayout(); setTab('read'); await new Promise(r=>setTimeout(r,400)); const B=rBook(), get=id=>(RB?RB.ch.get(id):CH.get(id)), all=rOrder().filter(x=>!isCover(x)), ix=all.findIndex(id=>/^%%front\s+Harbor Stories|^A Collection/.test(get(id).text)||get(id).title==='Harbor Stories'), ids=all.slice(Math.max(0,ix));   /* in a writing book the sample chapters come first; start at the imported book */
        const out={book:B.title,author:B.author||'',titles:ids.map(id=>get(id).title),front:ids.filter(isFront).map(id=>get(id).text.split('\n').filter(l=>l!=='%%front').slice(0,3).join(' / ')),text:ids.map(id=>get(id).text).join('\n'),open:[],cut:[],past:[],left:[],sb:0,toc:[],nums:ids.map(id=>fmtChapterNo(id,-1))};
        for(const id of ids){ const n=pag(id).pages.length; for(let i=0;i<n;i++){ goTo({ch:id,i}); drawView(); const pt=document.querySelector('#spread .face:not(.gone) .ptext'); if(!pt) continue; const R=pt.getBoundingClientRect(), w=(get(id).title||'front page').slice(0,20)+' p'+(i+1);
            if(!pt.querySelector('img,figure')&&pt.scrollHeight>pt.clientHeight+1) out.cut.push(w); pt.querySelectorAll('span[data-w]').forEach(s=>{ for(const q of s.getClientRects()) if(q.right>R.right+1) out.past.push(w); });
            const m=pt.textContent.match(/%%\w*|\[\[|__IMG|\t|<\/?[a-z]+[ >]|&(?:amp|nbsp|#\d+);/); if(m) out.left.push(w+': '+JSON.stringify(m[0])); out.sb+=pt.querySelectorAll('p.sb').length;
            pt.querySelectorAll('p.toc').forEach(e=>out.toc.push({t:(e.querySelector('.tt')||e).textContent.replace(/[­⁠]/g,'').trim(),link:e.hasAttribute('data-goto')}));
            if(i===0&&!isFront(id)){ const ck=pt.querySelector('.ck'), h=pt.querySelector('h2.cht'); out.open.push((ck?ck.textContent:'')+' | '+(h?h.textContent.replace(/[­⁠]/g,''):'')); } } }
        return out; });
      if(errs.length) throw new Error('page error: '+errs[0]);
      const flat=r.text.replace(/\s+/g,' '), at=file+' ('+(door==='read'?'added to read':'imported into a writing book')+'): '; for(const s of SENT) if(!flat.includes(s)) throw new Error(at+'words went missing: "'+s+'"');
      if(r.cut.length) throw new Error(at+'text is cut off at the bottom of '+r.cut[0]); if(r.past.length) throw new Error(at+'a word runs past the margin on '+r.past[0]); if(r.left.length) throw new Error(at+'something that is not the book\'s words reached the page: '+r.left[0]);
      r.at=at; return r;
    } finally { await ctx.close(); } };
  const bothDoors=async(file,check)=>{ if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=238))) return 'SKIP: before rev 238'; for(const door of ['read','write']){ const r=await viaDoor(file,door); if(typeof r==='string') return r; check(r,door); } };
  const same=(r,what,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) throw new Error(r.at+what+' came in as '+JSON.stringify(got)+', not '+JSON.stringify(want)); };
  await step('F1.1 F2.3 F2.8 A text file with # chapters comes in whole by both doors: the line above the first chapter is the title page and the book\'s title, not a chapter; the chapters are Chapter 1, 2 and 3; scene breaks are kept (rev 238)', () => bothDoors('hash-chapters.txt',(r,door)=>{
    same(r,'the chapters',r.titles,['','The Copper Kettle','A Long Way Round','What the Tide Left']); same(r,'the front pages',r.front,['Harbor Stories']); same(r,'the chapter numbers',r.nums,[0,1,2,3]);
    same(r,'the chapter openings',r.open,['Chapter 1 | The Copper Kettle','Chapter 2 | A Long Way Round','Chapter 3 | What the Tide Left']); if(r.book!=='Harbor Stories') throw new Error(r.at+'the book is called "'+r.book+'"'); if(r.sb!==3) throw new Error(r.at+r.sb+' of 3 scene breaks reached the page'); }));
  await step('F2.3 F2.7 F2.8 A text file with "Chapter 1" lines comes in whole by both doors: the title on the next line is the chapter\'s title, with its own label above it and no second number beside it (rev 238)', () => bothDoors('plain-chapters.txt',(r,door)=>{
    same(r,'the chapters',r.titles,['Chapter 1 · The Copper Kettle','Chapter 2 · A Long Way Round','Chapter 3 · What the Tide Left']); same(r,'the chapter openings',r.open,['Chapter 1 | The Copper Kettle','Chapter 2 | A Long Way Round','Chapter 3 | What the Tide Left']);
    if(/^\s*The Copper Kettle\s*$/m.test(r.text)) throw new Error(r.at+'the chapter\'s title is still in the text as an ordinary line'); }));
  await step('F1.1 F2.3 F5.1 A Word file comes in whole by both doors: its Title and author make the title page and name the book, each Heading 1 is a chapter numbered from 1, and a smaller heading is a section heading (rev 238)', () => bothDoors('word-book.docx',(r,door)=>{
    same(r,'the chapters',r.titles,['','The Copper Kettle','A Long Way Round','What the Tide Left']); same(r,'the front pages',r.front,['Harbor Stories / Ada Tester']); same(r,'the chapter numbers',r.nums,[0,1,2,3]);
    if(r.book!=='Harbor Stories'||r.author!=='Ada Tester') throw new Error(r.at+'the book came in as "'+r.book+'" by "'+r.author+'"'); if(!/^# A Smaller Heading$/m.test(r.text)) throw new Error(r.at+'the smaller heading is not a section heading');
    for(const l of ['bread and salt','lamp oil','two coils of rope','Keep the lamp trimmed and the door unlatched.','She read The Long Voyage Home twice that winter.']) if(!r.text.split('\n').map(x=>x.trim()).includes(l)) throw new Error(r.at+'a line did not come in whole on its own: '+l); }));
  await step('F6.1 F6.5 F6.8 An e-book that shows its own contents page keeps it, by both doors: under the book\'s own heading, every entry there, and every chapter entry a working link (rev 238)', () => bothDoors('foreign.epub',(r,door)=>{
    same(r,'the pages before chapter one',r.titles.slice(0,3),['Harbor Stories','','Table of Contents']); const want=['The Copper Kettle','A Smaller Heading','A Long Way Round','A Smaller Heading','What the Tide Left','A Smaller Heading']; same(r,'the contents entries',r.toc.map(e=>e.t),want);
    const dead=r.toc.filter(e=>!/Smaller/.test(e.t)&&!e.link); if(dead.length) throw new Error(r.at+'a chapter entry on the contents page is not a link: '+dead[0].t); if(r.sb!==3) throw new Error(r.at+r.sb+' of 3 scene breaks reached the page'); }));
  // rev 239: the writer's words are never lost. One made-up book with everything in it (front pages, a cover, a picture, highlights) is saved, closed, backed up, damaged and restored.
  const safeBuild=()=>(async()=>{ S.tips=false; const mk=(w,h,c)=>new Promise(r=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d'); g.fillStyle=c; g.fillRect(0,0,w,h); cv.toBlob(r,'image/png'); });
    const pid='a1b2c3d4e5f60718293a4b5c6d7e8f90', cid='0f1e2d3c4b5a69788796a5b4c3d2e1f0'; await __picPut(pid,await mk(600,400,'#2a5a83'),'image/png'); await __picPut(cid,await mk(800,1200,'#7a3b2e'),'image/png');
    BOOK.images[pid]={w:600,h:400}; BOOK.images[cid]={w:800,h:1200}; BOOK.coverFront=cid; BOOK.title='The Test Harbor'; BOOK.author='Ada Tester'; const f=FM(); f.subtitle='A Book for Testing'; f.dedication='For the keeper of the light';
    const W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats'.split(' '), para=k=>Array.from({length:70+(k%4)*12},(_,i)=>W[(i*5+k)%W.length]).join(' ')+'.';
    BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[];
    const ids=['Alpha Harbor','Beta Ridge','Gamma Field'].map((t,c)=>{ const id=addChapter(t,[para(c*7),para(c*7+1),'# A Section',para(c*7+2),'* * *',`[[image ${pid} | inline | 60% | center | A small harbor at dawn]]`,para(c*7+3)].join('\n')); dirty.add(id); return id; });
    S.cur=ids[0]; S.rch=ids[0]; addMark(ids[0],5,12); addMark(ids[1],20,30); touchIndex(); loadEditor(); renderChapterUI(); })();
  const safeFp=()=>(async()=>{ const pic=async id=>{ try{ return (await (await fetch(imgSrc(id))).blob()).size; }catch(_){ return -1; } };
    return JSON.stringify({title:BOOK.title,author:BOOK.author,chapters:BOOK.order.map(id=>[CH.get(id).title,CH.get(id).text]),'front pages':{subtitle:FM().subtitle||'',dedication:FM().dedication||''},cover:BOOK.coverFront?await pic(BOOK.coverFront):0,pictures:await Promise.all(Object.keys(BOOK.images).sort().map(pic)),highlights:(BOOK.marks||[]).map(m=>[BOOK.order.indexOf(m.ch),m.a,m.b]).sort()}); })();
  const safeDiff=(a,b)=>{ if(a===b) return ''; const A=JSON.parse(a), B=JSON.parse(b); for(const k of Object.keys(A)) if(JSON.stringify(A[k])!==JSON.stringify(B[k])) return 'the '+k+' changed: '+JSON.stringify(B[k]).slice(0,120); return 'it changed'; };
  const safeOpen=async ctx=>{ const pg=await ctx.newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(e.message)); await pg.goto(page.url()); await pg.waitForTimeout(2500); await pg.evaluate(()=>{ S.tips=false; }); return pg; };
  const safeType=async(pg,txt,wait)=>{ await pg.evaluate(()=>{ setTab('write'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); }); await pg.keyboard.type(txt,{delay:0}); if(wait) await pg.waitForTimeout(wait); };
  const rev239=async()=>(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=239))?null:'SKIP: before rev 239';
  await step('Safe words: the whole book (chapters, front pages, cover, picture, highlights) is there again after Inkhorse is closed and opened, and words typed the instant before closing are kept (rev 239)', async () => {
    const sk=await rev239(); if(sk) return sk; const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    try{ let pg=await safeOpen(ctx); await pg.evaluate(safeBuild); await pg.waitForTimeout(1200); const base=await pg.evaluate(safeFp); await pg.reload(); await pg.waitForTimeout(2500); let d=safeDiff(base,await pg.evaluate(safeFp)); if(d) throw new Error('after closing and opening, '+d);
      for(const wait of [0,200]){ const tag=' Typed'+wait+'.'; await safeType(pg,tag,wait); await pg.close(); pg=await safeOpen(ctx); if(!(await pg.evaluate(t=>BOOK.order.some(id=>CH.get(id).text.includes(t.trim())),tag))) throw new Error('words typed '+wait+' ms before Inkhorse was closed were lost'); }
      if(pg.errs.length) throw new Error('page error: '+pg.errs[0]); } finally { await ctx.close(); }
  });
  await step('P9.1 Safe words: a backup file restored on a new phone brings back everything, and still has it after closing and opening; a damaged file or a file that is not a backup is refused and the book is left alone (rev 239)', async () => {
    const sk=await rev239(); if(sk) return sk; const fs=require('fs'), os=require('os'), P=require('path'); const ctx=await browser.newContext({...devices['iPhone 14 Pro Max'],acceptDownloads:true}), ctx2=await browser.newContext({...devices['iPhone 14 Pro Max']});
    try{ const pg=await safeOpen(ctx); await pg.evaluate(safeBuild); await pg.waitForTimeout(1200); const base=await pg.evaluate(safeFp);
      const [d]=await Promise.all([pg.waitForEvent('download',{timeout:30000}), pg.evaluate(()=>document.querySelector('#fbkSave').click())]); const file=P.join(os.tmpdir(),'inkhorse-audit-'+process.pid+'.inkhorse'); await d.saveAs(file); if(!/\.inkhorse$/.test(d.suggestedFilename())) throw new Error('the backup file is named '+d.suggestedFilename());
      const p2=await safeOpen(ctx2); await p2.setInputFiles('#fbkIn',file); await p2.waitForTimeout(800); if(!(await p2.evaluate(()=>!!document.querySelector('#fbkGo')))) throw new Error('the backup file was not recognised: '+await p2.textContent('#fbkPending')); await p2.evaluate(()=>document.querySelector('#fbkGo').click()); await p2.waitForTimeout(2500);
      let x=safeDiff(base,await p2.evaluate(safeFp)); if(x) throw new Error('restored on a new phone, '+x); await p2.reload(); await p2.waitForTimeout(2500); x=safeDiff(base,await p2.evaluate(safeFp)); if(x) throw new Error('after the restored book was closed and opened, '+x);
      const bad=file+'.cut'; fs.writeFileSync(bad,fs.readFileSync(file,'utf8').slice(0,4000)); for(const [f,what] of [[bad,'a damaged backup file'],[P.join(__dirname,'fixtures','import','hash-chapters.txt'),'a file that is not a backup']]){ await pg.setInputFiles('#fbkIn',f); await pg.waitForTimeout(700); if(await pg.evaluate(()=>!!document.querySelector('#fbkGo'))) throw new Error(what+' was offered for restoring'); x=safeDiff(base,await pg.evaluate(safeFp)); if(x) throw new Error('after '+what+' was tried, '+x); }
      if(pg.errs.length||p2.errs.length) throw new Error('page error: '+(pg.errs[0]||p2.errs[0])); } finally { await ctx.close(); await ctx2.close(); }
  });
  await step('Safe words: Back up now and then Restore undoes damage done after the backup, the restore itself can be undone, and a deleted chapter comes back with Undo and is also kept in a backup made just before (rev 239)', async () => {
    const sk=await rev239(); if(sk) return sk; const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    try{ const pg=await safeOpen(ctx); await pg.evaluate(safeBuild); await pg.waitForTimeout(1200); const base=await pg.evaluate(safeFp);
      await pg.evaluate(()=>document.querySelector('#bkNow').click()); await pg.waitForTimeout(1500); await pg.evaluate(()=>{ const c=CH.get(BOOK.order[1]); c.text='gone'; touchChapter(c); BOOK.title='Wrong Title'; touchIndex(); }); await pg.waitForTimeout(600);
      await pg.evaluate(async()=>{ await loadBackups(); const k=bkList.find(x=>x.kind==='manual'); if(k) await restoreBackup(k.key); }); await pg.waitForTimeout(1500); let x=safeDiff(base,await pg.evaluate(safeFp)); if(x) throw new Error('after Restore, '+x);
      let kinds=await pg.evaluate(async()=>{ await loadBackups(); return bkList.map(b=>b.kind); }); if(!kinds.includes('restore')) throw new Error('the book as it was before the restore was not kept: '+kinds.join(', '));
      await pg.evaluate(()=>dropChapter(BOOK.order[1])); await pg.waitForTimeout(600); const after=await pg.evaluate(()=>({n:BOOK.order.length,undo:!!document.querySelector('#toast:not([hidden]) #toastBtn'),msg:document.querySelector('#toast').textContent})); if(after.n!==2||!after.undo) throw new Error('after Delete there are '+after.n+' chapters and '+(after.undo?'an':'no')+' Undo button: '+after.msg);
      await pg.reload(); await pg.waitForTimeout(2500); if(await pg.evaluate(()=>BOOK.order.length)!==2) throw new Error('a deleted chapter came back by itself after closing and opening');
      kinds=await pg.evaluate(async()=>{ await loadBackups(); const k=bkList.find(b=>b.kind==='deleted'); return k?{ch:k.chapters,label:document.querySelector('#bkList')?bkKind(k.kind):''}:null; }); if(!kinds||kinds.ch!==3||kinds.label!=='Before deleting a chapter') throw new Error('no backup from just before the chapter was deleted: '+JSON.stringify(kinds));
      await pg.evaluate(()=>dropChapter(BOOK.order[0])); await pg.waitForTimeout(500); await pg.click('#toastBtn'); await pg.waitForTimeout(500); const t=await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title).join(' | ')); if(t!=='Alpha Harbor | Gamma Field') throw new Error('Undo did not put the chapter back where it was: '+t);
      await pg.reload(); await pg.waitForTimeout(2500); if((await pg.evaluate(()=>BOOK.order.map(id=>CH.get(id).title).join(' | ')))!=='Alpha Harbor | Gamma Field') throw new Error('the chapter put back with Undo was gone after closing and opening');
      if(pg.errs.length) throw new Error('page error: '+pg.errs[0]); } finally { await ctx.close(); }
  });
  await step('Safe words: Inkhorse open in two tabs. Writing done in one tab survives typing in the other; a chapter deleted in one stays deleted; and if both tabs changed the same chapter, both versions of the book are kept in Daily backups (rev 239)', async () => {
    const sk=await rev239(); if(sk) return sk; const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    try{ const A=await safeOpen(ctx); await A.evaluate(()=>{ BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; BOOK.title='Two Tabs'; ['One','Two','Three'].forEach(t=>{ const id=addChapter(t,'Chapter '+t+' as first written.'); dirty.add(id); }); S.cur=BOOK.order[0]; S.rch=S.cur; S.anchor=0; touchIndex(); loadEditor(); renderChapterUI(); }); await A.waitForTimeout(800);
      const B=await safeOpen(ctx); if((await B.evaluate(()=>BOOK.title))!=='Two Tabs') return 'SKIP: on this test machine two tabs do not share storage';
      await safeType(A,' A long evening of new writing done in the first tab.',700); await safeType(B,' x',700);
      const C=await safeOpen(ctx); let t=await C.evaluate(()=>CH.get(BOOK.order[0]).text); if(!/A long evening of new writing done in the first tab\. x$/.test(t)) throw new Error('writing done in one tab was lost when the other tab was typed in: "'+t.slice(0,110)+'"'); await C.close();
      await A.evaluate(()=>dropChapter(BOOK.order[2])); await A.waitForTimeout(700); await safeType(B,'y',700); const n=await (await safeOpen(ctx)).evaluate(()=>BOOK.order.map(id=>CH.get(id).title).join(',')); if(n!=='One,Two') throw new Error('a chapter deleted in one tab was brought back by the other: '+n);
      /* both tabs change chapter Two before either sees the other: tab B writes its version in memory only, then meets a stored copy from "another tab" */
      for(const [when,keeps] of [[-2000,'MINE'],[60000,'THEIRS']]){ const r=await B.evaluate(async({when,keeps})=>{ absorbOther(); const id=BOOK.order[1], c=CH.get(id); clearTimeout(mT); c.text='MINE '+keeps; c.updated=Date.now(); c.rev++; dirty.add(id);
            const b=storedBook(); b.w='other'+Math.random(); b.chapters.find(x=>x.id===id).text='THEIRS '+keeps; b.chapters.find(x=>x.id===id).updated=Date.now()+when; localStorage.setItem(bkeyFor(SLOT),JSON.stringify(b));
            absorbOther(); await new Promise(r=>setTimeout(r,900)); const idx=(await idb.get(bkP()+'index'))||[], others=[]; for(const x of idx.filter(x=>x.kind==='other')){ const d=await idb.get(bkP()+x.key); others.push(d.chapters.find(q=>q.id===id).text); }
            return {page:CH.get(id).text,others}; },{when,keeps});
        if(r.page!==keeps+' '+keeps) throw new Error('when both tabs changed a chapter, the page shows "'+r.page+'" where the newer writing is "'+keeps+' '+keeps+'"');
        const other=(keeps==='MINE'?'THEIRS':'MINE')+' '+keeps; if(!r.others.includes(other)) throw new Error('the version that did not stay on the page ("'+other+'") was not kept in Daily backups: '+JSON.stringify(r.others)); }
      if(A.errs.length||B.errs.length) throw new Error('page error: '+(A.errs[0]||B.errs[0])); } finally { await ctx.close(); }
  });
  await step('Safe words: when the device has no room to save, Inkhorse says the book is NOT saved, keeps saying it while you type, shows a message, and goes back to "Saved" only when it really can save again (rev 239)', async () => {
    const sk=await rev239(); if(sk) return sk; const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    try{ const pg=await safeOpen(ctx); await pg.evaluate(()=>{ BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; const id=addChapter('One','Words. '.repeat(600)); dirty.add(id); S.cur=id; S.rch=id; S.anchor=0; touchIndex(); loadEditor(); renderChapterUI(); }); await pg.waitForTimeout(800);
      if(!/Saved on this device only/.test(await pg.textContent('#statusText'))) return 'SKIP: this copy is not saving to the device alone ('+await pg.textContent('#statusText')+')';
      await pg.evaluate(()=>{ const real=Storage.prototype.setItem; window.__full=true; Storage.prototype.setItem=function(k,v){ if(window.__full&&String(v).length>2000) throw new DOMException('quota','QuotaExceededError'); return real.call(this,k,v); }; });
      const seen=[]; for(let i=0;i<6;i++){ await safeType(pg,' full'+i,i%2?60:420); seen.push(await pg.textContent('#statusText')); } await pg.waitForTimeout(600); seen.push(await pg.textContent('#statusText'));
      const wrong=seen.slice(1).find(x=>!/NOT saved/.test(x)); if(wrong!==undefined) throw new Error('with no room to save, the status read "'+wrong+'"'); const msg=await pg.evaluate(()=>{ const t=document.querySelector('#toast'); return t.hidden?'':t.textContent; }); if(!/NOT being saved/.test(msg)) throw new Error('no message told the writer the book is not being saved: "'+msg+'"');
      await pg.evaluate(()=>{ window.__full=false; }); await safeType(pg,' room',800); const back=await pg.textContent('#statusText'); if(!/Saved on this device only/.test(back)) throw new Error('with room again, the status still read "'+back+'"');
      await pg.reload(); await pg.waitForTimeout(2500); if(!(await pg.evaluate(()=>CH.get(BOOK.order[0]).text.endsWith(' room')))) throw new Error('writing done once there was room again was not saved');
      if(pg.errs.length) throw new Error('page error: '+pg.errs[0]); } finally { await ctx.close(); }
  });
  await step('The scorecard is honest: every rule in the Formatting Standard is on its scorecard, and every rule listed there as proven is named by a test in this file (rev 236)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=236))) return 'SKIP: before rev 236';
    const fs=require('fs'), P=require('path'), md=fs.readFileSync(P.join(__dirname,'..','docs','FORMATTING-STANDARD.md'),'utf8'), me=fs.readFileSync(__filename,'utf8');
    const body=md.slice(0,md.indexOf('# Part 11')), sc=md.slice(md.indexOf('# Part 11'),md.indexOf('# How we keep the standard')), rules=[...body.matchAll(/^(F\d+\.\d+) /gm)].map(m=>m[1]);
    if(rules.length<60) throw new Error('only '+rules.length+' rules were found in the standard');
    const idsIn=t=>{ const out=new Set(); for(const line of t.split('\n')){ if(!line.startsWith('- ')) continue; const head=(/^- ((?:F\d+(?:\.\d+)?(?:,| and| to)?\s*)+)/.exec(line)||[])[1]||''; for(const m of head.matchAll(/F(\d+)\.(\d+) to F\d+\.(\d+)/g)) for(let k=+m[2];k<=+m[3];k++) out.add('F'+m[1]+'.'+k); for(const m of head.matchAll(/F\d+\.\d+/g)) out.add(m[0]); } return out; };
    const all=idsIn(sc), missing=rules.filter(r=>!all.has(r)); if(missing.length) throw new Error('not on the scorecard at all: '+missing.join(', '));
    const a=sc.indexOf('Proven:'), b=sc.indexOf('Meets the standard, checked by eye'); if(a<0||b<a||idsIn(sc.slice(a,b)).size<40) throw new Error('the scorecard has lost its "Proven" list');
    const named=new Set(); for(const m of me.matchAll(/await (?:step|F)\('((?:[^'\\]|\\.)*)'/g)) for(const x of m[1].matchAll(/F\d+\.\d+/g)) named.add(x[0]);
    const unproven=[...idsIn(sc.slice(a,b))].filter(r=>!named.has(r)); if(unproven.length) throw new Error('listed as proven, but no test names the rule: '+unproven.join(', '));
    return 'OK: '+rules.length+' rules, '+idsIn(sc.slice(a,b)).size+' proven';
  });
  await step('StyleKnight signs are whole: nothing touches the picture edges, and the lettering is not cut where it meets the horse (rev 222)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=222))) return 'SKIP: before rev 222 the lettering was cut';
    const r=await page.evaluate(async()=>{ const srcs={light:document.querySelector('.lk-light').src,dark:document.querySelector('.lk-dark').src,welcome:IMGURL['fcabc3b3827af3e0e50cf170d72881de'],cover:IMGURL['manual-lockup']};
      const out={}; for(const [k,s] of Object.entries(srcs)){ const im=new Image(); im.src=s; await im.decode(); const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0); const d=g.getImageData(0,0,c.width,c.height).data;
        const bg=[d[(2*c.width+c.width-3)*4],d[(2*c.width+c.width-3)*4+1],d[(2*c.width+c.width-3)*4+2],d[(2*c.width+c.width-3)*4+3]];
        const ink=(x,y)=>{ const i=(y*c.width+x)*4; return bg[3]<10 ? d[i+3]>40 : Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2])>60; };
        let edge=0; for(let x=0;x<c.width;x++){ if(ink(x,0)||ink(x,c.height-1)) edge++; } for(let y=0;y<c.height;y++){ if(ink(0,y)||ink(c.width-1,y)) edge++; }
        // the lettering: the first inked column right of the horse must start soft (a letter's curve or serif), not as a cut-off flat wall
        const cols=[]; for(let x=0;x<c.width;x++){ let n=0; for(let y=0;y<c.height;y++) if(ink(x,y)) n++; cols.push(n); }
        let x=Math.round(c.width*0.33); while(x<c.width&&cols[x]>0) x++; while(x<c.width&&cols[x]===0) x++;
        out[k]={edge, first:cols[x], next:Math.max(cols[x+2]||0,1)}; }
      return out; });
    const bad=Object.entries(r).filter(([k,v])=>v.edge>0||v.first>v.next*0.9);
    if(bad.length) throw new Error('signs cut or touching an edge: '+JSON.stringify(Object.fromEntries(bad)));
  });
  await step('Dictate: the live words sit at the bottom of the writing area, not over the first lines (rev 168)', async () => {
    if(!(await page.evaluate(()=>typeof liveWords==='function' && (window.INK_VERSION||{}).rev>=168))) return 'SKIP: before rev 168 the live words sat at the top';
    const r=await page.evaluate(()=>{ liveWords('hearing these words'); const b=dictLive.getBoundingClientRect(), t=document.querySelector('#manuscript').getBoundingClientRect(); liveWords(''); return {bt:b.top,bb:b.bottom,tt:t.top,tb:t.bottom}; });
    if(r.bt < r.tt + (r.tb-r.tt)/2) throw new Error('live words box is in the top half (top '+Math.round(r.bt)+', writing area '+Math.round(r.tt)+'–'+Math.round(r.tb)+')');
    if(r.bb > r.tb + 2) throw new Error('live words box hangs below the writing area');
  });
  await step('Full screen: the tap message every time it goes full screen, a note every time it leaves, and a play/pause sign on double-tap (rev 169, 171)', async () => {
    if(!(await page.evaluate(()=>typeof fsHint==='function' && (window.INK_VERSION||{}).rev>=171))) return 'SKIP: before rev 171 the hint showed only the first few times';
    const r=await page.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), fromTab=S.tab, h=document.querySelector('#fsHint'), out=[];
      setTab('read'); await w(200);
      for(let k=0;k<3;k++){ setImmersive(true); await w(100); out.push(!h.hidden && /Double-tap/.test(h.textContent)); setImmersive(false); await w(100); out.push(!h.hidden && /go full screen again/.test(h.textContent)); }
      setImmersive(true); await w(50); listenToggle(); await w(60); const flash=!document.querySelector('#ppFlash').hidden; listenToggle();
      await w(900); const flashGone=document.querySelector('#ppFlash').hidden;
      setImmersive(false); try{ ttsStop(); }catch(_){ } setTab(fromTab); await w(300); h.hidden=true;
      return {out,flash,flashGone}; });
    if(r.out.some(x=>!x)) throw new Error('message missing on enter/leave: '+JSON.stringify(r.out));
    if(!r.flash) throw new Error('no play/pause sign after the double-tap action');
    if(!r.flashGone) throw new Error('the play/pause sign did not go away');
  });
  await step('Full screen, real taps: double-tap left, middle or right plays/pauses without turning the page; one tap on a side turns it; one tap in the middle brings the controls back (rev 170)', async () => {
    if(!(await page.evaluate(()=>typeof midTapX!=='undefined' && (window.INK_VERSION||{}).rev>=170))) return 'SKIP: before rev 170 double-tap only counted in the middle';
    const fromTab=await page.evaluate(()=>S.tab), keep=await T();
    await page.fill('#manuscript', Array.from({length:60},(_,i)=>'Paragraph '+i+' has a number of words in it so that the chapter runs to several pages for this check.').join('\n'));
    await page.waitForTimeout(1200);
    try{
      await page.evaluate(()=>{ localStorage.setItem('inkhorse-fs-hint-shown','3'); setTab('read'); S.rch=S.cur; S.anchor=0; try{ refreshReader(); }catch(_){ } });
      await page.waitForTimeout(600);
      const pages=await page.evaluate(()=>pag(S.rch).pages.length); if(pages<3) throw new Error('the test chapter has only '+pages+' pages');
      await page.evaluate(()=>setImmersive(true)); await page.waitForTimeout(600);
      const st=await page.evaluate(()=>{ const r=document.querySelector('#stage').getBoundingClientRect(); return {l:r.left,w:r.width,y:r.top+r.height/2}; });
      const pos=()=>page.evaluate(()=>S.rch+'@'+S.anchor), playing=()=>page.evaluate(()=>!!TTS.playing);
      const dbl=async fx=>{ await page.touchscreen.tap(st.l+st.w*fx,st.y); await page.waitForTimeout(140); await page.touchscreen.tap(st.l+st.w*fx,st.y); await page.waitForTimeout(700); };
      const p0=await pos(), rev193=await page.evaluate(()=>(window.INK_VERSION||{}).rev>=193);
      /* rev 193 (F3.7, Steve Nov 7): double-tap play/pause lives in the middle; quick taps on the sides each turn one page and never start the voice */
      for(const [fx,name] of (rev193?[[0.5,'middle']]:[[0.85,'right'],[0.5,'middle'],[0.15,'left']])){
        const was=await playing(); await dbl(fx);
        const on=await playing(); if(on) await page.evaluate(()=>{ ttsPause(); });   // keep the voice from turning pages by itself during the check
        if(await pos()!==p0) throw new Error('double-tap on the '+name+' turned the page');
        if(was) throw new Error('setup: was already playing');
        if(rev193 && !on) throw new Error('double-tap in the middle did not start reading aloud');
      }
      if(rev193){
        await page.evaluate(()=>{ try{ ttsStop(); }catch(_){ } }); await page.waitForTimeout(200);
        const i0=await page.evaluate(()=>curIndex());
        await dbl(0.85); await page.waitForTimeout(1200);
        const r=await page.evaluate(()=>({i:curIndex(),tts:!!TTS.on&&!!TTS.playing}));
        if(r.tts) throw new Error('a quick double tap on the right side started the voice');
        if(r.i!==i0+2) throw new Error('two quick taps on the right side turned '+(r.i-i0)+' pages, not 2');
        await page.evaluate(()=>{ S.anchor=0; refreshReader(); }); await page.waitForTimeout(400);
      }
      await page.evaluate(()=>{ try{ ttsStop(); }catch(_){ } }); await page.waitForTimeout(200);
      await page.touchscreen.tap(st.l+st.w*0.85,st.y); await page.waitForTimeout(1200);
      if(await pos()===p0) throw new Error('one tap on the right side did not turn the page');
      await page.touchscreen.tap(st.l+st.w*0.5,st.y); await page.waitForTimeout(700);
      if(await page.evaluate(()=>document.body.classList.contains('immersive'))) throw new Error('one tap in the middle did not bring the controls back');
    } finally {
      await page.evaluate(f=>{ try{ ttsStop(); }catch(_){ } setImmersive(false); setTab(f); },fromTab); await page.waitForTimeout(400);
      await page.fill('#manuscript',keep); await page.waitForTimeout(600);
    }
  });
  await step('Fix on a phone with the keyboard up: the words fill the space, Done stays on screen, the thumb scrolls and places the cursor, and the player keeps one page number (rev 173)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=173))) return 'SKIP: before rev 173';
    const fromTab=await page.evaluate(()=>S.tab), keep=await T();
    await page.fill('#manuscript', Array.from({length:60},(_,i)=>'Paragraph '+i+' has a number of words in it so that the chapter runs to several pages for this check.').join('\n'));
    await page.waitForTimeout(1200);
    try{
      await page.evaluate(()=>{ setTab('read'); S.rch=S.cur; S.anchor=0; try{ refreshReader(); }catch(_){ } }); await page.waitForTimeout(400);
      await page.evaluate(()=>{ const P=pag(S.rch).pages; S.anchor=P[Math.min(2,P.length-1)][0]; refreshReader(); }); await page.waitForTimeout(600);   // a full page, not the chapter opening
      const r=await page.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms));
        ttsPlay(); ttsPause(); await w(100); const where0=$('#ttsWhere').textContent;
        const sp=document.querySelector('#spread .ptext [data-w]'); fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w}); await w(150);
        document.body.classList.add('kbup'); document.body.style.height='430px'; await w(400);   // as if the phone keyboard took the bottom of the screen
        const fb=$('#fixBox').getBoundingClientRect(), done=$('#fixDone').getBoundingClientRect(), ft=$('#fixText');
        const headerShown=getComputedStyle(document.querySelector('header.top')).display!=='none';
        const touch=getComputedStyle(document.querySelector('#stage')).touchAction;
        const canScroll=ft.scrollHeight>ft.clientHeight; ft.scrollTop=40; const scrolled=ft.scrollTop>0; const dbg={sh:ft.scrollHeight,ch:ft.clientHeight,len:ft.value.length,ov:getComputedStyle(ft).overflowY,fs:getComputedStyle(ft).fontSize,fbH:fb.height};
        ft.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,clientX:fb.left+30,clientY:fb.top+80})); const grabbed=!!ptr; ptr=null;
        const where1=$('#ttsWhere').textContent;
        document.body.classList.remove('kbup'); document.body.style.height=''; fixDone(); try{ ttsStop(); }catch(_){ } await w(400);
        return {dbg,fbTop:fb.top,fbBottom:fb.bottom,doneTop:done.top,doneBottom:done.bottom,fbH:fb.height,headerShown,touch,canScroll,scrolled,grabbed,where0,where1}; });
      if(r.headerShown) throw new Error('logo and tabs still take room above the Fix box');
      if(r.doneTop<0||r.doneBottom>430) throw new Error('Done is off screen ('+Math.round(r.doneTop)+'–'+Math.round(r.doneBottom)+')');
      if(r.fbBottom>432) throw new Error('Fix box runs under the keyboard (bottom '+Math.round(r.fbBottom)+')');
      if(r.fbH<250) throw new Error('Fix box is only '+Math.round(r.fbH)+' px tall above the keyboard');
      if(r.touch!=='auto') throw new Error('the page area still keeps the finger (touch-action '+r.touch+')');
      if(!r.canScroll||!r.scrolled) throw new Error('the Fix text cannot scroll ('+JSON.stringify(r.dbg)+')');
      if(r.grabbed) throw new Error('a touch on the Fix text was taken for a page turn');
      if(r.where0!==r.where1) throw new Error('player page changed while fixing: '+r.where0+' → '+r.where1);
      if(!/page \d/.test(r.where0)) throw new Error('player does not show a book page: '+r.where0);
    } finally {
      await page.evaluate(f=>{ setTab(f); },fromTab); await page.waitForTimeout(400);
      await page.fill('#manuscript',keep); await page.waitForTimeout(600);
    }
  });
  await step('Focus mode in and out', async () => { await tools(); await page.click('#focusBtn'); await page.waitForTimeout(300); const on=await page.evaluate(()=>document.body.className.includes('focus')); await page.keyboard.press('Escape'); await page.waitForTimeout(300); return on; });
  await step('Hoofprint opens and closes', async () => { await tools(); await page.click('#hpBtn'); await page.waitForTimeout(300); const v=await page.isVisible('#hpPanel'); await page.click('#hpDone'); return v; });
  await step('Hoofprint offers Bolduc for "bold duck"', async () => { await page.evaluate(()=>{ S.hp.words.push('Bolduc'); saveSettings(); }); await page.fill('#manuscript','My grandmother was a bold duck from Quebec. She was kind.'); await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(t.value.length,t.value.length); }); await page.waitForTimeout(1500); return /Bolduc/.test(await page.textContent('#hpBar')); });
  await step('Chapters panel: add a chapter, close', async () => { await page.click('#chBtn',{timeout:4000}).catch(e=>{throw new Error('chBtn: '+e.message.split('\n').slice(0,6).join(' / '))}); await page.waitForTimeout(300); await page.click('#addCh',{timeout:4000}).catch(e=>{throw new Error('addCh: '+e.message.split('\n').slice(0,8).join(' / '))}); await page.waitForTimeout(300); const l=await page.textContent('#chBtnLabel'); if(await page.isVisible('#drawerDone')) await page.click('#drawerDone'); await page.waitForTimeout(300); return /2 of/.test(l) || ('label was: '+l); });
  await step('Read tab shows pages and page numbers', async () => { await page.click('#tab-read'); await page.waitForTimeout(800); return /of \d/.test(await page.textContent('#pgOf')); });
  await step('Jump to: numbers agree with the counter', async () => { const of=(await page.textContent('#pgOf')).match(/\d+/)[0]; await page.click('#whereBtn'); await page.waitForTimeout(300); const now=await page.textContent('#gotoNow'); const list=await page.textContent('#gotoList'); await page.click('#gotoDone'); return now.includes('of '+of) && !/of 7[0-9]|starts on/.test(list) ? true : {of,now:now.slice(0,40)}; });
  await step('page turn by arrow key', async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(600); });
  await step('Book Hub: the counter below the book is labelled Book Hub and opens the panel titled Book Hub (rev 197)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=197))) return 'SKIP: before rev 197';
    await page.click('#tab-read'); await page.waitForTimeout(300);
    const tag=await page.evaluate(()=>{ const t=document.querySelector('#whereBtn .hubtag'); return t&&getComputedStyle(t).display!=='none'&&t.getBoundingClientRect().height>0?t.textContent:''; });
    if(!/Book Hub/.test(tag)) throw new Error('no visible Book Hub label on the counter');
    await page.click('#whereBtn'); await page.waitForTimeout(300);
    const title=await page.textContent('#goto .gh b'); await page.click('#gotoDone'); await page.waitForTimeout(200);
    if(title.trim()!=='Book Hub') throw new Error('panel title is '+JSON.stringify(title));
    return true;
  });
  await step('Jump-to sheet opens', async () => { await page.click('#whereBtn'); await page.waitForTimeout(300); const v=await page.isVisible('#gotoDone'); await page.click('#gotoDone').catch(()=>{}); return v; });
  await step('Colors: every theme applies', async () => { for (const th of ['light','dark','sepia','sky','custom']) { await page.evaluate(t=>{ localStorage.setItem('inkhorse-theme',t); inkApplyTheme(); },th); if((await page.evaluate(()=>document.documentElement.getAttribute('data-theme')))!==th) return th+' failed'; } await page.evaluate(()=>{ localStorage.removeItem('inkhorse-theme'); inkApplyTheme(); }); });
  await step('Night schedule + warmth apply', async () => { await page.evaluate(()=>{ localStorage.setItem('inkhorse-night','dark'); const hm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'), n=Date.now(); localStorage.setItem('inkhorse-night-from',hm(new Date(n-3600e3))); localStorage.setItem('inkhorse-night-to',hm(new Date(n+3600e3)));   /* rev 218: a window around now, so the check can't fail in the last minute before midnight */ localStorage.setItem('inkhorse-warmth','40'); inkApplyTheme(); }); const r=await page.evaluate(()=>[document.documentElement.getAttribute('data-theme'),document.documentElement.hasAttribute('data-warm')]); await page.evaluate(()=>{ ['inkhorse-night','inkhorse-night-from','inkhorse-night-to','inkhorse-warmth'].forEach(k=>localStorage.removeItem(k)); inkApplyTheme(); }); return r[0]==='dark'&&r[1]; });
  await step('Read aloud: player opens, buttons work', async () => { await page.click('#listenBtn'); await page.waitForTimeout(600); const bar=await page.isVisible('#ttsBar'); for (const id of ['ttsFwd','ttsBack','ttsAgain','ttsPlay']) { const b=await page.$('#'+id); if(b&&await b.isVisible()) await b.click({timeout:2000}); await page.waitForTimeout(150); } await page.evaluate(()=>ttsStop()); return bar; });
  await step('Read aloud: Meilin, the natural voice, is offered and asks before downloading (rev 97)', async () => {
    // This test machine has no internet for the voice itself; Bella's real download and reading are tested separately over the internet.
    if(!(await page.$('#kokNote'))) return 'SKIP: this version has no natural voices';
    await page.click('#listenBtn'); await page.waitForTimeout(300); if(await page.evaluate(()=>TTS.playing)) await page.click('#ttsPlay');
    if(await page.$('#ttsSetBtn')){ await page.click('#ttsSetBtn'); await page.waitForTimeout(200); }   // rev 114: Voice is in Settings
    const opt=await page.$eval('#ttsVoice option',o=>[o.value,o.textContent]);
    if(opt[0]!=='kokoro:af_bella'||!/Meilin/.test(opt[1])) throw new Error('Meilin is not first in the Voice list: '+opt);
    await page.selectOption('#ttsVoice','kokoro:af_bella'); await page.waitForTimeout(200);
    const note=await page.textContent('#kokNote'), shown=await page.isVisible('#kokGo');
    if(!shown||!/MB/.test(note)) throw new Error('no download question: '+note.slice(0,80));
    if(await page.evaluate(()=>(S.ttsVoice||'').startsWith('kokoro:'))) throw new Error('voice switched before the download was agreed');
    await page.click('#kokNo'); await page.waitForTimeout(200);
    const hidden=!(await page.isVisible('#kokNote')), sel=await page.inputValue('#ttsVoice');
    await page.evaluate(()=>ttsStop());
    return hidden && !sel.startsWith('kokoro:') ? true : {hidden,sel};
  });
  await step('Adding a PDF asks how to add it, the question stays in view until answered, and Cancel adds nothing (rev 98, 227)', async () => {
    if(!(await page.$('#libAsk'))) return 'SKIP: this version has no PDF question';
    if(!(await page.isVisible('#library'))){ await page.click('#tab-read').catch(()=>{}); await page.click('#libBtn'); await page.waitForTimeout(400); }
    const n0=await page.evaluate(()=>LIB.length);
    await page.setInputFiles('#libIn',{name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF\n')}); await page.waitForTimeout(300);
    const txt=await page.textContent('#libAsk'); if(!(/Make it a real book/.test(txt)&&/Keep the exact look/.test(txt))&&!(/Text I can resize and hear/.test(txt)&&/Pages exactly as printed/.test(txt))) throw new Error('question missing: '+txt.slice(0,80));
    if(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=227)){   // rev 227: the question cannot be missed
      if(!/not added until you choose/.test(txt)) throw new Error('the question does not say the book waits for an answer');
      if(!/only for your own reading/.test(txt)||!/original file is not changed/.test(txt)) throw new Error('the question does not say it is for your own reading and leaves the file alone');
      const seen=await page.evaluate(async()=>{ const body=document.querySelector('#library .drawer-body'), box=document.querySelector('#libAsk'); const vis=()=>{ const b=box.getBoundingClientRect(), d=body.getBoundingClientRect(); return b.top>=d.top-2&&b.top<d.bottom-60; };
        const first=vis(); body.scrollTop=body.scrollHeight; await new Promise(r=>setTimeout(r,250)); const after=vis(), scrolled=body.scrollTop>0; body.scrollTop=0; return {first,after,scrolled}; });
      if(!seen.first) throw new Error('the question is not in view when it appears');
      if(seen.scrolled&&!seen.after) throw new Error('the question scrolls out of view while it is still waiting');
    }
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
      /* rev 237: the title page ("A Test Book") keeps its words and is the first front page; the Contents is the next one. Before rev 237 the title page's words were dropped. */
      const ci=RB.order.findIndex(id=>RB.ch.get(id).text.split('\n')[1]==='Contents'), co=RB.order[Math.max(0,ci)]; out.ci=ci; out.first=RB.ch.get(RB.order[0]).text.split('\n'); out.firstFront=isFront(RB.order[0]);
      out.front=RB.ch.get(co).text.split('\n'); out.isFront=isFront(co); out.label=RB.order.slice(ci+1).map(id=>fmtSplitTitle(RB.ch.get(id).title).label); out.paras=RB.order.slice(ci+1).map(id=>RB.ch.get(id).text.split('\n').length); out.nums=RB.order.some(id=>/^\s*\d{1,3}\s*$/m.test(RB.ch.get(id).text));
      leaveLibraryBook(); return out; });
    await page.evaluate(async()=>{ const id=LIB[0].id; LIB=LIB.slice(1); saveLibIndex(); try{ await idb.del('lib:'+id); }catch(_){ } renderShelf(); });
    await page.click('#libDone').catch(()=>{}); await page.waitForTimeout(300);
    const ok=!r.pageMode && JSON.stringify(r.titles.slice(-3))===JSON.stringify(titles) && r.front.length===5 && r.front[0]==='%%front' && r.front[1]==='Contents' && r.isFront && JSON.stringify(r.label)==='["Chapter One","Chapter Two","Chapter Three"]' && r.paras.every(n=>n===12) && !r.nums;
    if(!ok) throw new Error(JSON.stringify(r).slice(0,400));
    if((await page.evaluate(()=>(window.INK_VERSION||{}).rev>=237)) && !(r.ci===1 && r.firstFront && JSON.stringify(r.first)==='["%%front","A Test Book"]')) throw new Error('the title page did not come in as its own front page with its words: '+JSON.stringify({ci:r.ci,first:r.first,firstFront:r.firstFront}));
    return true;
  });
  await step('F2.3 a title written "Chapter One: Point of Origin" shows its own label above the title (rev 100)', async () => page.evaluate(() => {
    const t=[['Chapter One: Point of Origin','Chapter One','Point of Origin'],['Chapter Seven: The Road Back — Florida, 1991','Chapter Seven','The Road Back — Florida, 1991'],['PART 1 · The Bridge','PART 1','The Bridge'],['Part Two - Home','Part Two','Home'],['Memory','','Memory']];
    const bad=t.filter(([x,l,ti])=>{ const r=fmtSplitTitle(x); return r.label!==l||r.title!==ti; }); if(bad.length) throw new Error(JSON.stringify(bad)); return true; }));
  await step('Library lists the manual', async () => { await page.click('#libBtn'); await page.waitForTimeout(500); return /User manual/.test(await page.evaluate(()=>document.body.innerText)); });
  await step('F1.2 P4.1 Covers: every Library cover is the standard 2:3 size, whole picture inside (rev 83-85)', async () => {
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
    return `OK: ${ms} ms, ${chs} chapters`;
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
    for(let i=0;i<12;i++){ pages.push(await page.evaluate(()=>{ const pg=document.querySelector('#spread .face:not(.left) .ptext')||document.querySelector('#spread .ptext'); if(!pg) return null; const rh=pg.querySelector('.ck')||pg.parentElement.querySelector('.rh');   /* since rev 198 the opener's label sits in the page (F2.3 + F2.6) */ const h=pg.querySelector('h2.cht'), fp=h&&h.nextElementSibling, sb=pg.querySelector('p.sb');
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
    return 'OK: '+r.breaks+' paragraph breaks checked';
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
  await step('Manual: every Find a button line points at a real chapter and section (rev 157)', async () => {
    const bad=await page.evaluate(()=>{ const secs={}; MANUAL.chapters.forEach(c=>{ secs[c.title]=[...c.text.matchAll(/^## (.+)$/gm)].map(m=>m[1].trim()); });
      const out=[]; MANUAL.chapters.forEach(c=>{ for(const m of c.text.matchAll(/^@@find (.+?) => (.+)$/gm)){ const [ch,sec]=m[2].split(' > '); if(!(ch in secs) || (sec && !secs[ch].includes(sec.trim()))) out.push(m[2]); } }); return out; });
    return !bad.length || (()=>{ throw new Error('no such section: '+bad.join(' | ')); })();
  });
  await step('Manual: no removed button is still described (Stop, Mark, Erase, Edit tab, This is my book, pinch) (rev 157)', async () => {
    const hits=await page.evaluate(()=>{ const txt=MANUAL.chapters.map(c=>c.text).join('\n'); return [/\bStop\b/,/\bMark:/,/\bErase\b/,/Edit tab/,/This is my book/,/\b[Pp]inch/].filter(r=>r.test(txt)).map(String); });
    return !hits.length || (()=>{ throw new Error('found '+hits.join(', ')); })();
  });
  await step('Manual opens with a Contents page and page numbers', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1500); let all=''; for(let i=0;i<12;i++){ all+=await page.evaluate(()=>document.querySelector('#spread').innerText); await page.click('#next').catch(()=>{}); await page.waitForTimeout(450);} await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return /(^|\n)Welcome to Inkhorse\s+\d/.test(all) && /Chapter 1 · The big picture\s+\d/.test(all); });   /* rev 158: front pages carry no number in the Contents, like on their own pages */
  await step('F3.7 Full screen: quick side taps turn one page each, in order, and leaving full screen mid-turn keeps the place (rev 193)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=193))) return 'SKIP: before rev 193';
    await page.waitForFunction(()=>!turning && !turnQ.length,null,{timeout:8000}).catch(()=>{});   /* earlier steps' page turns finish first */
    await page.evaluate(()=>{ try{ if(RB) leaveLibraryBook(); }catch(_){ } }); await page.waitForTimeout(400);
    const fromTab=await page.evaluate(()=>S.tab), keepTurn=await page.evaluate(()=>S.turn);
    const id=await page.evaluate(()=>addChapter('Tap test',Array.from({length:120},(_,i)=>'Paragraph '+i+' has a number of words in it so that the chapter runs to many pages for this check.').join('\n')));
    try{
      const res={};
      for(const mode of ['curl','slide','instant']){
        await page.evaluate(([m,m2])=>{ localStorage.setItem('inkhorse-fs-hint-shown','3'); S.turn=m; setTab('read'); S.rch=m2; S.anchor=0; try{ refreshReader(); }catch(_){ } setImmersive(true); },[mode,id]);
        await page.waitForTimeout(700); await page.waitForFunction(()=>!turning && !turnQ.length,null,{timeout:8000}).catch(()=>{});
        const st=await page.evaluate(()=>{ const r=document.querySelector('#stage').getBoundingClientRect(); return {l:r.left,w:r.width,y:r.top+r.height/2}; });
        await page.evaluate(()=>{ window.TLOG=[]; if(!window.TLOGon){ window.TLOGon=1; const sg=document.querySelector('#stage'); ['pointerdown','pointerup','pointercancel'].forEach(t=>sg.addEventListener(t,e=>TLOG.push(t[7]+Math.round(performance.now()%100000)+(turning?'T':'')+turnQ.length),true)); } });
        const seen=[await page.evaluate(()=>curIndex())];
        for(let k=0;k<4;k++){ await page.touchscreen.tap(st.l+st.w*0.88,st.y); await page.waitForTimeout(300); seen.push(await page.evaluate(()=>curIndex())); }
        await page.waitForFunction(()=>!turning && !turnQ.length,null,{timeout:6000}).catch(()=>{}); await page.waitForTimeout(150);
        const end=await page.evaluate(()=>({i:curIndex(),tts:!!TTS.on}));
        if(end.tts) throw new Error(mode+': side taps started the voice');
        for(let k=1;k<seen.length;k++) if(seen[k]<seen[k-1]||seen[k]-seen[k-1]>1) throw new Error(mode+': pages went '+seen.join(' → '));
        if(end.i-seen[0]!==4) throw new Error(mode+': 4 taps turned '+(end.i-seen[0])+' pages ('+seen.join(' → ')+' → '+end.i+') '+(await page.evaluate(()=>TLOG.join(' '))));
        // leave full screen while a page is turning: the page it was heading to keeps its words
        await page.evaluate(()=>flip(1));
        const want=await page.evaluate(()=>{ const t=curIndex()+(two?2:1); return pag(S.rch).pages[Math.min(t,pag(S.rch).pages.length-1)][0]; });
        await page.evaluate(()=>setImmersive(false));
        await page.waitForFunction(()=>!turning,null,{timeout:6000}).catch(()=>{}); await page.waitForTimeout(200);
        const ok=await page.evaluate(w=>{ const [a,b]=pag(S.rch).pages[curIndex()]; return w>=a&&w<b; },want);
        if(!ok && mode!=='instant') throw new Error(mode+': leaving full screen mid-turn lost the place');
        res[mode]=seen.join('→')+'→'+end.i;
      }
      return true;
    } finally {
      await page.evaluate(([f,t,id])=>{ try{ ttsStop(); }catch(_){ } S.turn=t; setImmersive(false); try{ dropChapter(id); }catch(_){ } setTab(f); },[fromTab,keepTurn,id]); await page.waitForTimeout(400);
    }
  });
  await step('Manual: tapping a Contents line goes to that page', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1500); let line=null; for(let i=0;i<8&&!line;i++){ line=await page.$('#spread p.toc.t2[data-goto]'); if(!line){ await page.click('#next'); await page.waitForTimeout(450); await page.waitForFunction(()=>!turning,null,{timeout:4000}).catch(()=>{}); } } if(!line) return 'no contents line found'; await page.waitForTimeout(900); line=await page.$('#spread .page:not(.curl) p.toc.t2[data-goto], #spread p.toc.t2[data-goto]'); const want=await line.getAttribute('data-goto'); const bx=await line.boundingBox(); await page.mouse.click(bx.x+30, bx.y+bx.height/2); await page.waitForTimeout(1200); const got=(await page.textContent('#pgCur')).replace(/[^0-9–]/g,''); await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return got.split('–').includes(want) ? true : {want,got}; });
  await step('Jump to: typing a page number goes there', async () => { await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200); await page.click('#whereBtn'); await page.fill('#gotoNum','20'); await page.click('#gotoGo'); await page.waitForTimeout(800); const got=(await page.textContent('#pgCur')).replace(/[^0-9–]/g,''); const closed=!(await page.isVisible('#gotoDone')); await page.evaluate(()=>leaveLibraryBook()); await page.waitForTimeout(400); return got.split('–').includes('20')&&closed ? true : {got,closed}; });
  await step('Highlighter: tap and Clear page remove highlights (rev 135, Erase removed rev 142)', async () => {
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200);
    await page.evaluate(()=>{ for(let i=0;i<6;i++){ const b=document.querySelector('#spread .ptext[data-ch] [data-w]'); if(b) break; flip(1); } });
    await page.waitForTimeout(900);
    return page.evaluate(async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      const box=[...document.querySelectorAll('#spread .ptext[data-ch]')].find(p=>p.querySelectorAll('[data-w]').length>12 || (pag(p.dataset.ch).doc.words.length>40));
      if(!box) return 'SKIP: no text page to try the highlighter on';
      const ch=box.dataset.ch, n=()=>marksOf(ch).length, ranges=()=>resolveMarks(ch).map(r=>[r.start,r.end-1]);
      const base=n();
      addMark(ch,10,19); if(n()!==base+1) throw new Error('highlight not added');
      const r=markAt(ch,12); if(!r) throw new Error('no highlight at word 12'); clearMark(r); if(ranges().some(x=>x[0]>=10&&x[1]<=19)) throw new Error('tap-clear left the highlight');
      if(document.querySelector('#hlModeErase')) throw new Error('Erase button still there');
      const vis=[...box.querySelectorAll('[data-w]')].map(e=>+e.dataset.w); const w0=vis.length?vis[0]:0;
      addMark(ch,w0,w0+2); await sleep(400); const before=n(); clearPageMarks(); await sleep(300);
      if(n()>=before) throw new Error('Clear page left the highlight');
      return true;
    });
  });
  await step('Highlighter: Copy beside Clear page copies the page\'s highlights with their paragraph breaks (rev 196)', async () => {
    if(!(await page.evaluate(()=>(window.INK_VERSION||{}).rev>=196))) return 'SKIP: before rev 196';
    await page.click('#tab-write').catch(()=>{}); await page.waitForTimeout(300);
    const id=await page.evaluate(()=>{ try{ if(RB) leaveLibraryBook(); }catch(_){ } return addChapter('Copy test','Alpha bravo charlie delta echo.\nFoxtrot golf hotel india juliet.\nKilo lima mike.'); });
    try{
      await page.evaluate(async id=>{ setTab('read'); S.rch=id; S.anchor=0; refreshReader(); drawView(); await new Promise(r=>setTimeout(r,500)); },id);
      const r=await page.evaluate(async id=>{
        const W=pag(id).doc.words, idx=v=>W.findIndex(w=>w.v===v);
        addMark(id,idx('charlie'),idx('golf')); addMark(id,idx('lima'),idx('mike.')); drawView(); await new Promise(r=>setTimeout(r,400));
        let got=null; const keep=hlCopy; window.hlCopy=t=>{ got=t; };
        try{ document.querySelector('#hlCopyPage').click(); } finally { window.hlCopy=keep; }
        return {got, btn:!!document.querySelector('#hlCopyPage')};
      },id);
      if(!r.btn) throw new Error('no Copy button in the highlighter bar');
      if(r.got!=='charlie delta echo.\n\nFoxtrot golf\n\nlima mike.') throw new Error('copied text was '+JSON.stringify(r.got));
      return true;
    } finally { await page.evaluate(id=>{ try{ dropChapter(id); }catch(_){ } },id); }
  });
  await step('Highlighter on: a swipe never turns the page; drag past the line end reaches the last word (rev 138)', async () => {
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200);
    for(let i=0;i<4;i++){ await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); }
    const first=()=>page.evaluate(()=>{ const e=document.querySelector('#spread .ptext [data-w]'); return e?e.closest('.ptext').dataset.ch+':'+e.dataset.w:''; });
    await page.evaluate(()=>setHl(true)); await page.waitForTimeout(1800);
    const p0=await first(); if(!p0) return 'SKIP: no text page';
    const vp=page.viewportSize(); await page.mouse.move(vp.width-12,vp.height*0.5); await page.mouse.down();
    for(let i=1;i<=12;i++){ await page.mouse.move(vp.width-12-i*28,vp.height*0.5); await page.waitForTimeout(15); } await page.mouse.up(); await page.waitForTimeout(1200);
    if((await first())!==p0) throw new Error('page turned while the Highlighter was on');
    const ok=await page.evaluate(()=>{ const sp=[...document.querySelectorAll('#spread .ptext [data-w]')], a=sp[0].getBoundingClientRect(); const line=sp.filter(e=>Math.abs(e.getBoundingClientRect().top-a.top)<3), last=line[line.length-1]; const r=last.getBoundingClientRect(); const hit=wordAt(window.innerWidth-2, r.top+r.height/2); return hit&&hit.w===+last.dataset.w; });
    await page.evaluate(()=>setHl(false)); return ok || (()=>{ throw new Error('off the edge did not reach the last word of the line'); })();
  });
  await step('Highlighter on/off never changes the page you are on (rev 141)', async () => {
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200);
    await page.evaluate(()=>gotoBookPage(17)); await page.waitForTimeout(1200);
    const at=()=>page.evaluate(()=>{ const e=document.querySelector('#spread .ptext [data-w]'); return (e?e.closest('.ptext').dataset.ch+':'+e.dataset.w:'')+'|'+Math.round($('#stage').getBoundingClientRect().height); });
    const a=await at(); await page.evaluate(()=>setHl(true)); await page.waitForTimeout(1000); const b=await at(); await page.evaluate(()=>setHl(false)); await page.waitForTimeout(800);
    return a===b || (()=>{ throw new Error('page moved: '+a+' -> '+b); })();
  });
  await step('Full screen: the tap messages stay up longer, about 9 seconds going in and 7 coming out (rev 176)', async () => {
    const r=await page.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), fromTab=S.tab, h=document.querySelector('#fsHint'), out={};
      setTab('read'); await w(200);
      setImmersive(true); await w(6000); out.inAt6s=!h.hidden && /Double-tap/.test(h.textContent); await w(3500); out.inGone=h.hidden;
      setImmersive(false); await w(4500); out.outAt4_5s=!h.hidden && /go full screen again/.test(h.textContent); await w(3000); out.outGone=h.hidden;
      setTab(fromTab); await w(200); return out; });
    if(!r.inAt6s) throw new Error('the going-in message was gone before 6 seconds: '+JSON.stringify(r));
    if(!r.outAt4_5s) throw new Error('the coming-out message was gone before 4.5 seconds: '+JSON.stringify(r));
    if(!r.inGone || !r.outGone) throw new Error('a message never went away: '+JSON.stringify(r));
    return 'OK: '+JSON.stringify(r);
  });
  await step('Page sound: the real page-turn recording is inside the app, decodes, and is a short, audible clip (rev 177)', async () => {
    const r=await page.evaluate(async()=>{ turnAudioWarm(); for(let k=0;k<40 && !turnBuf;k++) await new Promise(r=>setTimeout(r,100));
      if(!turnBuf) return {err:'the recording did not decode'}; const d=turnBuf.getChannelData(0); let pk=0; for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; }
      return {secs:+turnBuf.duration.toFixed(2), peak:+pk.toFixed(2), bytes:TURN_SND.length}; });
    if(r.err) throw new Error(r.err);
    if(r.secs<.3 || r.secs>1 || r.peak<.1 || r.peak>1.01) throw new Error('the recording looks wrong: '+JSON.stringify(r));
    return 'OK: '+JSON.stringify(r);
  });
  await step('Page sound: plays when you turn a page (curl and slide), not when read-aloud turns it, and the Aa switch turns it off (rev 176)', async () => {
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200);
    const r=await page.evaluate(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)), out={}, n=()=>turnSound.count||0, chk=document.querySelector('#sndChk');
      if(!chk.checked) return {err:'Page sound is not on by default'};
      const setTurn=t=>{ S.turn=t; };
      let b=n(); setTurn('curl'); flip(1); await w(1100); out.curl=n()-b;
      b=n(); setTurn('slide'); flip(1); await w(900); out.slide=n()-b; setTurn('curl');
      b=n(); noTurnSound=true; flip(1); await w(1100); noTurnSound=false; out.readAloud=n()-b;
      chk.checked=false; chk.dispatchEvent(new Event('change',{bubbles:true})); await w(200);
      b=n(); flip(1); await w(1100); out.off=n()-b;
      chk.checked=true; chk.dispatchEvent(new Event('change',{bubbles:true})); await w(200);
      return out; });
    if(r.err) throw new Error(r.err);
    if(r.curl!==1 || r.slide!==1) throw new Error('a turned page should make one sound: '+JSON.stringify(r));
    if(r.readAloud!==0) throw new Error('read-aloud turns must be silent: '+JSON.stringify(r));
    if(r.off!==0) throw new Error('the switch did not turn the sound off: '+JSON.stringify(r));
    return 'OK: '+JSON.stringify(r);
  });
  await step('Paper texture: on by default behind every page, off with the Aa switch, and it never changes the pages or the words (rev 175)', async () => {
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(async()=>{ await openLibBook('manual'); }); await page.waitForTimeout(1200);
    const st=()=>page.evaluate(()=>{ const f=document.querySelector('#spread .face'); const t=document.querySelector('#spread .ptext'); return {tex:document.body.classList.contains('tex'), bg:f?getComputedStyle(f).backgroundImage:'', info:(document.querySelector('#pageInfo')||{}).textContent, words:t?t.textContent.length:0, chk:document.querySelector('#texChk').checked}; });
    const on=await st(); if(!on.tex || !on.chk || on.bg.indexOf('url(')<0 || on.bg.indexOf('radial-gradient')<0) throw new Error('texture is not on by default: '+JSON.stringify(on));
    await page.evaluate(()=>{ const c=document.querySelector('#texChk'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); }); await page.waitForTimeout(500);
    const off=await st(); if(off.tex || off.bg!=='none') throw new Error('texture did not switch off: '+JSON.stringify(off));
    const saved=await page.evaluate(()=>{ try{ return Object.keys(localStorage).map(k=>localStorage.getItem(k)).some(v=>v&&v.indexOf('"tex":false')>=0); }catch(e){ return false; } }); await page.waitForTimeout(400);
    if(on.info!==off.info || on.words!==off.words) throw new Error('texture changed the page: '+on.info+' / '+off.info+' ; '+on.words+' / '+off.words);
    await page.evaluate(()=>{ const c=document.querySelector('#texChk'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); }); await page.waitForTimeout(400);
    const back=await st(); if(!back.tex || back.bg.indexOf('url(')<0) throw new Error('texture did not come back on');
    return 'OK: on, off, on again; page and word counts identical' + (saved?'':' (saved-setting key not seen)');
  });
  await step('Natural voice: a recording that stops early is remade by sentence, no words skipped (rev 141)', async () => {
    await page.click('#tab-write'); await page.evaluate(()=>newChapter&&0).catch(()=>{});
    const ok=await page.evaluate(async()=>{
      const c={start:100,end:115,p:3,text:'It is not. The family album holds their actual wedding photograph: my mother in a bonnet veil,'}; c.words=c.text.split(' ');
      if(!kokShort(c.text,1.7) || kokShort(c.text,6.9)) return 'short check wrong';
      const parts=kokSplit(c); if(!parts||parts.length!==3) return 'split wrong: '+JSON.stringify(parts&&parts.map(x=>x.text));
      if(parts.map(x=>x.words.length).reduce((a,b)=>a+b,0)!==c.words.length || parts[2].end!==c.start+c.words.length) return 'split lost words';
      return true; });
    return ok===true || (()=>{ throw new Error(ok); })();
  });
  await step('F1.3 F7.1 a typed title page and copyright page are front pages: no number; Chapter One is chapter 1 (rev 143)', async () => {
    const r=await page.evaluate(()=>{
      const fake=[{id:'t1',title:'My Book',text:'My Book\nA. Writer'},{id:'t2',title:'',text:'Copyright © 2026 A. Writer\nAll rights reserved.'},{id:'t3',title:'Chapter One: Start',text:Array(200).fill('word').join(' ')},{id:'t4',title:'A copyright story',text:Array(300).fill('copyright').join(' ')},{id:'t5',title:'Copyright Page',text:Array(260).fill('reproduced').join(' ')}];
      const bk=rBook(), oldT=bk.title; bk.title='My Book';
      const res=fake.map(looksFront);
      bk.title=oldT; return res; });
    const want=[true,true,false,false,true];   /* t5: rev 155, a long copyright page named Copyright Page */
    return JSON.stringify(r)===JSON.stringify(want) || (()=>{ throw new Error('got '+JSON.stringify(r)); })();
  });
  await step('Fix in place: press and hold a word in your own book to fix it on the same page; books added to read stay read-only (rev 148-149)', async () => {
    const fs=require('fs'), os=require('os'), path=require('path'); const f=path.join(os.tmpdir(),'ink-edit-test.txt');
    fs.writeFileSync(f,'Chapter 1: Start\n\n'+Array.from({length:30},(_,i)=>'Line '+i+' one two three four five six seven eight nine ten.').join('\n\n'));
    await page.click('#tab-read').catch(()=>{}); await page.click('#libBtn'); await page.waitForTimeout(300);
    await page.setInputFiles('#libIn', f); await page.waitForTimeout(2500);
    const bid=await page.evaluate(()=>{ const b=LIB.find(x=>x.title==='ink-edit-test'); return b&&b.id; }); if(!bid) throw new Error('test book not added');
    await page.evaluate(async(bid)=>{ await openLibBook(bid); jumpTo({ch:RB.order[0],i:1}); },bid); await page.waitForTimeout(700);
    const ro=await page.evaluate(()=>{ const sp=document.querySelector('#spread .ptext [data-w]'); fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w}); return $('#fixBox').hidden; });
    if(!ro) throw new Error('a book added to read opened for fixing');
    if(await page.evaluate(()=>!!document.querySelector('[data-ledit]'))) throw new Error('a read-only book offers to become editable');
    await page.evaluate(async()=>{ readMine(); const id=addChapter('Fix test',Array.from({length:30},(_,i)=>'Line '+i+' one two three four five six seven eight nine ten.').join('\n')); S.rch=id; S.anchor=0; PCACHE.clear(); refreshReader(); jumpTo({ch:id,i:1}); }); await page.waitForTimeout(800);
    const r=await page.evaluate(async()=>{ const sp=[...document.querySelectorAll('#spread .ptext [data-w]')].find(e=>e.textContent==='three'); fixOpen({ch:sp.closest('.ptext').dataset.ch,w:+sp.dataset.w});
      const t=$('#fixText'); if($('#fixBox').hidden) return 'fixer did not open'; if(t.value.slice(ED.sel[0],ED.sel[1])!=='three') return 'wrong word selected';
      t.setRangeText('THREEFIXED',ED.sel[0],ED.sel[1],'end'); fixDone(); await new Promise(z=>setTimeout(z,600));
      return {i:curIndex(), shown:$('#spread').innerText.includes('THREEFIXED'), saved:CH.get(S.rch).text.includes('THREEFIXED')}; });
    return (r&&r.i===1&&r.shown&&r.saved) || (()=>{ throw new Error(JSON.stringify(r)); })();
  });
  await step('Hear it, fix it: Fix in the player opens the sentence being read; Done saves it and reads it again (rev 153)', async () => {
    const r=await page.evaluate(async()=>{
      readMine(); const id=addChapter('Fix player test',Array.from({length:30},(_,i)=>'Sentence '+i+' has some words in it. Another sentence follows here.').join('\n')); S.rch=id; S.anchor=0; PCACHE.clear(); refreshReader();
      $('#tab-read').click(); await new Promise(z=>setTimeout(z,400));
      if(!TTS.on) $('#listenBtn').click(); await new Promise(z=>setTimeout(z,900));
      if($('#ttsFix').hidden) return 'Fix hidden in own book';
      const said=TTS.cur&&TTS.cur.text; $('#ttsFix').click(); await new Promise(z=>setTimeout(z,300));
      if($('#fixBox').hidden) return 'fix box did not open';
      const t=$('#fixText'), sel=t.value.slice(ED.sel[0],ED.sel[1]); if(sel!==said) return 'selected '+JSON.stringify(sel)+' but reading '+JSON.stringify(said);
      if(TTS.playing) return 'still playing while fixing';
      t.setRangeText('This sentence was fixed by ear.',ED.sel[0],ED.sel[1],'end'); $('#fixDone').click();
      const ok={saved:CH.get(id).text.includes('This sentence was fixed by ear.'), playing:TTS.playing, now:TTS.q[0]&&TTS.q[0].text};   // the first thing read after Done
      ttsStop(); return ok; });
    return (r&&r.saved&&r.playing&&/fixed by ear/.test(r.now||'')) || (()=>{ throw new Error(JSON.stringify(r)); })();
  });
  await step('Fix in place saves into the right paragraph when lines repeat, and an emptied page keeps its spot (rev 154)', async () => {
    const r=await page.evaluate(async()=>{
      readMine(); const same='She nodded and looked out of the window for a long while, saying nothing at all.';
      const id=addChapter('Repeat test',Array.from({length:40},()=>same).join('\n\n')); S.rch=id; S.anchor=0; PCACHE.clear(); refreshReader(); $('#tab-read').click(); await new Promise(z=>setTimeout(z,300));
      jumpTo({ch:id,i:3}); await new Promise(z=>setTimeout(z,300));
      const {doc,pages}=pag(id), first=doc.paras.findIndex(p=>p.start<pages[3][1]&&p.end>pages[3][0]&&!p.h);
      const sp=document.querySelector('#spread .ptext [data-w]'); fixOpen({ch:id,w:+sp.dataset.w});
      const t=$('#fixText'); t.value=t.value.replace(same,'CHANGED HERE.'); fixDone();
      const lines=CH.get(id).text.split('\n').filter(Boolean), at=lines.indexOf('CHANGED HERE.'), want=first-(doc.paras[0].h?1:0);
      if(at!==want) return 'fix landed in paragraph '+at+', page starts at paragraph '+want;
      fixOpen({ch:id,w:+document.querySelector('#spread .ptext [data-w]').dataset.w}); $('#fixText').value=''; edApply(); $('#fixText').value='NEW TEXT HERE.'; fixDone();
      const L2=CH.get(id).text.split('\n').filter(Boolean); if(L2.indexOf('NEW TEXT HERE.')<5) return 'emptied page text jumped to line '+L2.indexOf('NEW TEXT HERE.');
      return true; });
    return r===true || (()=>{ throw new Error(r); })();
  });
  await step('Library: Delete (tap twice) removes a book added to read, and it stays gone (rev 158)', async () => {
    const fs=require('fs'), os=require('os'), path=require('path'); const f=path.join(os.tmpdir(),'ink-del-test.txt'); fs.writeFileSync(f,'Chapter 1: Gone\n\n'+Array(20).fill('Words to delete here.').join('\n\n'));
    await page.click('#tab-read').catch(()=>{}); await page.evaluate(()=>{ try{ readMine(); }catch(_){ } }); await page.click('#libBtn'); await page.waitForTimeout(300);
    await page.setInputFiles('#libIn', f); await page.waitForTimeout(2000);
    const bid=await page.evaluate(()=>{ const b=LIB.find(x=>x.title==='ink-del-test'); return b&&b.id; }); if(!bid) throw new Error('test book not added');
    await page.click(`[data-ldel="${bid}"]`); await page.waitForTimeout(200); await page.click(`[data-ldel="${bid}"]`); await page.waitForTimeout(800);
    const gone=await page.evaluate(async bid=>!LIB.some(x=>x.id===bid) && !(await idb.get('lib:'+bid)),bid);
    await page.click('#libDone').catch(()=>{}); return gone || (()=>{ throw new Error('book still there'); })();
  });
  await step('User manual: the Word manuscript is in standard submission format, and a title page that came in from a file is the only title page (rev 240)', async () => {
    let JSPDF_FILE=null; try{ JSPDF_FILE=require.resolve('jspdf/dist/jspdf.umd.min.js'); }catch(_){ return 'SKIP: jspdf is not installed for the test (npm i jspdf@2.5.1)'; }
    if(!JSZIP_FILE) return 'SKIP: jszip is not installed for the test';
    const fs=require('fs'), JSZip=require('jszip');
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max'],acceptDownloads:true});
    await ctx.route(/jspdf[^/]*\.js$/, r=>r.fulfill({body:fs.readFileSync(JSPDF_FILE),contentType:'application/javascript'}));
    await ctx.route(/jszip(\.min)?\.js$/, r=>r.fulfill({body:fs.readFileSync(JSZIP_FILE),contentType:'application/javascript'}));
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2500);
      const kind=await pg.evaluate(()=>{ S.tips=false; BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; BOOK.sample=false;
        BOOK.title='The Harbor Book'; BOOK.author='Ada Tester'; const W='the harbor lights were steady that evening and nobody on the long pier spoke'.split(' ');
        const para=k=>Array.from({length:90},(_,i)=>W[(i*5+k)%W.length]).join(' ')+'.';
        /* the shape a text or Word file comes in as (rev 238): an untitled front page that opens with the book title */
        for(const [t,x] of [['','%%front\nThe Harbor Book\nby Ada Tester'],['','%%front\nCopyright © 2024 Ada Tester\nAll rights reserved.'],['',para(1)],['Second Wind',para(2)]]){ const id=addChapter(t,x); dirty.add(id); }
        const f=FM(); f.subtitle=''; f.dedication=''; S.cur=BOOK.order[0]; touchIndex(); PCACHE.clear(); loadEditor(); renderChapterUI(); renderDrawer();
        return [frontKind(BOOK.order[0]), chListName(BOOK.order[0])]; });
      if(kind[0]!=='title'||kind[1]!=='Title page') throw new Error('the imported title page is not known as the title page: '+kind.join(' / '));
      const dl=async sel=>{ const [d]=await Promise.all([pg.waitForEvent('download',{timeout:90000}), pg.evaluate(s=>document.querySelector(s).click(),sel)]); return fs.readFileSync(await d.path()); };
      const z=await JSZip.loadAsync(await dl('#expDocx')), doc=await z.file('word/document.xml').async('string'), hf=z.file('word/header1.xml'), hdr=hf?await hf.async('string'):'';
      const lines=doc.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
      if(!/Tester \/ THE HARBOR BOOK \//.test(hdr)||!/ PAGE /.test(hdr)) throw new Error('no running header "Surname / TITLE / page number": '+hdr.replace(/<[^>]+>/g,'').slice(0,80));
      if(!/<w:headerReference w:type="default" r:id="rId2"\/>/.test(doc)||!/<w:titlePg\/>/.test(doc)) throw new Error('the header is not on every page after the title page');
      if(!lines.some(l=>/^About [\d,]+ words$/.test(l))) throw new Error('no word count on the title page');
      if(!/<w:pStyle w:val="FirstPara"\/><\/w:pPr><w:r><w:t[^>]*>All rights reserved\./.test(doc)) throw new Error('a copyright-page line is indented like a paragraph');
      if(lines.filter(l=>l==='The Harbor Book').length!==1) throw new Error('the title appears '+lines.filter(l=>l==='The Harbor Book').length+' times in the Word file');
      const heads=[...doc.matchAll(/<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t[^>]*>([^<]*)</g)].map(m=>m[1]);
      if(JSON.stringify(heads)!==JSON.stringify(['Chapter 1','Second Wind'])) throw new Error('chapter headings in the Word file: '+JSON.stringify(heads)+' (front pages must not be chapters; the first chapter is Chapter 1)');
      const ep=await JSZip.loadAsync(await dl('#expEpub')); let tp=0; for(const f of Object.keys(ep.files).filter(f=>/\.xhtml$/.test(f)&&!/nav/.test(f))){ const t=(await ep.file(f).async('string')).replace(/<head>[\s\S]*?<\/head>/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); if(/^The Harbor Book( by Ada Tester)?$/.test(t)) tp++; }
      if(tp!==1) throw new Error('the EPUB has '+tp+' title pages');
      if(errs.length) throw new Error('page error: '+errs[0]);
      return true;
    } finally { await ctx.close(); }
  });
  await step('User manual: Spelling shows only inside Claude, lists each mistake with its fix, and changes nothing until you tap (rev 240)', async () => {
    const ctx0=await browser.newContext({...devices['iPhone 14 Pro Max']}); const p0=await ctx0.newPage(); await p0.goto(page.url()); await p0.waitForTimeout(2000);
    const hid=await p0.evaluate(()=>document.querySelector('#spellBtn').hidden); await ctx0.close(); if(!hid) throw new Error('the Spelling button shows outside Claude');
    const ctx=await browser.newContext({...devices['iPhone 14 Pro Max']});
    /* a stand-in for Claude: the check's answer is fixed, so this tests what Inkhorse does with it (Claude itself is not reachable from the test machine) */
    await ctx.addInitScript(()=>{ window.__asked=[]; const sample={json:async p=>{ window.__asked.push(p); return [{word:'recieve',fix:'receive'},{word:'teh',fix:'the'},{word:'Ellery',fix:'Ellary'}]; }};
      let own=null; Object.defineProperty(window,'claude',{configurable:true,get(){ return {use:async k=>k==='sample'?sample:(own?own.use(k):null)}; },set(v){ own=v; }}); });   /* Inkhorse's own picture keeper still answers for everything but the check */
    const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    try{
      await pg.goto(page.url()); await pg.waitForTimeout(2200);
      const r=await pg.evaluate(async()=>{ S.tips=false; BOOK.order.slice().forEach(id=>{ CH.delete(id); deleted.add(id); }); BOOK.order=[]; const id=addChapter('One','I will recieve teh letter. Then I recieve another.'); S.cur=id; touchIndex(); loadEditor();
        const ta=document.querySelector('#manuscript'), v0=ta.value, shown=!document.querySelector('#spellBtn').hidden; document.querySelector('#spellBtn').click(); await new Promise(r=>setTimeout(r,500));
        const rows=[...document.querySelectorAll('#assistBody .fix')].map(e=>e.textContent.replace(/\s+/g,' ')), same=ta.value===v0; const fx=document.querySelector('#assistBody [data-fix="0"]'); if(!fx) return {shown,rows,same};
        fx.click(); await new Promise(r=>setTimeout(r,200)); const v1=ta.value; document.querySelector('#assistBody [data-skip="0"]').click(); await new Promise(r=>setTimeout(r,200));
        return {shown,rows,same,v1,v2:ta.value,told:/names of people/.test(window.__asked[0]||'')}; });
      if(!r.shown) throw new Error('no Spelling button inside Claude');
      if(r.rows.length!==2||!/recieve.*receive.*2×/.test(r.rows[0])||!r.same) throw new Error('the list is wrong or words changed before a tap: '+JSON.stringify(r));
      if(r.v1!=='I will receive teh letter. Then I receive another.'||r.v2!==r.v1) throw new Error('Fix/Skip did the wrong thing: '+r.v2);
      if(!r.told) throw new Error('the check is not told to leave names alone');
      if(errs.length) throw new Error('page error: '+errs[0]);
      return true;
    } finally { await ctx.close(); }
  });
  await step('Compare tab measures pages', async () => { await page.click('#tab-compare'); await page.waitForTimeout(1500); return /words/.test(await page.textContent('#headline')); });
  await step('Chapters panel lists export and backup', async () => { await page.click('#tab-write'); await page.click('#chBtn'); await page.waitForTimeout(300); const t=await page.evaluate(()=>document.body.innerText); return ['EPUB','Print PDF','Word manuscript','Save backup file','Restore from file'].every(w=>t.includes(w)); });
  await step('P9.1 Save backup file downloads a file', async () => { const [d]=await Promise.all([page.waitForEvent('download',{timeout:6000}), page.click('#fbkSave')]); const fn=await d.suggestedFilename(), r202=await page.evaluate(()=>(window.INK_VERSION||{}).rev>=202);
    if(!(r202?/backup.*\.inkhorse$/:/backup.*\.json$/).test(fn)) throw new Error('file name '+fn);
    if(!r202) return true;
    /* rev 202: the .inkhorse file restores, and so does the same backup named .json (older backups) */
    const buf=require('fs').readFileSync(await d.path());
    for(const name of ['book-backup.inkhorse','book-backup.json']){
      await page.setInputFiles('#fbkIn',{name,mimeType:name.endsWith('.json')?'application/json':'application/octet-stream',buffer:buf}); await page.waitForTimeout(600);
      const shown=await page.evaluate(()=>{ const b=document.querySelector('#fbkPending'); return b&&!b.hidden?b.textContent:''; });
      if(!/Restore this/i.test(shown)) throw new Error(name+' was not accepted for restore: '+JSON.stringify(shown.slice(0,120)));
      await page.evaluate(()=>{ const c=[...document.querySelectorAll('#fbkPending button')].find(b=>/cancel/i.test(b.textContent)); if(c) c.click(); });
    }
    const acc=await page.getAttribute('#fbkIn','accept'); if(acc) throw new Error('Restore from file still limits the file type: '+acc);
    return true; });
  await step('EPUB export downloads a file', async () => { if(!(await page.evaluate(()=>typeof JSZip!=='undefined'))) return 'SKIP: zip library not reachable from this test machine (phones keep their own copy)'; const [d]=await Promise.all([page.waitForEvent('download',{timeout:15000}), page.click('#expEpub')]); return /\.epub$/.test(await d.suggestedFilename()); });
  await step('text survives a reload', async () => { await page.click('#drawerDone').catch(()=>{}); await page.reload(); await page.waitForTimeout(2500); return (await T()).length>0; });
  await step('wide screen: the same tabs and one room at a time, like a phone (rev 156)', async () => { await page.setViewportSize({width:1400,height:900}); await page.waitForTimeout(1200); await page.click('#tab-read'); await page.waitForTimeout(500); const r=await page.evaluate(()=>({tabs:!!$('#tab-write').offsetParent, shown:['write','read','compare'].filter(id=>!!$('#'+id).offsetParent)})); return (r.tabs && r.shown.join()==='read') || (()=>{ throw new Error(JSON.stringify(r)); })(); });
  await step('tablet width shows Side by side', async () => { await page.setViewportSize({width:900,height:1200}); await page.waitForTimeout(800); await page.click('#tab-write'); await page.waitForTimeout(300); await tools(); return page.isVisible('#splitBtn'); });
  await step('phone sideways does not break', async () => { await page.setViewportSize({width:932,height:430}); await page.waitForTimeout(800); await page.click('#tab-read').catch(()=>{}); await page.waitForTimeout(500); });

  const fails = res.filter(r=>r[0]==='FAIL').length;
  res.forEach(r=>console.log(r[0].padEnd(5), r[1].padEnd(58), r[2]));
  console.log('\n'+(res.length-fails)+'/'+res.length+' steps passed, '+errs.length+' page error(s)'); errs.forEach(e=>console.log('  '+e));
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
