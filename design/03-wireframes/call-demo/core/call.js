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
W.logo=(id,size=34)=>{ const p=W.PARTNERS[id]||{name:id,color:'#ccd',fg:'#123',mark:id.slice(0,2)};
  return `<span class="wlogo" style="--lg:${p.color};--lf:${p.fg};width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px" title="${p.name}">${W.LOGOS?`<img src="${W.base}logos/${id}.svg" alt="" onerror="this.remove()">`:''}<b>${p.mark}</b></span>`; };
W.LOGOS=qs.get('logos')==='1'; // drop official SVGs in core/logos/ then open with ?logos=1
W.base=(document.currentScript&&document.currentScript.src.replace(/call\.js.*$/,''))||'core/';

/* ---------------- bus ---------------- */
const handlers={}; const id=Math.random().toString(36).slice(2,8);
let bc=null; try{ bc=new BroadcastChannel('watari-call-v1'); }catch(e){}
function deliver(m){ (handlers[m.type]||[]).concat(handlers['*']||[]).forEach(f=>{ try{ f(m.data,m); }catch(e){ console.error(e); } }); }
W.bus={
  on(t,f){ (handlers[t]=handlers[t]||[]).push(f); return W.bus; },
  emit(type,data={},opt={}){ const m={type,data,from:id,ts:Date.now()}; if(!opt.remoteOnly) deliver(m); if(!opt.localOnly) post(m); return m; },
};
function post(m){ if(bc){ try{ bc.postMessage(m); return; }catch(e){} } try{ localStorage.setItem('watari-bus',JSON.stringify(m)); }catch(e){} }
if(bc) bc.onmessage=e=>{ if(e.data&&e.data.from!==id) deliver(e.data); };
window.addEventListener('storage',e=>{ if(e.key==='watari-bus'&&e.newValue){ try{ const m=JSON.parse(e.newValue); if(m.from!==id) deliver(m); }catch(_){} } });

/* ---------------- roles + presence ---------------- */
W.role=qs.get('role')||(document.documentElement.dataset.role)||'stage';
W.peers={phone:0,stage:0};
W.phoneLinked=()=>Date.now()-W.peers.phone<2500;
W.bus.on('presence',d=>{ W.peers[d.role]=Date.now(); W.bus.emit('peers',{...W.peers},{localOnly:true}); });
setInterval(()=>W.bus.emit('presence',{role:W.role},{remoteOnly:true}),800);
W.bus.emit('presence',{role:W.role},{remoteOnly:true});
// master = the stage; a phone opened alone becomes its own master (standalone sim on the iPhone)
W.isMaster=()=> W.role==='stage' || (W.role==='phone' && Date.now()-W.peers.stage>2500);

/* ---------------- audio: synthesised, nothing to download ---------------- */
const A=W.audio={ctx:null, armed:false, muted:false, voice:null, ringing:false};
A.arm=()=>{ try{ A.ctx=A.ctx||new (window.AudioContext||window.webkitAudioContext)(); A.ctx.resume(); const o=A.ctx.createOscillator(),g=A.ctx.createGain(); g.gain.value=0.0001; o.connect(g).connect(A.ctx.destination); o.start(); o.stop(A.ctx.currentTime+.05);}catch(e){}
  try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){}
  A.armed=true; pickVoice(); W.bus.emit('armed',{role:W.role},{localOnly:true}); };
function pickVoice(){ try{ const vs=speechSynthesis.getVoices(); const pref=['Daniel','Google UK English Male','Arthur','Microsoft Ryan','Oliver','en-GB','Samantha','en-US'];
  for(const p of pref){ const v=vs.find(v=>v.name.includes(p)||v.lang===p); if(v){ A.voice=v; return; } } }catch(e){} }
