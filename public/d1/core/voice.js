/* WATARI · voice layer for Demo 1 (loaded by call.js on every page; mic + STT only on the phone)
   TTS : POST /api/tts (Soniox, male voice) -> blob URL, played on ONE reusable <audio>; levels from the decoded
         envelope (no WebAudio routing, so a suspended iOS AudioContext can never mute Watari).
         Fallbacks: speechSynthesis (male en-GB/en-US) -> captions only.  ?tts=sim plays a soft tone of the same length.
   STT : Soniox real-time websocket, temporary key from POST /api/soniox/token, mic -> AudioWorklet -> s16le 16 kHz mono.
         Turn logic in stt-core.js (endpoint + 700 ms silence, echo filter, barge-in > 600 ms).  ?stt=sim streams scripted
         words shaped like Soniox responses through the same logic.  ?stt=off = operator keys only.
   Public: W.voice.arm() · play(text,sid) · ring(on) · stopAll() · pause(on) · sttStart() · sttStop() · simSay(text) · status() */
(function(W){
'use strict';
if(W.voice) return;
const qs=new URLSearchParams(location.search);
const role=W.role, isPhone=role==='phone';
const Core=W.SttCore;
const V=W.voice={
  sttMode: qs.get('stt') || (isPhone?'soniox':'off'),   // soniox · sim · off
  ttsMode: qs.get('tts') || 'soniox',                   // soniox · sim · browser · off
  armed:false, stt:'idle', speaking:null, paused:false, callActive:false, cache:new Map(), metrics:{}, errors:[],
};
const emit=(t,d,o)=>W.bus.emit(t,d,o);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const withTimeout=(p,ms)=>Promise.race([p,sleep(ms).then(()=>null)]);
const note=(...a)=>{ V.errors.push(a.join(' ')); if(V.errors.length>30) V.errors.shift(); if(qs.get('rtlog')==='1') console.log('[voice]',...a); };

/* ---------------- WAV helpers (ringtone, silence, sim voice) ---------------- */
function wav(samples,rate){ const n=samples.length, b=new ArrayBuffer(44+n*2), v=new DataView(b); const s=(o,str)=>{ for(let i=0;i<str.length;i++) v.setUint8(o+i,str.charCodeAt(i)); };
  s(0,'RIFF'); v.setUint32(4,36+n*2,true); s(8,'WAVE'); s(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,rate,true); v.setUint32(28,rate*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); s(36,'data'); v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){ const x=Math.max(-1,Math.min(1,samples[i])); v.setInt16(44+i*2,x<0?x*0x8000:x*0x7fff,true); } return new Blob([b],{type:'audio/wav'}); }
const SILENT_URL=URL.createObjectURL(wav(new Float32Array(1200),24000));
function ringtone(){ const rate=22050, dur=3.0, out=new Float32Array(Math.floor(rate*dur)); const notes=[659,784,988,784,659,784,988,1175];
  notes.forEach((f,i)=>{ const t0=Math.floor(i*.16*rate), len=Math.floor(.5*rate); for(let k=0;k<len&&t0+k<out.length;k++){ const t=k/rate, env=Math.min(1,t/.005)*Math.exp(-t*7);
    const tri=2*Math.abs(2*((f*t)%1)-1)-1; out[t0+k]+=.32*env*tri+.07*env*Math.sin(2*Math.PI*2*f*t); } });
  return URL.createObjectURL(wav(out,rate)); }
const RING_URL=ringtone();
function simVoice(text){ const rate=16000, words=String(text).split(/\s+/).length, dur=Math.max(.8,words/2.7+.25); const out=new Float32Array(Math.floor(rate*dur)); const env=[];
  for(let i=0;i<out.length;i++){ const t=i/rate; const syl=Math.max(0,Math.sin(Math.PI*2*3.1*t))*(.6+.4*Math.sin(t*1.7)); const a=t>dur-.25?0:syl*.06; out[i]=a*Math.sin(2*Math.PI*(120+20*Math.sin(t*3))*t); }
  for(let k=0;k<dur*1000/70;k++){ const t=k*.07; env.push(t>dur-.25?0:Math.min(1,.25+.75*Math.max(0,Math.sin(Math.PI*2*3.1*t)))); }
  return {url:URL.createObjectURL(wav(out,rate)),env,dur,src:'sim'}; }

/* ---------------- audio elements (unlocked once in the arm tap) ---------------- */
const mkEl=()=>{ const a=new Audio(); a.preload='auto'; a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline',''); return a; };
const voiceEl=mkEl(), ringEl=mkEl(); ringEl.loop=true;
V.el=voiceEl;

/* ---------------- envelope: RMS per 70 ms from the decoded audio, normalised ---------------- */
async function envelope(buf){ try{ const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext; const ctx=W.audio&&W.audio.ctx || (AC?new AC(1,16000,16000):null); if(!ctx) return null;
    const ab=await new Promise((res,rej)=>{ const p=ctx.decodeAudioData(buf.slice(0),res,rej); if(p&&p.then) p.then(res,rej); });
    const d=ab.getChannelData(0), win=Math.floor(ab.sampleRate*.07), env=[]; for(let i=0;i<d.length;i+=win){ let s=0; const e=Math.min(d.length,i+win); for(let j=i;j<e;j++) s+=d[j]*d[j]; env.push(Math.sqrt(s/(e-i||1))); }
    const sorted=[...env].sort((a,b)=>a-b), p95=sorted[Math.floor(sorted.length*.95)]||1; return {env:env.map(v=>Math.min(1,v/p95)),dur:ab.duration}; }catch(e){ return null; } }

/* ---------------- TTS fetch + cache ---------------- */
async function fetchTTS(text){
  if(V.ttsMode==='sim') return simVoice(text);
  if(V.ttsMode==='off'||V.ttsMode==='browser') return null;
  const t0=performance.now();
  try{ const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),5000);
    const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:ctl.signal}); clearTimeout(tm);
    if(!r.ok){ note('tts http',r.status); return null; }
    const buf=await r.arrayBuffer(); const type=r.headers.get('content-type')||'audio/mpeg';
    const e=await envelope(buf); const url=URL.createObjectURL(new Blob([buf],{type}));
    V.metrics.lastTtsMs=Math.round(performance.now()-t0);
    return {url,env:e&&e.env,dur:e?e.dur:String(text).split(/\s+/).length/2.6,src:'soniox'}; }
  catch(e){ note('tts fail',e&&e.message); return null; } }
