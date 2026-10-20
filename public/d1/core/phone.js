/* WATARI · iPhone 16 surface. Same component renders (a) the real phone page on Larry's iPhone and
   (b) the mirror on the big screen. It only listens to bus events and sends taps back as 'input'.
   W.Phone.mount(el,{mode:'device'|'mirror', captions:true}) */
(function(W){
const P=W.Phone={};
const pad=n=>String(n).padStart(2,'0');
const now=()=>{ const d=new Date(); return d.getHours()+':'+pad(d.getMinutes()); };
const ico={
  phone:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.6a1 1 0 01-.25 1z"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3"/></svg>',
  keypad:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="1.7"/><circle cx="12" cy="5" r="1.7"/><circle cx="18" cy="5" r="1.7"/><circle cx="6" cy="11" r="1.7"/><circle cx="12" cy="11" r="1.7"/><circle cx="18" cy="11" r="1.7"/><circle cx="6" cy="17" r="1.7"/><circle cx="12" cy="17" r="1.7"/><circle cx="18" cy="17" r="1.7"/></svg>',
  speaker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/></svg>',
  add:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  torch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2h10l-2 6v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V8z"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  face:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M9 9v1M15 9v1M12 9v4h-1M9 16c1.6 1.2 4.4 1.2 6 0"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>',
};
const appIcon=(app)=> app==='kbc' ? '<span class="pn-app kbc">KBC</span>' : '<span class="pn-app watari"><i></i></span>';

P.mount=(root,opt={})=>{
  const mode=opt.mode||'mirror';
  root.classList.add('iphone',mode);
  root.innerHTML=`
  <div class="ip-frame"><div class="ip-btn b1"></div><div class="ip-btn b2"></div><div class="ip-btn b3"></div><div class="ip-btn b4"></div>
   <div class="ip-screen">
    <div class="ip-wall"></div>
    <div class="ip-status"><span class="st-time">${now()}</span><span class="ip-island"><span class="isl-dot"></span><span class="isl-txt"></span></span><span class="st-icons"><i class="sig"></i><i class="wifi"></i><i class="bat"><b></b></i></span></div>
    <section class="ip-lock">
      <div class="lk-date">${W.CFG.today}</div><div class="lk-time">${now()}</div>
      <div class="lk-widget"><div class="wg-h"><span class="wg-dot"></span>Today · ${W.CFG.company}<span class="wg-n">${W.CFG.todo.length}</span></div>${W.CFG.todo.map((t,i)=>`<div class="wg-row"><span class="wg-c ${i===0?'hot':''}"></span>${t}</div>`).join('')}</div>
      <div class="lk-stack"></div>
      <div class="lk-bottom"><span class="lk-round">${ico.torch}</span><span class="lk-bar"></span><span class="lk-round">${ico.cam}</span></div>
      <div class="lk-hint">${mode==='device'?'Double-tap to start the demo':''}</div>
    </section>
    <section class="ip-incoming" hidden>
      <div class="in-top"><div class="in-name">Watari</div><div class="in-sub">your CFO · via KBC</div></div>
      <div class="in-orb"><i></i></div>
      <div class="in-acts"><div class="in-small"><span>${ico.clock}</span>Remind Me</div><div class="in-small"><span>${ico.msg}</span>Message</div></div>
      <div class="in-btns"><button class="in-b dec" data-in="decline" aria-label="Decline">${ico.phone}</button><button class="in-b acc" data-in="answer" aria-label="Accept">${ico.phone}</button></div>
      <div class="in-lbl"><span>Decline</span><span>Accept</span></div>
    </section>
    <section class="ip-call" hidden>
      <div class="cl-top"><div class="cl-name">Watari</div><div class="cl-time">00:00</div></div>
      <div class="cl-orb"><canvas></canvas></div>
      <div class="cl-cap" ${opt.captions===false?'hidden':''}></div>
      <div class="cl-grid">
        <div class="cl-k"><span>${ico.speaker}</span>speaker</div><div class="cl-k"><span>${ico.video}</span>FaceTime</div><div class="cl-k"><span>${ico.mute}</span>mute</div>
        <div class="cl-k"><span>${ico.add}</span>add</div><div class="cl-k end"><span data-in="hangup">${ico.phone}</span>end</div><div class="cl-k"><span>${ico.keypad}</span>keypad</div>
      </div>
    </section>
    <div class="ip-banner" hidden></div>
    <div class="ip-ended" hidden>Call Ended</div>
    <div class="ip-arm" ${mode==='device'?'':'hidden'}><div><b>WATARI phone</b><span>Tap to arm audio</span><small>Allows sound, the microphone and keeps the screen awake.<br>Then set: Do Not Disturb on · Auto-Lock never · brightness max</small></div></div>
    <div class="ip-rt" hidden><i></i><span></span></div>
    <div class="ip-pause" hidden>Paused</div>
    <div class="ip-home"></div>
   </div>
  </div>`;
  const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
  const S={lock:$('.ip-lock'),inc:$('.ip-incoming'),call:$('.ip-call')};
  const show=k=>{ Object.entries(S).forEach(([n,el])=>el.hidden=n!==k); root.dataset.screen=k; };
  // clock
  setInterval(()=>{ $('.st-time').textContent= root.dataset.screen==='call'? $('.st-time').textContent : now(); $('.lk-time').textContent=now(); },1000);
  // taps
  root.addEventListener('click',e=>{ const b=e.target.closest('[data-in]'); if(!b) return; const t=b.dataset.in;
    if(t==='approve'){ faceId(()=>W.bus.emit('input',{type:'approve'})); return; }
    W.bus.emit('input',{type:t}); });
  // arm audio (device)
  $('.ip-arm').addEventListener('click',()=>{ W.audio.arm(); $('.ip-arm').hidden=true; try{ const r=document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen(); if(r&&r.catch) r.catch(()=>{}); }catch(e){} });
  // link + voice status pill (phone page only): green = data channel, amber = relay fallback, red = offline
  if(W.role==='phone'){ const pill=$('.ip-rt'); pill.hidden=false; const upd=()=>{ const rt=W.rt?W.rt.mode:'local', v=W.voice?W.voice.status():{}; const linked=Date.now()-W.peers.stage<(rt==='dc'?2500:20000);
      pill.dataset.s=!linked?'off':rt==='dc'?'ok':'warn'; pill.querySelector('span').textContent=`${linked?(rt==='dc'?'linked':'relay'):'no stage'} · ${W.rt?W.rt.room:''}${v.armed?' · mic '+(v.mic?'on':'off')+' · stt '+v.stt+(v.prefetched?' · voice '+v.prefetched:''):' · not armed'}`; };
    setInterval(upd,1000); W.bus.on('voice',upd); W.bus.on('rt',upd); upd(); }
  W.bus.on('pause',d=>{ $('.ip-pause').hidden=!d.on; });
  // double-tap lock screen = start (standalone or remote)
  let lastTap=0; S.lock.addEventListener('click',()=>{ const n=Date.now(); if(n-lastTap<350){ W.isMaster()? W.engine.start(): W.bus.emit('input',{type:'start'}); } lastTap=n; });
  // mini orb on the call screen (canvas, voice reactive)
  const cv=$('.cl-orb canvas'); const cx=cv.getContext('2d'); let lv=0, ph=0, who='watari';
  (function draw(){ const r=cv.getBoundingClientRect(); const d=Math.min(2,devicePixelRatio||1); if(cv.width!==Math.round(r.width*d)){ cv.width=r.width*d; cv.height=r.height*d; }
    const w=cv.width,h=cv.height; cx.clearRect(0,0,w,h); ph+=.05; lv*=.9; const R=Math.min(w,h)*.26*(1+lv*.25);
    for(let k=0;k<3;k++){ cx.beginPath(); for(let i=0;i<=64;i++){ const a=i/64*Math.PI*2; const n=1+(.05+lv*.22)*Math.sin(a*(3+k)+ph*(1+k*.4))*Math.sin(ph*.7+k); const x=w/2+Math.cos(a)*R*n*(1+k*.08), y=h/2+Math.sin(a)*R*n*(1+k*.08); i?cx.lineTo(x,y):cx.moveTo(x,y); }
      cx.closePath(); cx.strokeStyle=who==='user'?`rgba(196,181,253,${.7-k*.2})`:`rgba(110,200,255,${.75-k*.2})`; cx.lineWidth=d*(2-k*.5); cx.stroke(); }
    const g=cx.createRadialGradient(w/2,h/2,0,w/2,h/2,R); g.addColorStop(0,'rgba(255,255,255,.9)'); g.addColorStop(.5,who==='user'?'rgba(167,139,250,.45)':'rgba(0,174,239,.5)'); g.addColorStop(1,'rgba(0,80,160,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(w/2,h/2,R,0,7); cx.fill();
    requestAnimationFrame(draw); })();
  let tmr=null;
  function callTimer(start){ clearInterval(tmr); tmr=setInterval(()=>{ const s=Math.floor((Date.now()-start)/1000); const tt=pad(Math.floor(s/60))+':'+pad(s%60); $('.cl-time').textContent=tt; if(root.dataset.screen==='call') $('.isl-txt').textContent=tt; },250); }
  function island(text){ const i=$('.ip-island'); i.classList.toggle('wide',!!text); $('.isl-txt').textContent=text||''; }
  function faceId(cb){ const b=$('.ip-banner'); b.classList.add('fid'); b.querySelector('.pn-acts').innerHTML=`<div class="pn-fid">${ico.face}<span>Face ID</span></div>`; setTimeout(()=>{ b.querySelector('.pn-fid').innerHTML=`${ico.check}<span>Approved</span>`; b.classList.add('ok'); cb(); },900); }
  function banner(n){ const b=$('.ip-banner'); if(n.status==='approved'){ b.classList.add('ok'); setTimeout(()=>{ b.classList.add('out'); setTimeout(()=>{ b.hidden=true; b.className='ip-banner'; },400); },1400); return; }
    if(n.status==='dismissed'||n.status==='declined'){ b.hidden=true; b.className='ip-banner'; return; }
    b.className='ip-banner'; b.innerHTML=`<div class="pn-h">${appIcon(n.app)}<b>${n.app==='kbc'?'KBC Mobile':'Watari'}</b><span>now</span></div><div class="pn-t">${n.title}</div><div class="pn-b">${n.body}</div><div class="pn-acts">${(n.actions||[]).map((a,i)=>`<button data-in="${i===0?'approve':'declineNotif'}" class="${i===0?'pri':''}">${a}</button>`).join('')}</div>`; b.hidden=false; }
  function lockNotif(n){ const el=document.createElement('div'); el.className='pn lockn'; el.innerHTML=`<div class="pn-h">${appIcon(n.app)}<b>${n.app==='kbc'?'KBC Mobile':'Watari'}</b><span>now</span></div><div class="pn-t">${n.title}</div><div class="pn-b">${n.body}</div>`; $('.lk-stack').prepend(el); }
  function reset(){ show('lock'); $('.lk-stack').innerHTML=''; $('.ip-banner').hidden=true; $('.ip-ended').hidden=true; $('.cl-cap').innerHTML=''; island(''); clearInterval(tmr); root.classList.remove('ringing'); }
  W.bus.on('autotap',d=>{ const b=root.querySelector(`[data-in="${d.t}"]`); if(b && !root.closest('[hidden]')) b.click(); });
  W.bus.on('reset',reset);
  W.bus.on('call',d=>{ if(d.status==='ringing'){ show('inc'); root.classList.add('ringing'); island(''); }
    if(d.status==='active'){ show('call'); root.classList.remove('ringing'); callTimer(d.start||Date.now()); island('00:00'); }
    if(d.status==='ended'){ clearInterval(tmr); root.classList.remove('ringing'); $('.cl-time').textContent='Call Ended'; setTimeout(()=>{ show('lock'); island(''); },1600); } });
  W.bus.on('say',d=>{ const cap=$('.cl-cap'); if(!cap) return; let line=cap.querySelector(`[data-sid="${d.sid}"]`); if(!line){ line=document.createElement('p'); line.dataset.sid=d.sid; line.className=d.who; cap.append(line); while(cap.children.length>2) cap.firstElementChild.remove(); }
    line.textContent=d.text; line.classList.toggle('partial',!!d.partial); });
  W.bus.on('level',d=>{ who=d.who; lv=Math.max(lv,d.v||0); });
  W.bus.on('notif',n=>{ if(n.lock){ lockNotif(n); return; } banner(n); });
  W.bus.on('resync',st=>{ if(st.call==='ringing'){ show('inc'); root.classList.add('ringing'); if(W.role==='phone'&&W.audioHere()&&!W.audio.ringing) W.audio.ring(true); } else if(st.call==='active'){ show('call'); root.classList.remove('ringing'); callTimer(st.callStart); island('00:00'); if(W.role==='phone') W.audio.ring(false); } else show('lock');
    // late join: redraw a pending KBC approval and the pause state
    const n=st.notif; if(n && !n.lock && st.call==='active' && n.status==='shown' && $('.ip-banner').hidden) banner(n);
    $('.ip-pause').hidden=!st.paused; if(W.role==='phone'&&W.voice) W.voice.pause(!!st.paused); });
  reset();
  return {show,root};
};
})(window.W=window.W||{});
