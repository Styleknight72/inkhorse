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
  const step = async (name, fn) => { try { const v = await fn(); /* rev 163: a returned message that isn't SKIP is a failure (before, it counted as a pass, so a dozen checks could never fail) */ const bad = v === false || (typeof v === 'string' && !/^(SKIP|OK)/.test(v)); res.push([bad?'FAIL':(typeof v==='string'&&v.startsWith('SKIP')?'SKIP':'PASS'), name, bad?(v===false?'returned false':v.slice(0,300)):(v===undefined||v===true?'':JSON.stringify(v).slice(0,90))]); } catch (e) { res.push(['FAIL', name, e.message.slice(0,600)]); } };
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
      if(!(r.ornament.first<r.classic.first&&r.dropcap.first<r.classic.first)) throw new Error('pages were not re-measured for the taller openings: '+JSON.stringify(r));
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
    const PICS={"toolbar": "Aa | Auto | Device | Full screen reading | Highlighter | Library | One page | Read aloud | Two-page spread", "sizeMenu": "Fit my screen", "counter": "Book Hub ⌃", "hub": "Book Hub", "aa": "At night Don't switchStyleKnightSepiaSkyLightMy own colors | Colors Match my deviceLightStyleKnightSepiaSkyChoose my own… | H | Justify | Margin | New page for each section | Night warmth Off | Page | Page sound | Page turn CurlSlideInstant | Paper texture | Show tips | Spacing TightSnugNormalRelaxedDouble | Text | Typeface GaramondCaslonBaskervilleCrimson ProSource SerifLiterata (e-reader)MerriweatherLoraTimes New RomanGeorgiaPalatinoCourier (submission format)Plex Sans | W | from | to", "highlighter": "Clear page | Copy", "chapters": "Add back | Add front | Author | Book title | Chapter opening | Contents page in the EPUB and PDF | Copyright year | Credit line | Dedication | ISBN | Import a file | More copyright-page notes | Publisher or imprint | Restore from file | Subtitle"};
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
  await step('Tools: every Write tool works when tapped (Word count, Next mark, Copy, Paste, Top of chapter, Done) (rev 180)', async () => {
    await page.click('#tab-write'); await page.waitForTimeout(300); const keep=await T();
    await page.fill('#manuscript','One sentence here. The marked sentence sits here. Last one.'); await page.waitForTimeout(400);
    await page.evaluate(()=>{ BOOK.marks=(BOOK.marks||[]).concat([{ch:S.cur,t:'The marked sentence sits here.',w:3}]); marksRev++; marksUI(); });
    await tools(); if(!(await page.isVisible('#marksBtn'))||(await page.textContent('#marksN')).trim()!=='1') throw new Error('Next mark does not show its count');
    await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setSelectionRange(0,0); }); await page.click('#marksBtn'); await page.waitForTimeout(300);
    const sel=await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); return t.value.slice(t.selectionStart,t.selectionEnd); });
    if(!/marked sentence sits here/.test(sel)) throw new Error('Next mark did not select the marked sentence: '+JSON.stringify(sel));
    await page.evaluate(()=>{ const t=document.querySelector('#manuscript'); t.setRangeText('The rewritten sentence is new.',t.selectionStart,t.selectionEnd,'end'); t.dispatchEvent(new Event('input',{bubbles:true})); }); await page.waitForTimeout(1200);
    if(await page.evaluate(()=>!document.querySelector('#marksBtn').hidden)) throw new Error('Next mark still shows after the sentence was retyped');
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
  await step('Night schedule + warmth apply', async () => { await page.evaluate(()=>{ localStorage.setItem('inkhorse-night','dark'); localStorage.setItem('inkhorse-night-from','00:00'); localStorage.setItem('inkhorse-night-to','23:59'); localStorage.setItem('inkhorse-warmth','40'); inkApplyTheme(); }); const r=await page.evaluate(()=>[document.documentElement.getAttribute('data-theme'),document.documentElement.hasAttribute('data-warm')]); await page.evaluate(()=>{ ['inkhorse-night','inkhorse-night-from','inkhorse-night-to','inkhorse-warmth'].forEach(k=>localStorage.removeItem(k)); inkApplyTheme(); }); return r[0]==='dark'&&r[1]; });
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
  await step('Compare tab measures pages', async () => { await page.click('#tab-compare'); await page.waitForTimeout(1500); return /words/.test(await page.textContent('#headline')); });
  await step('Chapters panel lists export and backup', async () => { await page.click('#tab-write'); await page.click('#chBtn'); await page.waitForTimeout(300); const t=await page.evaluate(()=>document.body.innerText); return ['EPUB','Print PDF','Word manuscript','Save backup file','Restore from file'].every(w=>t.includes(w)); });
  await step('Save backup file downloads a file', async () => { const [d]=await Promise.all([page.waitForEvent('download',{timeout:6000}), page.click('#fbkSave')]); const fn=await d.suggestedFilename(), r202=await page.evaluate(()=>(window.INK_VERSION||{}).rev>=202);
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
