/* rev 269: a stand-in for Meilin's voice helper (a Web Worker), used by p13.js. Runs in the page before Inkhorse loads (mk(...,{init:FAKEW})). */
const FAKEW=()=>{ window.__wk=[]; window.__hw=8; window.__coi=true; window.__wmode=window.__wmode||'answer'; window.__held=[]; window.__loadMode='ready';
  try{ Object.defineProperty(Navigator.prototype,'hardwareConcurrency',{get(){ return window.__hw; },configurable:true}); }catch(_){ }
  try{ const real=Object.getOwnPropertyDescriptor(window,'crossOriginIsolated')||Object.getOwnPropertyDescriptor(Window.prototype,'crossOriginIsolated'); Object.defineProperty(window,'crossOriginIsolated',{get(){ return window.__coiReal?(real&&real.get?real.get.call(window):false):window.__coi; },configurable:true}); }catch(_){ }
  try{ const m=JSON.parse(localStorage.getItem('inkhorse-test-mode')||'{}'); if(m.load) window.__loadMode=m.load; if(m.coiReal) window.__coiReal=true; }catch(_){ }
  /* a real, playable WAV of silence, as long as the sentence would take (8 kHz, 16-bit, mono) */
  window.__wav=secs=>{ const n=Math.round(8000*secs), b=new ArrayBuffer(44+n*2), d=new DataView(b), w=(o,t)=>{ for(let i=0;i<t.length;i++) d.setUint8(o+i,t.charCodeAt(i)); };
    w(0,'RIFF'); d.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); d.setUint32(16,16,true); d.setUint16(20,1,true); d.setUint16(22,1,true); d.setUint32(24,8000,true); d.setUint32(28,16000,true); d.setUint16(32,2,true); d.setUint16(34,16,true); w(36,'data'); d.setUint32(40,n*2,true); return b; };
  class FW{ constructor(){ this.msgs=[]; window.__wk.push(this); }
    postMessage(m){ this.msgs.push(m); const me=this, send=d=>setTimeout(()=>{ me.onmessage&&me.onmessage({data:d}); },15);
      if(m.type==='load'){ if(window.__loadMode==='ready') send({type:'ready'}); }
      else if(m.type==='ping') send({type:'pong'});
      else if(m.type==='say'){ const secs=Math.max(1,Math.min(4,(m.text||'').length/14)), d={type:'clip',id:m.id,wav:window.__wav(secs),secs,ms:20}; if(window.__wmode==='hold') window.__held.push(()=>send(d)); else send(d); } }
    terminate(){} addEventListener(){} removeEventListener(){} }
  window.Worker=FW; window.__release=()=>{ window.__wmode='answer'; const h=window.__held.splice(0); h.forEach(f=>f()); }; };
module.exports={FAKEW};
