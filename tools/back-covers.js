/* Draws the back covers of the three books that come with Inkhorse (tools/back-cover.html) and writes them into the app (const BACKCOV).
   Use:  NODE_PATH=... node tools/back-covers.js preview/next.html   (also saves the three back-cover JPEGs in docs/) */
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const COVERS={
  'manual-back':{out:'docs/manual-back-cover.jpg',quote:'Say it. Hear it.<br>Fix it. Publish it.',
    body:['Inkhorse is a free app for writing a book, a story or a journal on your phone, tablet or computer.','You write page by page, flip through it like a printed book, and listen to it read aloud. This manual shows what every button does, with pictures.']},
  'standard-back':{out:'docs/formatting-standard-back-cover.jpg',quote:'Every book in Inkhorse should look like it was set by the same careful publisher.',
    body:['This is that publisher’s rulebook: how a chapter opens, how a paragraph sits, the small marks of punctuation, the contents page, e-books and print.','Every rule has a number, so a page that looks wrong can be traced to the rule that broke.']},
  'publishing-back':{out:'docs/publishing-standard-back-cover.jpg',quote:'When you carry your book out the door, it is ready.',
    body:['Inkhorse does not publish your book. You do, under your own name. This standard says what “ready to publish” means: a whole book, heard start to finish, with sound files and a cover a store will take.','It also says plainly what Inkhorse checks for you, what is yours to check, and what Inkhorse cannot do yet.']}
};
(async()=>{ const file=path.resolve(process.argv[2]||'preview/next.html'), root=path.resolve(__dirname,'..');
  const tpl=fs.readFileSync(path.join(__dirname,'back-cover.html'),'utf8'), tmp=path.join(__dirname,'_back_tmp.html');
  const b=await chromium.launch(), out={};
  for(const [id,c] of Object.entries(COVERS)){
    fs.writeFileSync(tmp,tpl.replace('{{QUOTE}}',c.quote).replace('{{BODY}}',c.body.map(t=>`<div class="p">${t}</div>`).join('\n')));
    const p=await b.newPage({viewport:{width:1600,height:2400}}); await p.goto('file://'+tmp); await p.waitForTimeout(400);
    fs.writeFileSync(path.join(root,c.out),await p.screenshot({type:'jpeg',quality:92}));
    const small=await b.newPage({viewport:{width:800,height:1200},deviceScaleFactor:1}); await small.setContent(`<body style="margin:0"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(root,c.out)).toString('base64')}" style="width:800px;height:1200px;display:block">`); await small.waitForTimeout(300);
    out[id]='data:image/jpeg;base64,'+(await small.screenshot({type:'jpeg',quality:86})).toString('base64'); await p.close(); await small.close(); }
  await b.close(); fs.unlinkSync(tmp);
  let h=fs.readFileSync(file,'utf8'); const i=h.indexOf('const BACKCOV={'); if(i<0) throw new Error('no BACKCOV line'); const j=h.indexOf('\n',i);
  h=h.slice(0,i)+'const BACKCOV='+JSON.stringify(out)+';'+h.slice(j); fs.writeFileSync(file,h); console.log(Object.keys(out).map(k=>k+' '+Math.round(out[k].length/1024)+'KB').join(', '));
})().catch(e=>{ console.error(e); process.exit(1); });
