/* WATARI · CFO on Call · shared demo core (no framework, no backend)
   One master engine (the stage) drives a scripted-but-flexible state machine and broadcasts
   events. The phone page renders the same events and sends back taps. Audio plays on the phone
   when it is linked, otherwise on this machine (rehearsal mode).
   Transport today: BroadcastChannel (same browser, two windows). Tomorrow: swap W.transport
   for a WebSocket relay; nothing else changes. See CONTRACT.md. */
(function(W){
'use strict';
const qs=new URLSearchParams(location.search);

/* ---------------- config: every number on screen comes from here ---------------- */
W.CFG={
  founder:'Larry', company:'Kodo', companyTag:'B2B SaaS · 12 people · Leuven',
  today:'Tuesday 20 October', payday:'Friday 23 Oct', people:12,
  balance:48200, payroll:79200, get gap(){return this.payroll-this.balance;},
  client:{id:'colruyt', name:'Colruyt Group', short:'Colruyt', color:'#e3000f',
          invoice:'INV-2026-0412', amount:31000, sent:'10 Sep', due:'10 Sep + 0', daysLate:40, ap:'accounts.payable@colruytgroup.example'},
  credit:{limit:50000, used:0, draw:31000, fee:60, days:14, rate:'5,2% APR'},
  todo:['Ship v11 to customers','Fix onboarding bug #482','Prep Thursday demo'],
};
const C=W.CFG;
W.eur=(v)=>'€'+Math.round(v).toLocaleString('nl-BE');

/* ---------------- partners (logo slot: core/logos/<id>.svg, falls back to a text mark) ---------------- */
W.PARTNERS={
  kbc:{name:'KBC', role:'Bank · account + credit line', color:'#003665', fg:'#fff', mark:'KBC', proto:'API'},
  sdworx:{name:'SD Worx', role:'Payroll · run on Friday', color:'#d0021b', fg:'#fff', mark:'SD', proto:'API'},
  attio:{name:'Attio', role:'CRM · clients and invoices', color:'#111827', fg:'#fff', mark:'At', proto:'MCP'},
  peppol:{name:'Peppol', role:'E-invoice network', color:'#0a6ebd', fg:'#fff', mark:'Pp', proto:'API'},
  outlook:{name:'Outlook', role:'Your mailbox · sends as you', color:'#0f6cbd', fg:'#fff', mark:'O', proto:'API'},
  calendar:{name:'Calendar', role:'Your agenda · free slots', color:'#ffffff', fg:'#0f6cbd', mark:'31', proto:'API'},
  colruyt:{name:C.client.name, role:'Client · owes '+'€31.000', color:C.client.color, fg:'#fff', mark:'C', proto:'WEB'},
};
W.LOGO_FILES={kbc:'kbc.svg',sdworx:'sdworx.svg',attio:'attio.svg',peppol:'peppol.png',outlook:'outlook.svg',calendar:'calendar.svg',colruyt:'colruyt.svg'};
W.LOGOS=qs.get('logos')!=='0'; // official logos from core/logos/ (?logos=0 = text marks only)
W.base=(document.currentScript&&document.currentScript.src.replace(/call\.js.*$/,''))||'core/';
W.logo=(id,size=34)=>{ const p=W.PARTNERS[id]||{name:id,color:'#ccd',fg:'#123',mark:id.slice(0,2)}; const f=W.LOGOS&&W.LOGO_FILES[id];
  return `<span class="wlogo${f?' has-img':''}" style="--lg:${p.color};--lf:${p.fg};width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px" title="${p.name}">${f?`<img src="${W.base}logos/${f}" alt="" onerror="this.parentNode.classList.remove('has-img');this.remove()">`:''}<b>${p.mark}</b></span>`; };

/* ---------------- bus ----------------
   Every message has a unique id (mid) and the sender role. Transports: BroadcastChannel (same browser, ?nobc=1 to
   disable), PeerJS data channel + ntfy relay (core/rt.js, loaded below). Receivers dedupe by mid. */
const handlers={}; const id=Math.random().toString(36).slice(2,8); let seq=0;
W.role=qs.get('role')||(document.documentElement.dataset.role)||'stage';
let bc=null; if(qs.get('nobc')!=='1'){ try{ bc=new BroadcastChannel('watari-call-v1'); }catch(e){} }
function deliver(m){ (handlers[m.type]||[]).concat(handlers['*']||[]).forEach(f=>{ try{ f(m.data,m); }catch(e){ console.error(e); } }); }
W._mk=(type,data={})=>({type,data,from:id,role:W.role,mid:id+'.'+(++seq),ts:Date.now()});
W.bus={
  on(t,f){ (handlers[t]=handlers[t]||[]).push(f); return W.bus; },
  off(t,f){ handlers[t]=(handlers[t]||[]).filter(x=>x!==f); return W.bus; },
  emit(type,data={},opt={}){ const m=W._mk(type,data); if(!opt.remoteOnly) deliver(m); if(!opt.localOnly) post(m); return m; },
};
W._transports=W._transports||[];
if(bc) W._transports.push({send:m=>bc.postMessage(m)});
else if(qs.get('nobc')!=='1') W._transports.push({send:m=>{ try{ localStorage.setItem('watari-bus',JSON.stringify(m)); }catch(e){} }});
function post(m){ for(const t of W._transports){ try{ t.send(m); }catch(e){} } }
const seen=new Map();
W._recv=(m,via)=>{ if(!m||!m.type||m.from===id) return; if(m.mid){ if(seen.has(m.mid)) return; seen.set(m.mid,Date.now()); if(seen.size>3000){ const cut=Date.now()-120000; for(const [k,t] of seen){ if(t<cut) seen.delete(k); } if(seen.size>3000) seen.clear(); } }
  if(m.role&&W.peers&&m.role!==W.role){ W.peers[m.role]=Date.now(); }
  m.via=via; deliver(m); };
if(bc) bc.onmessage=e=>W._recv(e.data,'bc');
window.addEventListener('storage',e=>{ if(e.key==='watari-bus'&&e.newValue&&qs.get('nobc')!=='1'){ try{ W._recv(JSON.parse(e.newValue),'ls'); }catch(_){} } });

/* ---------------- roles + presence ---------------- */
W.peers={phone:0,stage:0}; W.peerInfo={};
// on the relay (data channel down) presence only arrives every ~8 s, so the link window is wider
W.phoneLinked=()=>Date.now()-W.peers.phone<((W.rt&&W.rt.mode!=='dc')?20000:2500);
W.bus.on('presence',(d,m)=>{ W.peers[d.role]=Date.now(); W.peerInfo[d.role]={...d,via:m.via}; W.bus.emit('peers',{...W.peers},{localOnly:true}); });
const presence=()=>({role:W.role, voice:W.voice?W.voice.status():null, rt:W.rt?W.rt.mode:null, paused:!!(W.engine&&W.engine.paused)});
setInterval(()=>W.bus.emit('presence',presence(),{remoteOnly:true}),800);
W.bus.emit('presence',presence(),{remoteOnly:true});
// master = the stage; a phone opened alone becomes its own master (standalone sim on the iPhone)
W.isMaster=()=> W.role==='stage' || (W.role==='phone' && Date.now()-W.peers.stage>((W.rt&&W.rt.mode!=='dc')?20000:2500));
// live STT on a linked phone: the engine then never simulates Larry's voice or taps
W.phoneStt=()=> W.role==='stage' && W.phoneLinked() && !!(W.peerInfo.phone&&W.peerInfo.phone.voice&&/^(ready|live|sim|reconnecting)$/.test(W.peerInfo.phone.voice.stt));

/* ---------------- 2.0 modules: realtime transport + voice (index.html stays untouched) ---------------- */
function load(src){ return new Promise(r=>{ const s=document.createElement('script'); s.src=W.base+src; s.async=false; s.onload=()=>r(true); s.onerror=()=>r(false); document.head.appendChild(s); }); }
// provider check (booleans only); also warms the API routes before the show
if(qs.get('rt')!=='0') fetch('/api/rt/status').then(r=>r.ok?r.json():null).then(j=>{ W.providers=j; }).catch(()=>{});
W.ready=Promise.all([
  qs.get('rt')==='0'? Promise.resolve() : load('peerjs.min.js').then(()=>load('rt.js')),
  load('stt-core.js').then(()=>load('voice.js')),
]);

/* ---------------- audio: synthesised, nothing to download ---------------- */
const A=W.audio={ctx:null, armed:false, muted:false, voice:null, ringing:false};
A.arm=()=>{ try{ A.ctx=A.ctx||new (window.AudioContext||window.webkitAudioContext)(); A.ctx.resume(); const o=A.ctx.createOscillator(),g=A.ctx.createGain(); g.gain.value=0.0001; o.connect(g).connect(A.ctx.destination); o.start(); o.stop(A.ctx.currentTime+.05);}catch(e){}
  try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){}
  A.armed=true; pickVoice(); try{ W.voice&&W.voice.arm(); }catch(e){ console.warn(e); } W.bus.emit('armed',{role:W.role},{localOnly:true}); };
function pickVoice(){ try{ const vs=speechSynthesis.getVoices(); const pref=['Daniel','Google UK English Male','Arthur','Microsoft Ryan','Oliver','en-GB','Samantha','en-US'];
  for(const p of pref){ const v=vs.find(v=>v.name.includes(p)||v.lang===p); if(v){ A.voice=v; return; } } }catch(e){} }
try{ speechSynthesis.onvoiceschanged=pickVoice; }catch(e){}
function tone(f,t0,dur,type='sine',vol=.18,attack=.005){ const c=A.ctx; const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0);
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+attack); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0+dur+.05); }
let ringTimer=null;
A.ring=(on)=>{ if(W.voice){ W.voice.ring(on&&!A.muted); A.ringing=on; return; } A.ringSynth(on); };
A.ringSynth=(on)=>{ clearInterval(ringTimer); A.ringing=on; if(!on||!A.ctx||A.muted) return;
  const phrase=()=>{ const t=A.ctx.currentTime+.02; [659,784,988,784,659,784,988,1175].forEach((f,i)=>{ tone(f,t+i*.16,.5,'triangle',.22); tone(f*2,t+i*.16,.25,'sine',.05); }); };
  phrase(); ringTimer=setInterval(phrase,2600); };
