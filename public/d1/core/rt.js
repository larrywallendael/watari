/* WATARI · realtime transport for Demo 1 (loaded by call.js, needs core/peerjs.min.js)
   1. WebRTC data channel via PeerJS (free public cloud signaling). Stage = peer `watari2-<room>-stage`,
      phone connects to it, heartbeats every second, reconnects on its own.
   2. ntfy.sh relay, low rate, control events only, used when the data channel is down or a critical
      message is not acked within 1.2 s. Topic `watari2-<room>-<secret>`. Deduped by message id in call.js.
   Overrides: ?room=  ?peerhost=host:port (local peerjs-server)  ?ntfyhost=http://host:port  ?relay=0  ?p2p=0  */
(function(W){
'use strict';
if(W.rt) return;
const qs=new URLSearchParams(location.search);
const ls={get:k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set:(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} }};
const room=((qs.get('room')||ls.get('watari2-room')||'kbc').toLowerCase().replace(/[^a-z0-9-]/g,'')||'kbc');
if(qs.get('room')) ls.set('watari2-room',room);
const SECRET='r7Kq2vX9mPz4'; // keeps strangers off the public ntfy topic
const role=W.role;
const STAGE_ID=`watari2-${room}-stage`;
const CRIT=new Set(['input','call','notif','utter','pause','reset','play','snapshot','hello']);
const RELAYABLE=new Set(['input','scene','call','notif','snapshot','say','utter','say-end','play','pause','reset','hello','presence','await','barge']);
const now=()=>Date.now();

const R=W.rt={room, stageId:STAGE_ID, mode:'connecting', dc:false, relay:false, stats:{rtt:null, offset:0, sentDc:0, sentRelay:0, rxDc:0, rxRelay:0, reconnects:0, ring:null}, conns:new Set()};
const log=(...a)=>{ if(qs.get('rtlog')==='1') console.log('[rt]',...a); };
function setMode(){ const dc=[...R.conns].some(c=>c.open && c._alive); R.dc=dc; const m=dc?'dc':(R.relay?'relay':'offline'); if(m!==R.mode){ R.mode=m; log('mode',m); W.bus&&W.bus.emit('rt',{mode:m,room},{localOnly:true}); } }

/* ------------- ntfy relay ------------- */
const NB=(qs.get('ntfyhost')||'https://ntfy.sh').replace(/\/$/,'');
const TOPIC=`watari2-${room}-${SECRET}`;
const bucket={tokens:40,cap:40,last:now()}; // ntfy.sh: ~60 burst, slow refill; stay well under it
function take(){ const n=now(); bucket.tokens=Math.min(bucket.cap,bucket.tokens+(n-bucket.last)/2000); bucket.last=n; if(bucket.tokens>=1){ bucket.tokens--; return true; } return false; }
const relayQ=new Map(); let relayTimer=null; let lastPresence=0;
function compact(m){
  if(m.type==='snapshot'){ const s=m.data||{}; return {...m,data:{scene:s.scene,call:s.call,mood:s.mood,callStart:s.callStart,notif:s.notif,paused:s.paused,ledger:s.ledger,transcript:(s.transcript||[]).slice(-2)}}; }
  return m; }
function relayable(m){ if(!RELAYABLE.has(m.type)) return false; if(m.type==='say' && !m.data.final) return false; if(m.type==='play' && m.data.cmd==='sfx' && m.data.name!=='notif') return false;
  if(m.type==='presence'){ if(now()-lastPresence<8000) return false; lastPresence=now(); } return true; }
R.relaySend=(m)=>{ if(qs.get('relay')==='0' || !relayable(m)) return false;
  // coalesce by type+key so a burst keeps only the latest scene/call/presence
  const k=m.type==='input'||m.type==='utter'||m.type==='say'||m.type==='play'||m.type==='say-end'?m.mid:m.type; relayQ.set(k,m); flush(); return true; };
function flush(){ if(relayTimer) return; const go=()=>{ relayTimer=null; while(relayQ.size){ if(!take()){ relayTimer=setTimeout(go,600); return; } const [k,m]=relayQ.entries().next().value; relayQ.delete(k);
    const body=JSON.stringify(compact(m)); if(body.length>3900){ log('relay drop (size)',m.type); continue; }
    R.stats.sentRelay++; fetch(`${NB}/${TOPIC}`,{method:'POST',body,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(e=>log('relay post fail',e&&e.message)); } }; go(); }
let es=null;
function subscribe(){ if(qs.get('relay')==='0' || typeof EventSource==='undefined') return; try{ es&&es.close(); }catch(e){}
  try{ es=new EventSource(`${NB}/${TOPIC}/sse`); }catch(e){ return; }
  es.onopen=()=>{ R.relay=true; setMode(); };
  es.onerror=()=>{ R.relay=false; setMode(); if(es.readyState===2) setTimeout(subscribe,4000); };
  es.onmessage=e=>{ try{ const n=JSON.parse(e.data); if(n.event&&n.event!=='message') return; const m=JSON.parse(n.message); if(m&&m.type){ R.stats.rxRelay++; W._recv(m,'relay'); } }catch(_){} };
}

/* ------------- PeerJS data channel ------------- */
let peer=null, backoff=800, phoneConn=null, retryT=null;
const pending=new Map(); // mid -> timer waiting for ack
function wire(c){
  c._alive=false; c._rx=now();
  c.on('open',()=>{ c._alive=true; c._rx=now(); R.conns.add(c); backoff=800; setMode(); log('dc open',c.peer);
    if(role==='phone') sendRaw(c,{k:'m',m:W._mk('hello',{role,via:'dc'})}); });
  c.on('data',d=>{ c._rx=now(); if(!c._alive){ c._alive=true; setMode(); }
    if(!d||typeof d!=='object') return;
    if(d.k==='hb'){ sendRaw(c,{k:'hb2',ts:d.ts,srv:now()}); return; }
    if(d.k==='hb2'){ const rtt=now()-d.ts; R.stats.rtt=rtt; R.stats.offset=d.srv+rtt/2-now(); return; }
    if(d.k==='ack'){ const t=pending.get(d.mid); if(t){ clearTimeout(t); pending.delete(d.mid); } return; }
    if(d.k==='m'&&d.m){ R.stats.rxDc++; if(CRIT.has(d.m.type)) sendRaw(c,{k:'ack',mid:d.m.mid}); W._recv(d.m,'dc'); } });
  const gone=()=>{ R.conns.delete(c); c._alive=false; setMode(); log('dc closed',c.peer); if(role==='phone' && c===phoneConn){ phoneConn=null; schedule(); } };
  c.on('close',gone); c.on('error',e=>{ log('conn error',e&&e.type); gone(); try{ c.close(); }catch(_){} });
}
function sendRaw(c,o){ try{ if(c.open){ c.send(o); return true; } }catch(e){} return false; }
function peerOpts(){ const o={debug:0}; const h=qs.get('peerhost'); if(h){ const [host,port]=h.split(':'); Object.assign(o,{host,port:+port||9000,path:qs.get('peerpath')||'/',secure:location.protocol==='https:'&&!/^(127\.|localhost)/.test(host)}); } return o; }
function schedule(){ clearTimeout(retryT); retryT=setTimeout(()=>{ R.stats.reconnects++; connect(); },backoff); backoff=Math.min(5000,backoff*1.6); }
function connect(){
  if(qs.get('p2p')==='0' || !window.peerjs) return;
  if(R.blocked){ schedule(); return; }
  if(role==='phone' && peer && !peer.destroyed && !peer.disconnected && peer.open){ dial(); return; }
  try{ peer&&peer.destroy(); }catch(e){}
  try{ peer= role==='stage' ? new peerjs.Peer(STAGE_ID,peerOpts()) : new peerjs.Peer(undefined,peerOpts()); }catch(e){ log('peer ctor',e); schedule(); return; }
  peer.on('open',id=>{ log('peer open',id); backoff=800; if(role==='phone') dial(); });
  peer.on('connection',c=>{ if(role!=='stage') return; if(R.blocked){ setTimeout(()=>{ try{ c.close(); }catch(e){} },50); return; } wire(c); });
  peer.on('disconnected',()=>{ log('signaling lost'); setTimeout(()=>{ try{ if(peer && !peer.destroyed) peer.reconnect(); }catch(e){} },1000); });
  peer.on('error',e=>{ const t=e&&e.type; log('peer error',t);
    if(t==='peer-unavailable'){ phoneConn=null; schedule(); return; }            // stage not up yet
    if(t==='unavailable-id'||t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed'||t==='browser-incompatible'){ try{ peer.destroy(); }catch(_){} peer=null; schedule(); } });
}
function dial(){ if(phoneConn && (phoneConn.open||!phoneConn._dead)) { try{ phoneConn.close(); }catch(e){} }
  const c=peer.connect(STAGE_ID,{reliable:true,serialization:'json'}); phoneConn=c; wire(c);
  setTimeout(()=>{ if(c===phoneConn && !c.open){ c._dead=true; try{ c.close(); }catch(e){} phoneConn=null; schedule(); } },6000); }
// heartbeat + liveness: no data for 3.5 s = dead channel -> close -> reconnect (phone) / drop (stage)
setInterval(()=>{ for(const c of [...R.conns]){ if(!c.open){ R.conns.delete(c); continue; } sendRaw(c,{k:'hb',ts:now()});
    if(now()-c._rx>3500){ log('dc stale'); c._alive=false; try{ c.close(); }catch(e){} R.conns.delete(c); if(c===phoneConn){ phoneConn=null; schedule(); } } }
  setMode(); if(role==='phone' && !phoneConn && !retryT) schedule(); },1000);
// mobile Safari kills sockets in the background: reconnect as soon as the page is visible again
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ if(!R.dc){ backoff=300; connect(); } if(!R.relay) subscribe(); } });
window.addEventListener('online',()=>{ backoff=300; connect(); subscribe(); });

/* ------------- transport interface for the bus ------------- */
R.send=(m)=>{
  const open=[...R.conns].filter(c=>c.open && c._alive);
  if(open.length){ let ok=false; for(const c of open) ok=sendRaw(c,{k:'m',m})||ok; if(ok){ R.stats.sentDc++;
      if(CRIT.has(m.type)){ pending.set(m.mid,setTimeout(()=>{ pending.delete(m.mid); log('no ack, relay',m.type); R.relaySend(m); },1200)); }
      return; } }
  if(m.type==='level') return; // never relay audio levels or partials
  R.relaySend(m);
};
R.kill=()=>{ for(const c of [...R.conns]){ try{ c.close(); }catch(e){} } R.conns.clear(); setMode(); };   // test hook: drop the data channel
R.block=(on)=>{ R.blocked=!!on; if(on) R.kill(); };                                                    // test hook: keep it down
W._transports=W._transports||[]; W._transports.push(R);
subscribe(); connect();
})(window.W=window.W||{});
