// node tools/render-cover.js "1.1 candidate" 75 "October 2026" out.png
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async () => { const [rel,rev,month,out]=process.argv.slice(2);
  let html=fs.readFileSync(path.join(__dirname,'manual-cover.html'),'utf8').replaceAll('{{RELEASE}}',rel).replaceAll('{{REV}}',rev).replaceAll('{{MONTH}}',month);
  const tmp=path.join(__dirname,'_cover_tmp.html'); fs.writeFileSync(tmp,html);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:2400}});
  await p.goto('file://'+tmp); await p.waitForTimeout(300); await p.screenshot({path:out}); await b.close(); fs.unlinkSync(tmp); })();
