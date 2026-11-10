/* Writes The Inkhorse Formatting Standard into the app as a built-in book (const STANDARD).
   It opens the html, runs docs/Inkhorse Formatting Standard.epub through Inkhorse's own e-book importer (so the built-in copy
   is exactly what a reader would get by adding the e-book), and writes the result back into the html.
   Use:  NODE_PATH=... node tools/embed-standard.js preview/next.html
   Run it again whenever docs/FORMATTING-STANDARD.md changes (after rebuilding the e-book). */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const { chromium } = require('playwright');
(async()=>{
  const file=path.resolve(process.argv[2]||'preview/next.html'), root=path.resolve(__dirname,'..');
  const epub=fs.readFileSync(path.join(root,'docs','Inkhorse Formatting Standard.epub')).toString('base64');
  const cover=fs.readFileSync(path.join(root,'docs','formatting-standard-cover.jpg')).toString('base64');
  const b=await chromium.launch(), p=await b.newPage(); await p.goto('file://'+file); await p.waitForFunction(()=>typeof epubToBook==='function'&&window.JSZip,null,{timeout:60000});
  const r=await p.evaluate(async({epub,cover})=>{
    const buf=Uint8Array.from(atob(epub),c=>c.charCodeAt(0)).buffer; const bk=await epubToBook(buf);
    const im=new Image(); im.src='data:image/jpeg;base64,'+cover; await im.decode();
    const cv=document.createElement('canvas'); cv.width=800; cv.height=1200; const g=cv.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(im,0,0,800,1200);
    return {title:bk.title,author:bk.author,chapters:bk.chapters.map(c=>({title:c.title,text:c.text})),cover:cv.toDataURL('image/jpeg',0.86)};
  },{epub,cover});
  await b.close();
  const ver='std-'+crypto.createHash('md5').update(JSON.stringify([r.title,r.chapters,r.cover.length])).digest('hex').slice(0,10);
  const S={id:'standard',ver,title:r.title,author:r.author,coverFront:'standard-cover',cover:r.cover,images:{'standard-cover':{w:800,h:1200}},chapters:r.chapters};
  let h=fs.readFileSync(file,'utf8'); const i=h.indexOf('const STANDARD={'); if(i<0) throw new Error('no STANDARD line'); const j=h.indexOf('\n',i);
  h=h.slice(0,i)+'const STANDARD='+JSON.stringify(S).replace(/</g,'\\u003c')+';'+h.slice(j); fs.writeFileSync(file,h);
  console.log(ver,r.title,'|',r.author,'|',r.chapters.length,'chapters:',r.chapters.map(c=>c.title).join(' / '));
})().catch(e=>{ console.error(e); process.exit(1); });