A.sfx=(n)=>{ if(!A.ctx||A.muted) return; const t=A.ctx.currentTime+.01;
  if(n==='click') tone(1800,t,.04,'square',.04);
  if(n==='tick') tone(2400,t,.03,'sine',.05);
  if(n==='whoosh'){ const c=A.ctx,b=c.createBuffer(1,c.sampleRate*.4,c.sampleRate),d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2)*.25; const s=c.createBufferSource(),f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(400,t); f.frequency.exponentialRampToValueAtTime(3000,t+.35); s.buffer=b; s.connect(f).connect(c.destination); s.start(t); }
  if(n==='chime'){ tone(1046,t,.5,'sine',.12); tone(1568,t+.09,.6,'sine',.09); }
  if(n==='notif'){ tone(1318,t,.18,'sine',.14); tone(1760,t+.12,.3,'sine',.12); }
  if(n==='send'){ tone(700,t,.12,'sine',.08); tone(1400,t+.06,.18,'sine',.08); }
  if(n==='success'){ [784,988,1318].forEach((f,i)=>tone(f,t+i*.08,.35,'sine',.1)); }
  if(n==='alert'){ tone(440,t,.25,'sawtooth',.05); tone(370,t+.22,.35,'sawtooth',.05); }
  if(n==='end'){ tone(480,t,.15,'sine',.1); tone(360,t+.14,.25,'sine',.1); }
};
// speak text; emits level events so the other screen can draw the waveform
// 2.0: W.voice (Soniox TTS -> speechSynthesis -> captions) when loaded; the legacy path below stays as last resort
A.say=(text,sid)=>{ if(W.voice&&!A.muted) return W.voice.play(text,sid); return A.sayLegacy(text,sid); };
A.sayLegacy=(text,sid)=>new Promise(res=>{
  const words=text.split(/\s+/).length, est=words/2.75*1000+600; let done=false, iv=null, t0=Date.now();
  const fin=()=>{ if(done) return; done=true; clearInterval(iv); W.bus.emit('level',{who:'watari',v:0}); W.bus.emit('say-end',{sid}); res(); };
  iv=setInterval(()=>{ const ph=(Date.now()-t0)/1000; const v=.35+.45*Math.abs(Math.sin(ph*9.1))*(.6+.4*Math.sin(ph*2.3))+Math.random()*.2; W.bus.emit('level',{who:'watari',v:Math.min(1,v)}); },70);
  W.bus.emit('say-start',{sid,text});
  let spoke=false;
  if(A.armed && !A.muted && window.speechSynthesis){ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); if(A.voice) u.voice=A.voice; u.lang=(A.voice&&A.voice.lang)||'en-GB'; u.rate=1.03; u.pitch=.96;
    u.onboundary=()=>W.bus.emit('level',{who:'watari',v:1}); u.onend=fin; u.onerror=fin; speechSynthesis.speak(u); spoke=true; setTimeout(fin,est*1.8+2500); }catch(e){} }
  if(!spoke) setTimeout(fin,est/(W.SPEED||1));
});
A.stopSpeech=()=>{ try{ speechSynthesis.cancel(); }catch(e){} try{ W.voice&&W.voice.stop(true); }catch(e){} };
// whoever owns the audio executes play commands
W.audioHere=()=> W.role==='phone' || !W.phoneLinked();
W.bus.on('play',async (d,m)=>{ if(!W.audioHere()) return;
  if(d.cmd==='ring'){ A.ring(d.on); if(d.on&&m&&m.ts&&W.role==='phone'){ const ms=Date.now()-m.ts+((W.rt&&W.rt.stats.offset)||0); if(W.rt) W.rt.stats.ring=ms; W.bus.emit('metric',{ring:ms,via:m.via||'local'},{remoteOnly:true}); } }
  if(d.cmd==='sfx') A.sfx(d.name); if(d.cmd==='say') await A.say(d.text,d.sid); if(d.cmd==='stop'){ A.ring(false); A.stopSpeech(); } });