try{ speechSynthesis.onvoiceschanged=pickVoice; }catch(e){}
function tone(f,t0,dur,type='sine',vol=.18,attack=.005){ const c=A.ctx; const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0);
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+attack); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0+dur+.05); }
let ringTimer=null;
A.ring=(on)=>{ clearInterval(ringTimer); A.ringing=on; if(!on||!A.ctx||A.muted) return;
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
A.say=(text,sid)=>new Promise(res=>{
  const words=text.split(/\s+/).length, est=words/2.75*1000+600; let done=false, iv=null, t0=Date.now();
  const fin=()=>{ if(done) return; done=true; clearInterval(iv); W.bus.emit('level',{who:'watari',v:0}); W.bus.emit('say-end',{sid}); res(); };
  iv=setInterval(()=>{ const ph=(Date.now()-t0)/1000; const v=.35+.45*Math.abs(Math.sin(ph*9.1))*(.6+.4*Math.sin(ph*2.3))+Math.random()*.2; W.bus.emit('level',{who:'watari',v:Math.min(1,v)}); },70);
  W.bus.emit('say-start',{sid,text});
  let spoke=false;
  if(A.armed && !A.muted && window.speechSynthesis){ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); if(A.voice) u.voice=A.voice; u.lang=(A.voice&&A.voice.lang)||'en-GB'; u.rate=1.03; u.pitch=.96;
    u.onboundary=()=>W.bus.emit('level',{who:'watari',v:1}); u.onend=fin; u.onerror=fin; speechSynthesis.speak(u); spoke=true; setTimeout(fin,est*1.8+2500); }catch(e){} }
  if(!spoke) setTimeout(fin,est/(W.SPEED||1));
});
A.stopSpeech=()=>{ try{ speechSynthesis.cancel(); }catch(e){} };
// whoever owns the audio executes play commands
W.audioHere=()=> W.role==='phone' || !W.phoneLinked();
W.bus.on('play',async d=>{ if(!W.audioHere()) return; if(d.cmd==='ring') A.ring(d.on); if(d.cmd==='sfx') A.sfx(d.name); if(d.cmd==='say') await A.say(d.text,d.sid); if(d.cmd==='stop'){ A.ring(false); A.stopSpeech(); } });
W.bus.on('sfx',d=>{ if(W.role==='stage' && W.state.scene!=='call' && W.state.scene!=='ringing') A.sfx(d.name); });

/* ---------------- state snapshot (late joiners sync from it) ---------------- */
W.state={scene:'calm', call:'idle', mood:'idle', signals:[], transcript:[], actions:{}, notifs:[], ledger:{}, gap:null, cause:null, callStart:0};
W.bus.on('snapshot',d=>{ if(!W.isMaster()) { Object.assign(W.state,d); W.bus.emit('resync',W.state,{localOnly:true}); } });
W.bus.on('hello',()=>{ if(W.isMaster()) W.bus.emit('snapshot',W.state,{remoteOnly:true}); });
setTimeout(()=>W.bus.emit('hello',{role:W.role},{remoteOnly:true}),150);

/* ---------------- engine (runs on the master only) ---------------- */
const E=W.engine={gen:0, auto:qs.get('auto')!=='0', running:false, pend:null};
const SP=+qs.get('speed')||1; W.SPEED=SP; const wait=ms=>new Promise(r=>setTimeout(r,ms/SP));
let G=0; const alive=g=>g===G;
function set(k,v){ W.state[k]=v; }
function scene(name){ set('scene',name); W.bus.emit('scene',{name}); }
function mood(m,label){ set('mood',m); W.bus.emit('mood',{mood:m,label}); }
function log(kind,text,detail){ W.bus.emit('log',{kind,text,detail,t:Date.now()}); }
function signal(s){ W.state.signals.push(s); W.bus.emit('signal',s); }
function action(id,patch){ const a=W.state.actions[id]={...(W.state.actions[id]||{id}),...patch}; W.bus.emit('action',a); }
function ledger(k,v){ W.state.ledger[k]=v; W.bus.emit('ledger',{k,v}); }
function sfx(name){ W.bus.emit('sfx',{name}); }
async function say(who,text,g){ const sid=Math.random().toString(36).slice(2,7);
  const line={who,text,sid,final:true}; W.state.transcript.push(line);
  if(who==='watari'){ mood('speaking'); W.bus.emit('say',{who,text,sid,partial:false,final:true});
    const p=new Promise(r=>{ const off=d=>{ if(d.sid===sid){ r(); } }; W.bus.on('say-end',off); });
    W.bus.emit('play',{cmd:'say',text,sid}); await Promise.race([p,wait(text.split(/\s+/).length/2.75*1000*2+4000)]); if(alive(g)) mood('listening'); return; }
}
// user speech: in live mode this comes from Soniox on the phone; in sim mode we type it out
async function userSays(text,g){ mood('listening'); const sid='u'+Math.random().toString(36).slice(2,6); const ws=text.split(' '); let cur='';
  for(let i=0;i<ws.length;i++){ if(!alive(g)) return; cur+=(i?' ':'')+ws[i]; W.bus.emit('say',{who:'user',text:cur,sid,partial:true,final:false}); W.bus.emit('level',{who:'user',v:.5+Math.random()*.5}); await wait(260+Math.random()*120); }

  W.bus.emit('level',{who:'user',v:0}); W.state.transcript.push({who:'user',text,sid,final:true}); W.bus.emit('say',{who:'user',text,sid,partial:false,final:true});
  return text; }
