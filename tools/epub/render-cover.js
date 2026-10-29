// node tools/epub/render-cover.js "KICKER" "Title line" "subtitle<br>line two" "EDITION LINE" out.jpg.png
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const [k,t2,sub,ed,out]=process.argv.slice(2);
 const html=fs.readFileSync(path.join(__dirname,'doc-cover.html'),'utf8').replace('{{KICKER}}',k).replace('{{TITLE2}}',t2).replace('{{SUB}}',sub).replace('{{EDITION}}',ed);
 const tmp=path.join(__dirname,'_cover_tmp.html'); fs.writeFileSync(tmp,html); fs.copyFileSync(path.join(__dirname,'..','manual-lockup.png'),path.join(__dirname,'manual-lockup.png'));
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1600,height:2400}}); await p.goto('file://'+tmp); await p.waitForTimeout(400); await p.screenshot({path:out}); await b.close(); fs.unlinkSync(tmp); fs.unlinkSync(path.join(__dirname,'manual-lockup.png')); })();