W.bus.on('metric',d=>{ if(W.role==='stage'){ W.metrics=W.metrics||{}; Object.assign(W.metrics,d); console.info('[watari] phone ring latency',d.ring,'ms via',d.via); } });
// pause: freeze audio on whichever device owns it
W.bus.on('pause',d=>{ A.paused=!!d.on; try{ W.voice&&W.voice.pause(d.on); }catch(e){} try{ d.on?speechSynthesis.pause():speechSynthesis.resume(); }catch(e){} if(d.on) clearInterval(ringTimer); });
W.bus.on('sfx',d=>{ if(W.role==='stage' && W.state.scene!=='call' && W.state.scene!=='ringing') A.sfx(d.name); });

/* ---------------- state snapshot (late joiners sync from it) ---------------- */
const blank=()=>({scene:'calm', call:'idle', mood:'idle', signals:[], transcript:[], actions:{}, notifs:[], notif:null, ledger:{}, gap:null, cause:null, callStart:0, paused:false});
W.state=blank();
W.bus.on('snapshot',d=>{ if(!W.isMaster()) { Object.assign(W.state,d); W.bus.emit('resync',W.state,{localOnly:true}); } });
W.bus.on('hello',()=>{ if(W.isMaster()) W.bus.emit('snapshot',W.state,{remoteOnly:true}); });
setTimeout(()=>W.bus.emit('hello',{role:W.role},{remoteOnly:true}),150);
W.ready.then(()=>setTimeout(()=>W.bus.emit('hello',{role:W.role},{remoteOnly:true}),400));