W.bus.on('utter',d=>{ if(W.isMaster() && E.pend && d.from!=='engine') { if(d.partial) return; E.say(d.text); } });
W.bus.on('input',d=>{ if(!W.isMaster()) return; if(E.pend && (E.pend.accept.includes(d.type))) E.pend.resolve(d); });
function waitFor(accept,{simText,simDelay=1100}={},g){ return new Promise(resolve=>{ E.pend={hint:simText,accept:[...accept,'utter'],resolve:v=>{ E.pend=null; clearTimeout(tm); resolve(v);} };
  let tm=null; if(E.auto && simText) tm=setTimeout(async()=>{ /*sim*/ if(!alive(g)||!E.pend) return; const p=E.pend; E.pend=null; const t=await userSays(simText,g); if(alive(g)) p.resolve({type:'utter',text:t,sim:true}); },simDelay/SP);
  W.bus.emit('await',{accept, hint:simText||null}); }); }
W.intent=(t)=>{ t=(t||'').toLowerCase();
  if(/(cost|how much|price|interest|fee|expensive)/.test(t)) return 'cost';
  if(/(who|which client|why|what happened|how come)/.test(t)) return 'why';
  if(/\b(no|nope|don'?t|stop|not now|nee|non|cancel)\b/.test(t)) return 'deny';
  if(/\b(do it|yes|yeah|yep|go( ahead)?|sure|approve|please|let'?s|ja|oui|vas-y|doe maar|ok do|fine)\b/.test(t)) return 'affirm';
  return 'what'; };
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
};
W.LINES=L;

E.reset=()=>{ G++; E.pend=null; W.bus.emit('play',{cmd:'stop'}); Object.assign(W.state,{scene:'calm',call:'idle',mood:'idle',signals:[],transcript:[],actions:{},notifs:[],ledger:{},gap:null,cause:null,callStart:0}); W.bus.emit('reset',{}); scene('calm'); mood('idle'); };
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
  while(alive(g) && loops<8){ loops++;
    const sim = stage==='await1'?'Okay. What do we do?' : stage==='await2'?'Do it.':null;
    const inp=await waitFor(stage==='approve'?['approve','declineNotif','hangup']:['hangup'],{simText:sim,simDelay:stage==='await1'?900:1000},g); if(!alive(g)) return;
    if(inp.type==='hangup'){ break; }
    if(stage==='approve'){
      if(inp.type==='approve'){ approved=true; action('credit',{status:'running'}); await think(['approval signed in KBC Mobile · Face ID','draw credit line '+W.eur(C.credit.draw),'fund SD Worx payroll account'],g); break; }
      if(inp.type==='declineNotif'){ await say('watari',L.declined,g); stage='chaseOnly'; break; }
      if(inp.type==='utter'){ const it=W.intent(inp.text); if(it==='cost'){ await say('watari',L.cost,g); continue; } if(it==='why'){ await say('watari',L.why,g); continue; } if(it==='deny'){ W.bus.emit('notif',{id:'approve',status:'dismissed'}); await say('watari',L.declined,g); stage='chaseOnly'; break; } continue; }
    }
    const it=W.intent(inp.text);
    await think(stage==='await1'?[`heard: "${inp.text}"`,`intent: ${it}`,'payroll gap '+W.eur(C.gap)+' in 3 days','KBC credit line: '+W.eur(C.credit.limit)+' free','cheapest fix: chase + bridge']:[`heard: "${inp.text}"`,`intent: ${it}`],g); if(!alive(g)) return;
    if(it==='deny'){ await say('watari',L.deny,g); stage='chaseOnly'; break; }
    if(it==='cost'){ await say('watari',L.cost,g); continue; }
    if(it==='why'){ await say('watari',L.why,g); continue; }
    if(stage==='await1' || (stage==='await2' && it==='what')){
      // the proposal: big screen previews the work while Watari speaks
      W.bus.emit('proposal',{});
      action('mail',{app:'outlook',title:`Reminder to ${C.client.short} AP`,detail:`${C.client.invoice} · ${W.eur(C.client.amount)} · ${C.client.daysLate} days late`,status:'preview'});
      setTimeout(()=>alive(g)&&action('credit',{app:'kbc',title:'Bridge with KBC credit line',detail:`${W.eur(C.credit.draw)} · ~${W.eur(C.credit.fee)} · repay when paid`,status:'preview'}),2600/SP);
      setTimeout(()=>alive(g)&&action('payroll',{app:'sdworx',title:'Fund Friday payroll',detail:`${C.people} people · ${W.eur(C.payroll)}`,status:'preview'}),4300/SP);
      await say('watari',L.w2,g); stage='await2'; continue; }
    if(stage==='await2' && it==='affirm'){
      set('notifs',[{id:'approve'}]); W.bus.emit('notif',{id:'approve',app:'kbc',title:'Approve credit line draw',body:`${W.eur(C.credit.draw)} until ${C.client.short} pays · est. cost ${W.eur(C.credit.fee)} · repay anytime`,actions:['Approve','Decline'],status:'shown'});
      log('call','kbc.consent.request(credit.draw)','founder approval required > €10.000');
      W.bus.emit('play',{cmd:'sfx',name:'notif'}); await say('watari',L.wConfirm,g); stage='approve';
      if(E.auto){ setTimeout(()=>{ if(alive(g)&&E.pend) W.bus.emit('autotap',{t:'approve'}); },2200/SP); } continue; }
    await say('watari',L.nudge,g);
  }
  if(!alive(g)) return;
  /* 6 · DONE + HANG UP */
  const covered = approved;
  if(covered){ W.bus.emit('notif',{id:'approve',status:'approved'}); action('credit',{status:'done',detail:`${W.eur(C.credit.draw)} drawn · ${C.credit.rate}`}); action('payroll',{status:'done',detail:`Covered · ${C.payday}`}); ledger('payroll','covered'); await say('watari',L.w3,g); }
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
  if(covered){ W.bus.emit('notif',{id:'kbc-done',app:'kbc',title:'Credit line active',body:`${W.eur(C.credit.draw)} drawn · SD Worx payroll funded for ${C.payday}`,status:'shown',lock:true});
    await wait(500); W.bus.emit('notif',{id:'w-done',app:'watari',title:'Payroll covered',body:`Your team gets paid ${C.payday}. Reminder sent to ${C.client.short}.`,status:'shown',lock:true}); }
  ledger('timeSaved','2h 10m'); ledger('fee',C.credit.fee); ledger('kbcCredit',covered?C.credit.draw:0);
  scene('end'); mood('done','Payroll covered'); log('decide', covered?'DONE · payroll covered · client chased':'DONE · client chased · check Thursday'); sfx('success'); E.running=false;
};
E.answer=()=>W.bus.emit('input',{type:'answer'});
E.approve=()=>W.bus.emit('input',{type:'approve'});
// operator types a deviating line, or the phone's STT sends a final transcript (live mode)
E.say=async(text)=>{ if(!E.pend) return; const p=E.pend; E.pend=null; const t=await userSays(text,G); p.resolve({type:'utter',text:t}); };
E.simNext=()=>{ if(E.pend&&E.pend.hint) E.say(E.pend.hint); };
W.bus.on('input',d=>{ if(d.type==='start' && W.isMaster()) E.start(); if(d.type==='reset' && W.isMaster()) E.reset(); });

/* ---------------- operator keys (stage) ----------------
   Space start/answer · A answer · N speak next scripted line · Y approve · H hang up · R reset
   M auto user voice on/off · T type your own line (deviation test) · U arm audio · B backup video                         */
if(W.role==='stage') window.addEventListener('keydown',e=>{ if(/input|textarea/i.test(e.target.tagName)) return;
  const k=e.key.toLowerCase();
  if(k===' '){ e.preventDefault(); W.state.scene==='calm'||W.state.scene==='end'? E.start(): (W.state.call==='ringing'?E.answer():null); }
  if(k==='a') E.answer(); if(k==='y') E.approve(); if(k==='h') W.bus.emit('input',{type:'hangup'}); if(k==='r') E.reset();
  if(k==='m'){ E.auto=!E.auto; W.bus.emit('auto',{on:E.auto},{localOnly:true}); }
  if(k==='u') A.arm(); if(k==='b') W.bus.emit('backup',{},{localOnly:true});
  if(k==='1'||k==='n') E.simNext();
  if(k==='t'){ W.promptLine&&W.promptLine(); }
});
})(window.W=window.W||{});