function getLine(text){ let p=V.cache.get(text); if(!p){ p=fetchTTS(text).then(a=>{ if(!a) V.cache.delete(text); return a; }); V.cache.set(text,p); } return p; }
V.prefetch=async(lines)=>{ const list=[...new Set(lines.filter(Boolean))]; let i=0; const worker=async()=>{ while(i<list.length){ const t=list[i++]; await getLine(t); } };
  await Promise.all([worker(),worker()]); const ok=(await Promise.all(list.map(t=>V.cache.get(t)))).filter(Boolean).length; V.metrics.prefetched=ok+'/'+list.length; emit('voice',{prefetched:V.metrics.prefetched},{localOnly:true}); return ok; };
function scriptLines(){ const L=W.LINES||{}; return [L.w1,L.w2,L.wConfirm,L.w3,L.cost,L.why,L.deny,L.declined,L.nudge,L.sorry]; }

/* ---------------- male browser voice ---------------- */
let bVoice=null;
function pickBrowserVoice(){ try{ const vs=speechSynthesis.getVoices(); const pref=['Daniel','Arthur','Google UK English Male','Microsoft Ryan','Microsoft Guy','Microsoft George','Aaron','Alex','Fred','Rishi'];
  for(const p of pref){ const v=vs.find(v=>v.name.includes(p)&&/^en/i.test(v.lang)); if(v){ bVoice=v; return; } } bVoice=vs.find(v=>/^en-GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null; }catch(e){} }
try{ speechSynthesis.addEventListener('voiceschanged',pickBrowserVoice); }catch(e){}

/* ---------------- playback ---------------- */
let cur=null; // {sid,text,stop(),interrupted}
function levelLoop(getV){ const iv=setInterval(()=>{ if(V.paused) return; const v=getV(); emit('level',{who:'watari',v:Math.round(Math.min(1,Math.max(0,v))*100)/100}); },70); return ()=>clearInterval(iv); }
const synthLevel=t0=>()=>{ const ph=(performance.now()-t0)/1000; return .35+.45*Math.abs(Math.sin(ph*9.1))*(.6+.4*Math.sin(ph*2.3))+Math.random()*.15; };
function playEl(a,c){ return new Promise(res=>{ let done=false, stopLv=null, wd=null, last=-1, still=0;
    const fin=ok=>{ if(done) return; done=true; clearInterval(wd); stopLv&&stopLv(); voiceEl.onended=voiceEl.onerror=null; res(ok); };
    c.stop=()=>{ const v0=voiceEl.volume; let k=0; const f=setInterval(()=>{ k++; voiceEl.volume=Math.max(0,v0*(1-k/5)); if(k>=5){ clearInterval(f); try{ voiceEl.pause(); }catch(e){} voiceEl.volume=1; fin(true); } },30); };
    voiceEl.onended=()=>fin(true); voiceEl.onerror=()=>{ note('audio error'); fin(false); };
    try{ voiceEl.src=a.url; voiceEl.currentTime=0; voiceEl.volume=1; }catch(e){}
    const t0=performance.now(); const p=voiceEl.play();
    const started=()=>{ V.metrics.playStartMs=Math.round(performance.now()-t0);
      stopLv=levelLoop(()=>{ if(!a.env) return synthLevel(t0)(); return a.env[Math.floor(voiceEl.currentTime*1000/70)]||0; });
      // watchdog: stalled for 3 s while not paused -> give up on this line (show must go on)
      wd=setInterval(()=>{ if(V.paused||voiceEl.paused&&!done&&V.paused) return; if(voiceEl.currentTime===last){ if(++still>30) fin(true); } else { still=0; last=voiceEl.currentTime; } },100); };
    if(p&&p.then) p.then(started,e=>{ note('play() rejected',e&&e.name); fin(false); }); else started(); }); }
function speakBrowser(text,c){ return new Promise(res=>{ if(!window.speechSynthesis||V.ttsMode==='off'){ res(false); return; } if(!bVoice) pickBrowserVoice();
    let done=false; const t0=performance.now(); const stopLv=levelLoop(synthLevel(t0)); const fin=ok=>{ if(done) return; done=true; stopLv(); clearTimeout(tm); res(ok); };
    c.stop=()=>{ try{ speechSynthesis.cancel(); }catch(e){} fin(true); };
    const est=String(text).split(/\s+/).length/2.6*1000; const tm=setTimeout(()=>fin(true),est*2+3000);
    try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); if(bVoice){ u.voice=bVoice; u.lang=bVoice.lang; } else u.lang='en-GB'; u.rate=1.02; u.pitch=.9;
      u.onend=()=>fin(true); u.onerror=e=>{ note('speech error',e&&e.error); fin(e&&e.error==='interrupted'); }; speechSynthesis.speak(u);
      // iOS sometimes never starts: no 'start' within 1.5 s = failed
      let st=false; u.onstart=()=>{ st=true; }; setTimeout(()=>{ if(!st&&!done&&!V.paused){ try{ speechSynthesis.cancel(); }catch(e){} fin(false); } },1500); }
    catch(e){ fin(false); } }); }
