const {chromium,say,mk,book,para,fs,S,REPO}=require('./common.js');
const JSZip=require('jszip'); let pdfjs; { const w=console.warn,l=console.log; console.warn=console.log=()=>{}; pdfjs=require(require('path').join(process.env.PDFJS_DIR,'..','legacy','build','pdf.js')); console.warn=w; console.log=l; }
const dl=async(pg,sel)=>{ const [d]=await Promise.all([pg.waitForEvent('download',{timeout:60000}), pg.evaluate(s=>document.querySelector(s).click(),sel)]); return fs.readFileSync(await d.path()); };
const readPdf=async raw=>{ const doc=await pdfjs.getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise, pages=[]; for(let n=1;n<=doc.numPages;n++){ const p=await doc.getPage(n), tc=await p.getTextContent(); pages.push({n,text:tc.items.map(i=>i.str).join(' ').replace(/\s+/g,' ')}); } return pages; };
const readZip=async raw=>{ const z=await JSZip.loadAsync(raw), o={files:Object.keys(z.files)}; for(const f of o.files) if(/\.(xhtml|opf|xml|rels)$/.test(f)) o[f]=await z.file(f).async('string'); return o; };
(async()=>{ const b=await chromium.launch();
 const pg=await mk(b,'iPhone 14 Pro Max');
 // the shape importSkeleton makes from a text/Word file: untitled front page opening with the book title
 await book(pg,[['','%%front\nThe Harbor Book\nby Ada Tester'],['','%%front\nCopyright © 2024 Ada Tester\nAll rights reserved.'],['',para(1,90)],['Second Wind',para(2,90)]]);
 await pg.evaluate(()=>{ BOOK.title='The Harbor Book'; BOOK.author='Ada Tester'; const f=FM(); f.subtitle=''; f.dedication=''; touchIndex(); renderDrawer(); });
 const kind=await pg.evaluate(()=>[frontKind(BOOK.order[0]),chListName(BOOK.order[0])]);
 say(kind[0]==='title'&&kind[1]==='Title page'?'OK':'FAULT','YB-26f','an imported title page (untitled, opens with the book title) is known as the title page: '+kind.join(' / '));
 const pdf=await readPdf(await dl(pg,'#expPdf')), ep=await readZip(await dl(pg,'#expEpub')), dx=await readZip(await dl(pg,'#expDocx'));
 const tps=pdf.filter(p=>/^The Harbor Book( by Ada Tester)?$/.test(p.text.trim()));
 const X=Object.keys(ep).filter(f=>/\.xhtml$/.test(f)&&!/nav/.test(f)).map(f=>ep[f].replace(/<head>[\s\S]*?<\/head>/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
 const eTitle=X.filter(t=>/^The Harbor Book( by Ada Tester)?$/.test(t));
 const d=dx['word/document.xml'].replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,''); const lines=d.split('\n').map(x=>x.trim()).filter(Boolean);
 say(tps.length===1&&eTitle.length===1&&lines.filter(l=>l==='The Harbor Book').length===1?'OK':'FAULT','YB-26g','one title page in print, EPUB and Word: print '+tps.length+', EPUB '+eTitle.length+', Word '+lines.filter(l=>l==='The Harbor Book').length+' | print p1-3: '+pdf.slice(0,3).map(p=>p.text.slice(0,40)).join(' || '));
 const hdr=dx['word/header1.xml']||'', doc=dx['word/document.xml'];
 say(/Tester \/ THE HARBOR BOOK \//.test(hdr)&&/ PAGE /.test(hdr)&&/<w:titlePg\/>/.test(doc)&&/headerReference/.test(doc)?'OK':'FAULT','YB-38b','Word header "Tester / THE HARBOR BOOK / page" on every page but the first');
 say(/^About [\d,]+ words$/.test(lines.find(l=>/words$/.test(l))||'')?'OK':'FAULT','YB-38c','word count on the title page: '+(lines.find(l=>/words$/.test(l))||'none'));
 const heads=[...doc.matchAll(/<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t[^>]*>([^<]*)</g)].map(m=>m[1]);
 say(JSON.stringify(heads)===JSON.stringify(['Chapter 1','Second Wind'])?'OK':'FAULT','YB-38d','front pages are not labelled as chapters and chapters count from 1: '+JSON.stringify(heads));
 // validate docx opens: convert with LibreOffice if present
 fs.writeFileSync(S+'/t.docx',await dl(pg,'#expDocx'));
 if(pg.errs.length) say('FAULT','x','page error: '+pg.errs[0]);
 await b.close(); })();