/* ---------------- engine (runs on the master only) ---------------- */
const E=W.engine={gen:0, auto:qs.get('auto')!=='0', running:false, pend:null, paused:false, queue:null, userTalkAt:0, sorry:0};
const SP=+qs.get('speed')||1; W.SPEED=SP;
// pausable clock: every engine delay goes through wait()/later(), so P freezes the whole story
const wait=ms=>new Promise(r=>{ let left=ms/SP, last=Date.now(); const tick=()=>{ const n=Date.now(); if(!E.paused) left-=n-last; last=n; if(left<=0) r(); else setTimeout(tick,Math.min(left,60)); }; setTimeout(tick,Math.max(0,Math.min(left,60))); });
const later=(fn,ms)=>{ let off=false; wait(ms).then(()=>{ if(!off) fn(); }); return ()=>{ off=true; }; };
let G=0; const alive=g=>g===G;
// simulate Larry (auto voice / auto taps) only when no live STT phone is linked
const autoUser=()=> E.auto && !W.phoneStt();
function set(k,v){ W.state[k]=v; }
function scene(name){ set('scene',name); W.bus.emit('scene',{name}); }
function mood(m,label){ set('mood',m); W.bus.emit('mood',{mood:m,label}); }
function log(kind,text,detail){ W.bus.emit('log',{kind,text,detail,t:Date.now()}); }
function signal(s){ W.state.signals.push(s); W.bus.emit('signal',s); }
function action(id,patch){ const a=W.state.actions[id]={...(W.state.actions[id]||{id}),...patch}; W.bus.emit('action',a); }
function ledger(k,v){ W.state.ledger[k]=v; W.bus.emit('ledger',{k,v}); }
function sfx(name){ W.bus.emit('sfx',{name}); }
function notif(n){ if(!n.lock) W.state.notif= (W.state.notif&&W.state.notif.id===n.id)? {...W.state.notif,...n} : {...n}; W.bus.emit('notif',n); }
function transcript(l){ W.state.transcript.push(l); if(W.state.transcript.length>14) W.state.transcript.shift(); }
// Watari never talks over Larry: wait until his partials have been quiet for 700 ms (max 5 s)
async function quiet(g){ const t0=Date.now(); while(alive(g) && Date.now()-E.userTalkAt<700 && Date.now()-t0<5000) await wait(100); }
async function say(who,text,g){ const sid=Math.random().toString(36).slice(2,7);
  if(who!=='watari') return;
  await quiet(g); if(!alive(g)) return;
  transcript({who,text,sid,final:true});
  mood('speaking'); W.bus.emit('say',{who,text,sid,partial:false,final:true});
  let off=null; const p=new Promise(r=>{ off=d=>{ if(d.sid===sid) r(d); }; W.bus.on('say-end',off); });
  W.bus.emit('play',{cmd:'say',text,sid});
  const end=await Promise.race([p,wait(text.split(/\s+/).length/2.75*1000*2+4000).then(()=>({timeout:true}))]); W.bus.off('say-end',off);
  if(end&&end.interrupted) log('think','Larry spoke over Watari · stopped talking');
  if(alive(g)) mood('listening'); }
// user speech: in live mode this comes from Soniox on the phone; in sim mode we type it out
async function userSays(text,g){ mood('listening'); const sid='u'+Math.random().toString(36).slice(2,6); const ws=text.split(' '); let cur='';
  for(let i=0;i<ws.length;i++){ if(!alive(g)) return; cur+=(i?' ':'')+ws[i]; W.bus.emit('say',{who:'user',text:cur,sid,partial:true,final:false}); W.bus.emit('level',{who:'user',v:.5+Math.random()*.5}); await wait(260+Math.random()*120); }
  W.bus.emit('level',{who:'user',v:0}); transcript({who:'user',text,sid,final:true}); W.bus.emit('say',{who:'user',text,sid,partial:false,final:true});
  return text; }
// live STT from the phone: partials only mark "Larry is talking"; finals become utterances (queued if Watari is busy)
W.bus.on('say',(d,m)=>{ if(d.who==='user' && d.partial && m && m.from!==undefined && m.role==='phone') E.userTalkAt=Date.now(); });
W.bus.on('utter',d=>{ if(!W.isMaster()||!d.live) return; E.userTalkAt=0;
  const item={type:'utter',text:String(d.text||''),conf:d.conf,live:true,sid:d.sid,t:Date.now()}; transcript({who:'user',text:item.text,sid:d.sid,final:true});
  if(E.pend && E.pend.accept.includes('utter')) E.pend.resolve(item); else if(W.state.call==='active') E.queue=item; });
