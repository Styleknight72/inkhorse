/* Writes the two standards into the app as built-in books: const STANDARD (The Inkhorse Formatting Standard) and const PUBLISHING (The Inkhorse Publishing Standard).
   It opens the html, runs each e-book in docs/ through Inkhorse's own e-book importer (so the built-in copy is exactly what a reader would get
   by adding the e-book), and writes the result back into the html.
   Use:  NODE_PATH=... node tools/embed-standard.js preview/next.html
   Run it again whenever docs/FORMATTING-STANDARD.md or docs/PUBLISHING-STANDARD.md changes (after rebuilding that e-book). */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const { chromium } = require('playwright');
const BOOKS=[
  {name:'STANDARD',id:'standard',pre:'std-',epub:'Inkhorse Formatting Standard.epub',cover:'formatting-standard-cover.jpg'},
  {name:'PUBLISHING',id:'publishing',pre:'pub-',epub:'Inkhorse Publishing Standard.epub',cover:'publishing-standard-cover.jpg'}
];
(async()=>{
  const file=path.resolve(process.argv[2]||'preview/next.html'), root=path.resolve(__dirname,'..');
  const b=await chromium.launch(), p=await b.newPage(); await p.goto('file://'+file); await p.waitForFunction(()=>typeof epubToBook==='function'&&window.JSZip,null,{timeout:60000});
  let h=fs.readFileSync(file,'utf8');
  for(const B of BOOKS){
    const epub=fs.readFileSync(path.join(root,'docs',B.epub)).toString('base64'), cover=fs.readFileSync(path.join(root,'docs',B.cover)).toString('base64');
    const r=await p.evaluate(async({epub,cover})=>{
      const buf=Uint8Array.from(atob(epub),c=>c.charCodeAt(0)).buffer; const bk=await epubToBook(buf);
      const im=new Image(); im.src='data:image/jpeg;base64,'+cover; await im.decode();
      const cv=document.createElement('canvas'); cv.width=800; cv.height=1200; const g=cv.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(im,0,0,800,1200);
      return {title:bk.title,author:bk.author,chapters:bk.chapters.map(c=>({title:c.title,text:c.text})),cover:cv.toDataURL('image/jpeg',0.86)};
    },{epub,cover});
    const ver=B.pre+crypto.createHash('md5').update(JSON.stringify([r.title,r.chapters,r.cover.length])).digest('hex').slice(0,10), ck=B.id+'-cover';
    const S={id:B.id,ver,title:r.title,author:r.author,coverFront:ck,cover:r.cover,images:{[ck]:{w:800,h:1200}},chapters:r.chapters};
    const i=h.indexOf('const '+B.name+'={'); if(i<0) throw new Error('no '+B.name+' line'); const j=h.indexOf('\n',i);
    h=h.slice(0,i)+'const '+B.name+'='+JSON.stringify(S).replace(/</g,'\\u003c')+';'+h.slice(j);
    console.log(B.name,ver,r.title,'|',r.chapters.length,'chapters:',r.chapters.map(c=>c.title).join(' / '));
  }
  await b.close(); fs.writeFileSync(file,h);
})().catch(e=>{ console.error(e); process.exit(1); });