function captionsOnly(text,c){ return new Promise(res=>{ const est=String(text).split(/\s+/).length/2.6*1000+400; const stopLv=levelLoop(synthLevel(performance.now())); let left=est, last=performance.now();
    const iv=setInterval(()=>{ const n=performance.now(); if(!V.paused) left-=n-last; last=n; if(left<=0) fin(); },50); const fin=()=>{ clearInterval(iv); stopLv(); res(true); }; c.stop=fin; }); }
V.play=async(text,sid)=>{
  if(cur) V.stop(true);
  const c={sid,text,stop:null,interrupted:false}; cur=c; V.speaking=c;
  emit('say-start',{sid,text});
  STT.watari(true,text);
  let a=null; if(V.ttsMode!=='browser'&&V.ttsMode!=='off'){ a=await withTimeout(getLine(text),V.cache.has(text)?6000:4000); }
  let how='captions';
  if(cur===c && a){ if(await playEl(a,c)) how=a.src; else a=null; }
  if(cur===c && !a && !c.interrupted){ if(await speakBrowser(text,c)) how='browser'; else if(cur===c && !c.interrupted) await captionsOnly(text,c); }
  STT.watari(false);
  if(cur===c){ cur=null; V.speaking=null; }
  V.metrics.lastHow=how;
  emit('level',{who:'watari',v:0}); emit('say-end',{sid,interrupted:c.interrupted,how});
};
V.stop=(interrupted)=>{ const c=cur; if(!c) return; c.interrupted=!!interrupted; cur=null; V.speaking=null; try{ c.stop&&c.stop(); }catch(e){} try{ speechSynthesis.cancel(); }catch(e){} };
V.barge=()=>{ if(!cur) return; note('barge-in'); emit('barge',{sid:cur.sid}); V.stop(true); };
V.ring=(on)=>{ try{ if(on){ if(V.paused) return; ringEl.loop=true; if(ringEl.src!==RING_URL) ringEl.src=RING_URL; ringEl.currentTime=0; ringEl.volume=1; const t0=performance.now(); const p=ringEl.play(); if(p&&p.then) p.then(()=>{ V.metrics.ringPlayMs=Math.round(performance.now()-t0); },e=>{ note('ring blocked',e&&e.name); W.audio&&W.audio.ringSynth&&W.audio.ringSynth(true); }); }
  else { ringEl.pause(); W.audio&&W.audio.ringSynth&&W.audio.ringSynth(false); } }catch(e){} V.ringing=!!on; };