// taps that land while Watari is still talking (e.g. approve during "tap approve") are queued, never lost
W.bus.on('input',d=>{ if(!W.isMaster()) return; if(E.pend && (E.pend.accept.includes(d.type))) E.pend.resolve(d);
  else if(/^(approve|declineNotif|hangup)$/.test(d.type) && W.state.call==='active') E.queue={...d,t:Date.now()}; });
function waitFor(accept,{simText,simDelay=1100}={},g){ return new Promise(resolve=>{ let cancel=null;
  E.pend={hint:simText,accept:[...accept,'utter'],resolve:v=>{ E.pend=null; cancel&&cancel(); resolve(v);} };
  // Larry already answered while Watari was still busy (barge-in or quick reply): use it
  if(E.queue && Date.now()-E.queue.t<12000 && E.pend.accept.includes(E.queue.type)){ const q=E.queue; E.queue=null; const p=E.pend; setTimeout(()=>p.resolve(q),0); return; }
  if(E.queue && E.queue.type==='utter') E.queue=null;
  if(simText) cancel=later(async()=>{ if(!alive(g)||!E.pend||!autoUser()) return; const p=E.pend; E.pend=null; const t=await userSays(simText,g); if(alive(g)) p.resolve({type:'utter',text:t,sim:true}); },simDelay);
  W.bus.emit('await',{accept, hint:simText||null}); }); }
W.intent=(t)=>{ t=(t||'').toLowerCase();
  if(/(cost|how much|price|interest|fee|expensive)/.test(t)) return 'cost';
  if(/(who|which client|why|what happened|how come)/.test(t)) return 'why';
  if(/\b(don'?t|do not) (do|draw|take|touch)\b|\bno,? (thanks|don'?t)\b/.test(t)) return 'deny';
  if(/\b(do it|yes|yeah|yep|go( ahead)?|sure|approve|please|let'?s|ja|oui|vas-y|doe maar|ok do|fine|sounds good|perfect|great)\b/.test(t)) return 'affirm';
  if(/\b(no|nope|nah|stop|not now|nee|non|cancel|never mind)\b/.test(t)) return 'deny';
  if(/\b(what|how|plan|options?|fix|help|then|so|next|tell me|go on|ideas?)\b/.test(t) || t.split(/\s+/).filter(Boolean).length<=2) return 'what';
  return 'other'; };
async function think(steps,g){ mood('thinking'); W.bus.emit('think',{steps:[],start:true}); for(const s of steps){ if(!alive(g)) return; await wait(380); W.bus.emit('think',{step:s}); log('think',s); } await wait(250); }

const L={
  w1:`Hi ${C.founder}. Payroll for your ${C.people} people goes out Friday, and you're thirty-one thousand euros short. ${C.client.short} hasn't paid you. Their invoice is ${C.client.daysLate} days late.`,
  w2:`I chase ${C.client.short} from your mailbox, and bridge the gap with your KBC credit line until they pay. Cost: about sixty euros.`,
  wConfirm:`Sending you the approval from KBC now. Tap approve.`,
  w3:`Done. Payroll is covered. Your team gets paid Friday. Go back to building.`,
  cost:`About sixty euros of interest, for roughly two weeks. You can repay the moment ${C.client.short} pays.`,
  why:`${C.client.short}. Invoice ${C.client.invoice}, thirty-one thousand euros, sent on ${C.client.sent}. Every other client is on time.`,
  deny:`Understood. I'll only chase ${C.client.short}, and I'll call you Thursday morning if they still haven't paid.`,
  declined:`No problem. Nothing is drawn. I'll chase ${C.client.short} and check back Thursday.`,
  nudge:`Shall I go ahead?`,
  sorry:`Sorry, say that again?`,
};
W.LINES=L;
// deviation: Claude writes one short line inside the same plan (/api/line); safe scripted line if slow or offline
const SAFE={await1:`Short version: I chase ${C.client.short} and bridge the gap with your KBC credit line. Want me to?`, await2:`Same plan, about sixty euros. Shall I go ahead?`, approve:`The approval from KBC is on your phone. Tap approve.`, chaseOnly:L.deny};
const PREVIEW={mail:['outlook',`Reminder to ${C.client.short} AP`,`${C.client.invoice} · ${W.eur(C.client.amount)}`],credit:['kbc','Bridge with KBC credit line',`${W.eur(C.credit.draw)} · ~${W.eur(C.credit.fee)}`],payroll:['sdworx','Fund Friday payroll',`${C.people} people · ${W.eur(C.payroll)}`],crm:['attio',`Note on ${C.client.short} in Attio`,'task "check payment Thu"'],cal:['calendar','Follow-up booked','Thu 09:00 · auto-cancels if paid'],repay:['kbc','Auto-repay armed',`when ${C.client.short} pays`]};
async function deviate(text,stage,g){
  log('think',`off-script: "${text}"`,'asking Claude for one line inside the plan');
  const t0=Date.now(); let r=null;
  const thinking=think(['off-script · stay inside the plan','allowlisted actions only'],g);
  try{ const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),4500);
    const res=await fetch('/api/line',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({text,stage,transcript:W.state.transcript.slice(-8).map(l=>({who:l.who,text:String(l.text).slice(0,400)}))})});
    clearTimeout(tm); if(res.ok) r=await res.json(); }catch(e){}
  await thinking; if(!alive(g)) return;
  const line=(r&&typeof r.line==='string'&&r.line.trim())? r.line.trim() : SAFE[stage]||L.nudge;
  log(r&&r.source==='claude'?'decide':'block',`reply · ${r&&r.source||'offline safe line'} · ${Date.now()-t0} ms`,line);
  const act=r&&r.action; if(act&&PREVIEW[act]&&!W.state.actions[act]){ const [app,title,detail]=PREVIEW[act]; action(act,{app,title,detail,status:'preview'}); }
  await say('watari',line,g); }