V.stopAll=()=>{ V.ring(false); V.stop(true); };
V.pause=(on)=>{ V.paused=!!on; try{ if(on){ voiceEl.pause(); ringEl.pause(); speechSynthesis.pause(); } else { if(cur&&voiceEl.src&&!voiceEl.ended&&voiceEl.currentTime>0) voiceEl.play().catch(()=>{}); if(V.ringing) ringEl.play().catch(()=>{}); speechSynthesis.resume(); } }catch(e){} };

/* ---------------- arm: must run inside the user's tap ---------------- */
let wakeLock=null;
async function wake(){ try{ if(navigator.wakeLock && document.visibilityState==='visible'){ wakeLock=await navigator.wakeLock.request('screen'); } }catch(e){ note('wakelock',e&&e.name); } }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && V.armed){ wake(); const c=W.audio&&W.audio.ctx; if(c&&c.state!=='running') c.resume().catch(()=>{}); } });
V.arm=()=>{
  // synchronous part (gesture): unlock both media elements
  for(const el of [voiceEl,ringEl]){ try{ el.src=SILENT_URL; const p=el.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){}
  pickBrowserVoice();
  const first=!V.armed; V.armed=true;
  wake();
  if(first){ V.prefetch(scriptLines()); if(isPhone) STT.prepare(); }
  emit('voice',{armed:true},{localOnly:true});
};
// iOS can leave the context suspended after an interruption: any later touch resumes it
['touchend','click'].forEach(ev=>document.addEventListener(ev,()=>{ const c=W.audio&&W.audio.ctx; if(c&&c.state!=='running') c.resume().catch(()=>{}); },{passive:true}));

/* ---------------- STT ---------------- */
const STT=V._stt={ws:null, tracker:null, active:false, sentMs:0, buf:[], key:null, keyAt:0, sid:null, lastPartialAt:0, tries:0, noCtx:false, noProto:false, simTimers:[], t0:0};
const clock=()=> V.sttMode==='sim' ? performance.now()-STT.t0 : STT.sentMs;
V.status=()=>({stt:V.stt, sttMode:V.sttMode, tts:V.ttsMode, armed:V.armed, mic:!!(STT.stream&&STT.stream.active), prefetched:V.metrics.prefetched||null});
function setStt(s){ if(V.stt===s) return; V.stt=s; emit('voice',{stt:s},{localOnly:true}); }
async function mintKey(){ const mock=qs.get('sonioxmock'); if(mock){ STT.key='mock-key'; STT.keyAt=Date.now(); STT.url=mock; STT.model='stt-rt-v5'; return STT.key; } // local test double only (CSP blocks it in production)
  try{ const r=await fetch('/api/soniox/token',{method:'POST'}); if(!r.ok){ note('token http',r.status); return null; } const j=await r.json(); STT.key=j.api_key; STT.keyAt=Date.now(); STT.url=j.url||'wss://stt-rt.soniox.com/transcribe-websocket'; STT.model=j.model||'stt-rt-v5'; return j.api_key; }catch(e){ note('token fail',e&&e.message); return null; } }
STT.prepare=async()=>{
  // mic once, kept open for the whole run (also in sim mode, so the permission path is exercised)
  if(V.sttMode==='off'){ setStt('off'); return; }
  try{ if(!STT.stream||!STT.stream.active){ STT.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}}); await capture(); } }
  catch(e){ note('mic',e&&e.name); if(V.sttMode==='soniox'){ setStt('error'); return; } }
  if(V.sttMode==='sim'){ setStt('sim'); return; }
  setStt((await mintKey())?'ready':'error');
};
async function capture(){ const A=W.audio; if(!A.ctx){ try{ A.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; } }
  const ctx=A.ctx; try{ await ctx.resume(); }catch(e){}
  const src=ctx.createMediaStreamSource(STT.stream); const an=ctx.createAnalyser(); an.fftSize=1024; src.connect(an); STT.an=an;
  const sink=ctx.createGain(); sink.gain.value=0; sink.connect(ctx.destination);
  try{ await ctx.audioWorklet.addModule((W.base||'core/')+'pcm-worklet.js'); const node=new AudioWorkletNode(ctx,'pcm16k'); node.port.onmessage=e=>onPcm(e.data); src.connect(node); node.connect(sink); STT.node=node; }
  catch(e){ note('worklet unavailable, script processor',e&&e.message);
    const sp=ctx.createScriptProcessor(4096,1,1), ratio=ctx.sampleRate/16000; let acc=0,n=0,pos=0,out=[];
    sp.onaudioprocess=ev=>{ const ch=ev.inputBuffer.getChannelData(0); for(let i=0;i<ch.length;i++){ acc+=ch[i]; n++; pos++; if(pos>=ratio){ pos-=ratio; const v=Math.max(-1,Math.min(1,acc/n)); acc=0; n=0; out.push(v<0?v*0x8000:v*0x7fff); if(out.length===320){ onPcm(new Int16Array(out).buffer); out=[]; } } } };
    src.connect(sp); sp.connect(sink); STT.node=sp; }
  // user level for the big orb, ~14/s, only while the call is live and Watari is quiet (or barged)
  const td=new Float32Array(an.fftSize); let was=0;
  setInterval(()=>{ if(!V.callActive||V.paused) return; an.getFloatTimeDomainData(td); let s=0; for(let i=0;i<td.length;i++) s+=td[i]*td[i]; const v=Math.min(1,Math.sqrt(s/td.length)*7);
    if(V.speaking){ if(was){ was=0; emit('level',{who:'user',v:0}); } return; }
    if(v>.06){ was=1; emit('level',{who:'user',v:Math.round(v*100)/100}); } else if(was){ was=0; emit('level',{who:'user',v:0}); } },70);
}
function onPcm(ab){ if(!STT.active||V.sttMode!=='soniox') return; const ws=STT.ws;
  if(ws&&ws.readyState===1&&STT.configured){ while(STT.buf.length){ ws.send(STT.buf.shift()); STT.sentMs+=20; } ws.send(ab); STT.sentMs+=20; STT.lastSend=Date.now(); }
  else { STT.buf.push(ab); if(STT.buf.length>150) STT.buf.shift(); } }
function handle(evs){ for(const e of evs){
  if(e.type==='partial'){ if(!STT.sid) STT.sid='u'+Math.random().toString(36).slice(2,7); STT.lastPartialAt=Date.now(); emit('say',{who:'user',text:e.text,sid:STT.sid,partial:true,final:false}); }
  else if(e.type==='final'){ const sid=STT.sid||('u'+Math.random().toString(36).slice(2,7)); STT.sid=null; V.metrics.lastFinal={text:e.text,conf:e.conf,t:Date.now()};
    emit('say',{who:'user',text:e.text,sid,partial:false,final:true}); emit('utter',{text:e.text,sid,conf:e.conf,live:true}); }
  else if(e.type==='barge'){ V.barge(); }
  else if(e.type==='error'){ note('soniox error',e.code,e.errorType,e.message); STT.lastErr=e; }
} }
STT.watari=(on,text)=>{ if(STT.tracker) STT.tracker.watari(on,text,clock()); };
async function openWs(){
  if(!STT.active) return;
  if(!STT.key || Date.now()-STT.keyAt>50*60*1000){ if(!(await mintKey())){ setStt('error'); retry(); return; } }
  STT.configured=false; STT.sentMs=0; STT.tracker=new Core.TurnTracker({endSilenceMs:700,bargeMs:600}); if(V.speaking) STT.tracker.watari(true,V.speaking.text,0);
  let ws; const t0=performance.now();
  try{ ws=STT.noProto? new WebSocket(STT.url) : new WebSocket(STT.url,['soniox-api-key',STT.key]); }catch(e){ note('ws ctor',e&&e.message); STT.noProto=true; retry(); return; }
  ws.binaryType='arraybuffer'; STT.ws=ws; let opened=false, gotMsg=false;
  ws.onopen=()=>{ opened=true; V.metrics.sttOpenMs=Math.round(performance.now()-t0);
    const cfg={model:STT.model,audio_format:'s16le',sample_rate:16000,num_channels:1,language_hints:['en'],enable_endpoint_detection:true,max_endpoint_delay_ms:800};
    if(STT.noProto) cfg.api_key=STT.key;
    if(!STT.noCtx) cfg.context={terms:['Watari','Colruyt','KBC','SD Worx','payroll','credit line','Kodo','Larry']};
    ws.send(JSON.stringify(cfg)); STT.configured=true; STT.tries=0; setStt('live'); };
  ws.onmessage=ev=>{ if(typeof ev.data!=='string') return; let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } gotMsg=true;
    if(m.error_code||m.error_type){ // a bad config field must never kill the demo: retry once without the context terms
      if(!STT.noCtx && (m.error_code===400)) { STT.noCtx=true; } }
    handle(STT.tracker.feed(m,clock())); };
  ws.onerror=()=>{ note('ws error'); if(!opened && !STT.noProto && !gotMsg){ STT.noProto=true; } };
  ws.onclose=ev=>{ if(STT.ws!==ws) return; STT.ws=null; STT.configured=false; note('ws close',ev.code,ev.reason);
    if(STT.active){ // flush whatever was said, then reconnect
      const f=STT.tracker&&STT.tracker._flush(); if(f) handle([f]); setStt('reconnecting'); retry(); } };
}
function retry(){ if(!STT.active) return; STT.tries++; if(STT.tries>6){ setStt('error'); return; } setTimeout(openWs,Math.min(3000,300*STT.tries)); }
V.sttStart=()=>{ if(STT.active) return; STT.active=true; STT.sid=null; STT.t0=performance.now();
  if(V.sttMode==='soniox'){ if(!STT.stream){ STT.prepare().then(()=>STT.active&&openWs()); } else openWs(); }
  else if(V.sttMode==='sim'){ STT.tracker=new Core.TurnTracker({endSilenceMs:700,bargeMs:600}); setStt('sim'); } };