E.reset=()=>{ G++; E.pend=null; E.queue=null; E.sorry=0; if(E.paused) E.pause(false); W.bus.emit('play',{cmd:'stop'}); Object.assign(W.state,blank()); W.bus.emit('reset',{}); scene('calm'); mood('idle'); };
E.pause=(on)=>{ if(!W.isMaster()){ W.bus.emit('input',{type:'pause',on}); return; } on=!!on; if(E.paused===on) return; E.paused=on; set('paused',on); W.bus.emit('pause',{on}); log(on?'block':'pass',on?'PAUSED · timers and audio frozen':'resumed'); };
E.start=async()=>{ if(!W.isMaster()) { W.bus.emit('input',{type:'start'}); return; } E.reset(); const g=++G; E.running=true;
  /* 1 · SIGNALS: what is due, what is there */
  scene('signals'); mood('focus','Scanning cash · 3 days ahead'); log('phase','UNDERSTAND','cash 3 days ahead');
  await wait(700); if(!alive(g)) return;
  signal({id:'bal',src:'kbc',title:'KBC business account',sub:'Balance today',amt:C.balance,tone:'pos'}); log('read','kbc.accounts.balance()',W.eur(C.balance)); sfx('tick'); await wait(1300); if(!alive(g)) return;
  signal({id:'pay',src:'sdworx',title:'SD Worx payroll run',sub:`${C.payday} · ${C.people} people`,amt:-C.payroll,tone:'neg'}); log('read','sdworx.payroll.next()',`${C.payday} · ${W.eur(C.payroll)}`); sfx('tick'); await wait(1300); if(!alive(g)) return;
  set('gap',{balance:C.balance,payroll:C.payroll,gap:C.gap}); W.bus.emit('gap',W.state.gap); log('rule',`shortfall ${W.eur(C.gap)} on ${C.payday}`,'payroll must never fail'); sfx('alert'); await wait(1400); if(!alive(g)) return;
  /* 2 · CAUSE */
  log('phase','FIND THE CAUSE','who owes us'); W.bus.emit('search',{src:'attio',q:'open invoices > 30 days'}); log('call','attio.invoices.search(overdue > 30d)'); await wait(1200); if(!alive(g)) return;
  W.bus.emit('search',{src:'peppol',q:`${C.client.invoice} delivery status`}); log('call',`peppol.status(${C.client.invoice})`,'delivered 10 Sep · not paid'); await wait(1100); if(!alive(g)) return;
  set('cause',{...C.client}); W.bus.emit('cause',W.state.cause); signal({id:'inv',src:'colruyt',title:`${C.client.name} · ${C.client.invoice}`,sub:`${C.client.daysLate} days late`,amt:C.client.amount,tone:'late'}); log('pass',`cause: ${C.client.name} owes ${W.eur(C.client.amount)}`,`${C.client.daysLate} days late`); sfx('chime'); await wait(1200); if(!alive(g)) return;
  /* 3 · DECIDE */
  scene('alert'); mood('alert','Payroll at risk'); log('phase','ADAPT','how to reach Larry'); await wait(600);
  log('rule','options: mail (too slow), push (too weak), call (3 days left)'); await wait(700);
  log('pass','calendar: Larry in focus block, urgency overrides','call now'); await wait(700); if(!alive(g)) return;
  log('decide','CALL Larry · Watari voice · from KBC'); W.bus.emit('dial',{}); scene('dialing'); await wait(1500); if(!alive(g)) return;
  /* 4 · RING */
  scene('ringing'); set('call','ringing'); W.bus.emit('call',{status:'ringing'}); W.bus.emit('play',{cmd:'ring',on:true}); log('call','voice.call(+32 4·· ··· ··· Larry)','ringing');
  const ans=await waitFor(['answer','decline'],{},g); if(!alive(g)) return; W.bus.emit('play',{cmd:'ring',on:false});
  if(ans.type==='decline'){ set('call','ended'); W.bus.emit('call',{status:'ended'}); log('block','Larry declined · fallback to push'); return; }
  /* 5 · CALL */
  scene('call'); set('call','active'); set('callStart',Date.now()); W.bus.emit('call',{status:'active',start:W.state.callStart}); log('phase','ACT','voice call live');
  await wait(600); await say('watari',L.w1,g); if(!alive(g)) return;
  let stage='await1', loops=0, approved=false;
  while(alive(g) && loops<14){ loops++;
    const sim = stage==='await1'?'Okay. What do we do?' : stage==='await2'?'Do it.':null;
    const inp=await waitFor(stage==='approve'?['approve','declineNotif','hangup']:['hangup'],{simText:sim,simDelay:stage==='await1'?900:1000},g); if(!alive(g)) return;
    if(inp.type==='hangup'){ break; }
    // live STT gave nothing usable: one short "say that again" (rare), then carry on with the best guess
    if(inp.type==='utter' && inp.live && E.sorry<2 && (!/[a-z]{2,}/i.test(inp.text) || (typeof inp.conf==='number' && inp.conf<0.45))){ E.sorry++; log('block','unclear speech',`"${inp.text}" · conf ${inp.conf}`); await say('watari',L.sorry,g); continue; }
    if(stage==='approve'){
      if(inp.type==='approve'){ approved=true; action('credit',{status:'running'}); await think(['approval signed in KBC Mobile · Face ID','draw credit line '+W.eur(C.credit.draw),'fund SD Worx payroll account'],g); break; }
      if(inp.type==='declineNotif'){ notif({id:'approve',status:'declined'}); await say('watari',L.declined,g); stage='chaseOnly'; break; }
      if(inp.type==='utter'){ const it=W.intent(inp.text); if(it==='cost'){ await say('watari',L.cost,g); continue; } if(it==='why'){ await say('watari',L.why,g); continue; } if(it==='deny'){ notif({id:'approve',status:'dismissed'}); await say('watari',L.declined,g); stage='chaseOnly'; break; }
        if(it==='other'){ await deviate(inp.text,stage,g); continue; } continue; }
    }
    const it=W.intent(inp.text);
    await think(stage==='await1'?[`heard: "${inp.text}"`,`intent: ${it}`,'payroll gap '+W.eur(C.gap)+' in 3 days','KBC credit line: '+W.eur(C.credit.limit)+' free','cheapest fix: chase + bridge']:[`heard: "${inp.text}"`,`intent: ${it}`],g); if(!alive(g)) return;
    if(it==='deny'){ await say('watari',L.deny,g); stage='chaseOnly'; break; }
    if(it==='cost'){ await say('watari',L.cost,g); continue; }
    if(it==='why'){ await say('watari',L.why,g); continue; }
    if(it==='other'){ await deviate(inp.text,stage,g); continue; }
    if(stage==='await1' || (stage==='await2' && it==='what')){
      // the proposal: big screen previews the work while Watari speaks
      W.bus.emit('proposal',{});
      action('mail',{app:'outlook',title:`Reminder to ${C.client.short} AP`,detail:`${C.client.invoice} · ${W.eur(C.client.amount)} · ${C.client.daysLate} days late`,status:'preview'});
      later(()=>alive(g)&&action('credit',{app:'kbc',title:'Bridge with KBC credit line',detail:`${W.eur(C.credit.draw)} · ~${W.eur(C.credit.fee)} · repay when paid`,status:'preview'}),2600);
      later(()=>alive(g)&&action('payroll',{app:'sdworx',title:'Fund Friday payroll',detail:`${C.people} people · ${W.eur(C.payroll)}`,status:'preview'}),4300);
      await say('watari',L.w2,g); stage='await2'; continue; }
    if(stage==='await2' && it==='affirm'){
      set('notifs',[{id:'approve'}]); notif({id:'approve',app:'kbc',title:'Approve credit line draw',body:`${W.eur(C.credit.draw)} until ${C.client.short} pays · est. cost ${W.eur(C.credit.fee)} · repay anytime`,actions:['Approve','Decline'],status:'shown'});
      log('call','kbc.consent.request(credit.draw)','founder approval required > €10.000');
      W.bus.emit('play',{cmd:'sfx',name:'notif'}); await say('watari',L.wConfirm,g); stage='approve';
      later(()=>{ if(alive(g)&&E.pend&&autoUser()) W.bus.emit('autotap',{t:'approve'}); },2200); continue; }
    await say('watari',L.nudge,g);
  }
  if(!alive(g)) return;
  /* 6 · DONE + HANG UP */
  const covered = approved;
  if(covered){ notif({id:'approve',status:'approved'}); action('credit',{status:'done',detail:`${W.eur(C.credit.draw)} drawn · ${C.credit.rate}`}); action('payroll',{status:'done',detail:`Covered · ${C.payday}`}); ledger('payroll','covered'); await say('watari',L.w3,g); }
  if(!alive(g)) return; await wait(700);
  W.bus.emit('play',{cmd:'stop'}); W.bus.emit('play',{cmd:'sfx',name:'end'}); set('call','ended'); W.bus.emit('call',{status:'ended',dur:Math.round((Date.now()-W.state.callStart)/1000)}); log('pass','call ended');
  await wait(900); if(!alive(g)) return;
  /* 7 · WORK: Watari keeps going on the big screen, now with app sounds */
  scene('work'); mood('focus','Working in the background'); log('phase','EXECUTE','5 partners, in parallel');
  const steps=[
    ['mail',{app:'outlook',title:`Reminder sent to ${C.client.short}`,detail:`From ${C.founder.toLowerCase()}@kodo.be · ${C.client.invoice} attached · polite, firm`,status:'running'}, 'send', 1600],
    ['mail',{status:'done'}, 'send', 500],
    ...(covered?[['credit',{status:'done'}, 'success', 700],['payroll',{status:'done',detail:`Funded · ${C.people} people paid ${C.payday}`}, 'success', 900]]:[]),
    ['crm',{app:'attio',title:`Logged on ${C.client.short} in Attio`,detail:'Note + task "check payment Thu"',status:'running'}, 'click', 1000],
    ['crm',{status:'done'}, 'tick', 500],
    ['cal',{app:'calendar',title:'Follow-up booked',detail:'Thu 09:00 · auto-cancels if paid',status:'running'}, 'click', 900],
    ['cal',{status:'done'}, 'tick', 500],
    ...(covered?[['repay',{app:'kbc',title:'Auto-repay armed',detail:`Repays ${W.eur(C.credit.draw)} the moment ${C.client.short} pays`,status:'done'}, 'chime', 900]]:[]),
  ];
  for(const [aid,patch,snd,ms] of steps){ if(!alive(g)) return; action(aid,patch); sfx(snd); log(patch.status==='done'?'pass':'call',`${aid}: ${patch.title||patch.status}`); await wait(ms); }
  if(covered){ notif({id:'kbc-done',app:'kbc',title:'Credit line active',body:`${W.eur(C.credit.draw)} drawn · SD Worx payroll funded for ${C.payday}`,status:'shown',lock:true});
    await wait(500); notif({id:'w-done',app:'watari',title:'Payroll covered',body:`Your team gets paid ${C.payday}. Reminder sent to ${C.client.short}.`,status:'shown',lock:true}); }
  ledger('timeSaved','2h 10m'); ledger('fee',C.credit.fee); ledger('kbcCredit',covered?C.credit.draw:0);
  scene('end'); mood('done','Payroll covered'); log('decide', covered?'DONE · payroll covered · client chased':'DONE · client chased · check Thursday'); sfx('success'); E.running=false;
};
E.answer=()=>W.bus.emit('input',{type:'answer'});
E.approve=()=>W.bus.emit('input',{type:'approve'});
// operator types a deviating line (T), or N speaks the next scripted line: typed out on screen, then handled like STT
E.say=async(text)=>{ if(!E.pend) return; const p=E.pend; E.pend=null; const t=await userSays(text,G); p.resolve({type:'utter',text:t}); };
E.simNext=()=>{ if(E.pend&&E.pend.hint) E.say(E.pend.hint); };
W.bus.on('input',d=>{ if(!W.isMaster()) return; if(d.type==='start') E.start(); if(d.type==='reset') E.reset(); if(d.type==='pause') E.pause(d.on==null?!E.paused:d.on); });

/* ---------------- pause indicator (injected, so index.html needs no change) ---------------- */
W.bus.on('pause',d=>{ if(W.role!=='stage') return; let el=document.getElementById('w-paused');
  if(!el){ el=document.createElement('div'); el.id='w-paused'; el.setAttribute('role','status'); el.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:10000;padding:8px 16px;border-radius:999px;background:#0b1f33;color:#fff;font:600 14px/1 Inter,system-ui,sans-serif;box-shadow:0 6px 24px rgba(11,31,51,.25);display:none'; el.textContent='Paused · press P to resume'; document.body.appendChild(el); }
  el.style.display=d.on?'block':'none'; });

/* ---------------- operator keys (stage) ----------------
   Space start/answer · A answer · N speak next scripted line · Y approve · H hang up · R reset · P pause/resume
   M auto user voice on/off · T type your own line (deviation test) · U arm audio · B backup video                         */
if(W.role==='stage') window.addEventListener('keydown',e=>{ if(/input|textarea/i.test(e.target.tagName)) return;
  const k=e.key.toLowerCase();
  if(k==='p'){ E.pause(!E.paused); return; }
  if(k===' '){ e.preventDefault(); W.state.scene==='calm'||W.state.scene==='end'? E.start(): (W.state.call==='ringing'?E.answer():null); }
  if(k==='a') E.answer(); if(k==='y') E.approve(); if(k==='h') W.bus.emit('input',{type:'hangup'}); if(k==='r') E.reset();
  if(k==='m'){ E.auto=!E.auto; W.bus.emit('auto',{on:E.auto},{localOnly:true}); }
  if(k==='u') A.arm(); if(k==='b') W.bus.emit('backup',{},{localOnly:true});
  if(k==='1'||k==='n') E.simNext();
  if(k==='t'){ W.promptLine&&W.promptLine(); }
});
})(window.W=window.W||{});