V.sttStop=()=>{ STT.active=false; STT.simTimers.forEach(clearTimeout); STT.simTimers=[]; const ws=STT.ws; STT.ws=null; STT.buf=[];
  if(ws){ try{ if(ws.readyState===1) ws.send(''); }catch(e){} setTimeout(()=>{ try{ ws.close(); }catch(e){} },800); }
  if(V.stt==='live'||V.stt==='reconnecting') setStt('ready'); };
// end-of-turn timer + keepalive
setInterval(()=>{ if(!STT.active||!STT.tracker) return; handle(STT.tracker.tick(clock()));
  const ws=STT.ws; if(ws&&ws.readyState===1&&STT.configured&&Date.now()-(STT.lastSend||0)>10000){ try{ ws.send(JSON.stringify({type:'keepalive'})); STT.lastSend=Date.now(); }catch(e){} } },50);
// simulated speech, through the same turn logic as Soniox
V.simSay=(text,opt)=>{ if(!STT.tracker){ STT.tracker=new Core.TurnTracker({endSilenceMs:700,bargeMs:600}); STT.t0=performance.now(); }
  STT.simTimers.forEach(clearTimeout); STT.simTimers=[];
  const {msgs,endMs}=Core.simMessages(text,clock(),opt||{}); const t0=clock(); STT.simBusyUntil=performance.now()+msgs[msgs.length-1].at+1200;
  for(const {at,msg} of msgs){ STT.simTimers.push(setTimeout(()=>{ if(!STT.tracker) return; handle(STT.tracker.feed(msg,clock())); },at)); }
  const lv=setInterval(()=>{ if(clock()-t0>endMs-t0) { clearInterval(lv); emit('level',{who:'user',v:0}); return; } emit('level',{who:'user',v:Math.round((.45+Math.random()*.5)*100)/100}); },70); STT.simTimers.push(lv); };

/* ---------------- bus wiring ---------------- */
W.bus.on('call',d=>{ if(!isPhone) return; if(d.status==='active'){ V.callActive=true; V.sttStart(); } if(d.status==='ended'){ V.callActive=false; V.sttStop(); } if(d.status==='ringing'&&V.sttMode==='soniox'&&(!STT.key||Date.now()-STT.keyAt>50*60*1000)) mintKey(); });
W.bus.on('reset',()=>{ V.stopAll(); if(isPhone){ V.callActive=false; V.sttStop(); } });
W.bus.on('resync',st=>{ if(!isPhone) return; if(st.call==='active'&&!V.callActive){ V.callActive=true; V.sttStart(); } if(st.call!=='active'&&V.callActive){ V.callActive=false; V.sttStop(); } });
// sim STT: Larry "says" the scripted hint when the engine waits for him
W.bus.on('await',d=>{ if(!isPhone||V.sttMode!=='sim'||!V.callActive||!d.hint||qs.get('simauto')==='0') return; STT.simTimers.push(setTimeout(()=>{ if(V.callActive&&!V.speaking&&!(performance.now()<(STT.simBusyUntil||0))&&!STT.sid) V.simSay(d.hint); },900)); });
})(window.W=window.W||{});
