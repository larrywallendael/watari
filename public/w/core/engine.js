/* WATARI engine - reusable visual building blocks. No framework. */
(function(K){
const $ = (s,r=document)=>r.querySelector(s);
K.$=$; K.$$=(s,r=document)=>[...r.querySelectorAll(s)];
K.ic=(n,cls='')=>`<i data-lucide="${n}" class="ic ${cls}"></i>`;
K.icons=()=>{ try{ window.lucide && lucide.createIcons(); }catch(e){} };
K.eur=(v,sign)=>{ const a=Math.abs(v); const s=a>=1000? a.toLocaleString('nl-BE',{maximumFractionDigits:0}) : (a%1? a.toFixed(2).replace('.',',') : a); return (sign? (v<0?'−':'+'):'' )+'€'+s; };
K.el=(html)=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
K.wait=ms=>new Promise(r=>setTimeout(r,ms));
K.logo=(product='WATARI')=>`<span class="kbc-mark"><span class="wordmark">WATARI</span><span class="product">for <b>KBC</b></span></span>`;

/* ---------- Avatar (original flat illustration) ---------- */
K.avatar=(p,size=120,mood='neutral')=>{
  const L=p.look, s=size;
  const mouth={happy:'M40 66 Q50 74 60 66',relieved:'M41 67 Q50 71 59 67',neutral:'M42 68 L58 68',sad:'M41 70 Q50 64 59 70',worried:'M42 69 Q50 66 58 70'}[mood]||'M42 68 L58 68';
  let hairBack='',hairTop='';
  if(L.style==='long'){hairBack=`<path d="M27 50 Q26 24 50 22 Q74 24 73 50 L76 84 Q50 92 24 84 Z" fill="${L.hair}"/>`;hairTop=`<path d="M30 46 Q32 26 50 26 Q70 26 70 46 Q60 34 44 36 Q36 38 30 46Z" fill="${L.hair}"/>`}
  if(L.style==='short'){hairTop=`<path d="M31 47 Q29 25 50 24 Q72 25 69 47 Q66 36 50 35 Q36 35 31 47Z" fill="${L.hair}"/>`}
  if(L.style==='bun'){hairTop=`<circle cx="50" cy="20" r="9" fill="${L.hair}"/><path d="M31 47 Q30 27 50 27 Q70 27 69 47 Q64 36 50 36 Q37 36 31 47Z" fill="${L.hair}"/>`}
  const beard=L.beard?`<path d="M35 60 Q37 78 50 79 Q63 78 65 60 Q60 70 50 71 Q40 70 35 60Z" fill="${L.hair}" opacity=".85"/>`:'';
  return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" class="avatar"><defs><clipPath id="av${p.first}${s}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#av${p.first}${s})"><rect width="100" height="100" fill="${L.bg}"/>${hairBack}
  <path d="M14 104 Q16 80 50 78 Q84 80 86 104Z" fill="${L.shirt}"/><rect x="43" y="66" width="14" height="14" rx="6" fill="${L.skin}"/>
  <ellipse cx="50" cy="52" rx="19" ry="21" fill="${L.skin}"/>${beard}${hairTop}
  <circle cx="43" cy="53" r="1.9" fill="#1f2937"/><circle cx="57" cy="53" r="1.9" fill="#1f2937"/>
  <path d="${mouth}" stroke="#1f2937" stroke-width="2" fill="none" stroke-linecap="round" class="av-mouth"/></g></svg>`;
};
K.moodRing={happy:'#12b76a',relieved:'#8b7cf6',neutral:'#d7dfea',sad:'#8b7cf6',worried:'#f79009'};
K.personMood={lotte:'worried',karim:'sad',maes:'neutral',arne:'neutral',nina:'neutral',marc:'worried',els:'worried'};
/* avatar with orbiting household balls */
K.person=(p,size=120,mood='neutral')=>{
  const hh=(p.household||[]).map((m,i,a)=>hhBall(m,i,a.length,size)).join('');
  return `<div class="avatar-wrap" style="width:${size}px;height:${size}px" data-size="${size}"><div class="mood" style="border-color:${K.moodRing[mood]}"></div>${K.avatar(p,size,mood)}<div class="hh">${hh}</div></div>`;
};
function hhBall(m,i,n,size,isNew){ const ang=(-90+ i*(360/Math.max(n,3)) + 35)*Math.PI/180, R=size/2+6; const x=size/2+R*Math.cos(ang)-13, y=size/2+R*Math.sin(ang)-13;
  return `<span class="${isNew?'new':''}" style="left:${x}px;top:${y}px;background:${m.c}" title="${m.name}">${m.n}</span>`;}
K.addHousehold=(wrap,p,m)=>{ p.household=[...(p.household||[]),m]; const size=+wrap.dataset.size; wrap.querySelector('.hh').innerHTML=p.household.map((mm,i,a)=>hhBall(mm,i,a.length,size,mm===m)).join(''); };
K.setPersonMood=(wrap,p,mood)=>{ const size=+wrap.dataset.size; const svg=wrap.querySelector('svg.avatar'); svg.outerHTML=K.avatar(p,size,mood); wrap.querySelector('.mood').style.borderColor=K.moodRing[mood]; wrap.classList.remove('bump'); void wrap.offsetWidth; wrap.classList.add('bump'); };

/* ---------- Particle orb ---------- */
K.Orb=function(canvas,opts={}){
  const ctx=canvas.getContext('2d'); const N=opts.n||620; let W=0,H=0,dpr=1, t=0, pulse=0, rot=0;
  const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  let cur={...K.moods.idle, a:hex(K.moods.idle.c1), b:hex(K.moods.idle.c2)}, tgt={...cur};
  const pts=[]; const g=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<N;i++){const y=1-(i/(N-1))*2, r=Math.sqrt(1-y*y), th=g*i; pts.push({x:Math.cos(th)*r,y,z:Math.sin(th)*r,s:Math.random()*6.28,f:.6+Math.random()*1.4});}
  let streams=[];
  function resize(){ const r=canvas.getBoundingClientRect(); dpr=Math.min(2,window.devicePixelRatio||1); W=r.width;H=r.height; canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);}
  new ResizeObserver(resize).observe(canvas); resize();
  const lerp=(a,b,k)=>a+(b-a)*k;
  function frame(){
    t+=16; ['speed','amp'].forEach(k=>cur[k]=lerp(cur[k],tgt[k],.03)); for(let i=0;i<3;i++){cur.a[i]=lerp(cur.a[i],tgt.a[i],.03);cur.b[i]=lerp(cur.b[i],tgt.b[i],.03);}
    pulse*=.955; rot+=cur.speed*16/16*1.6;
    ctx.clearRect(0,0,W,H); const cx=W/2, cy=H/2, R=Math.min(W,H)*(opts.scale||.30)*(1+pulse*.18);
    const gr=ctx.createRadialGradient(cx,cy,R*.1,cx,cy,R*1.9); const A=cur.a.map(Math.round),B=cur.b.map(Math.round);
    gr.addColorStop(0,`rgba(${A},.26)`); gr.addColorStop(.5,`rgba(${B},.10)`); gr.addColorStop(1,`rgba(${B},0)`); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    const cr=Math.cos(rot), sr=Math.sin(rot), tilt=.35, ct=Math.cos(tilt), st=Math.sin(tilt);
    for(const p of pts){
      const n=1+cur.amp*Math.sin(t*.0016*p.f+p.s)+pulse*.25*Math.sin(p.s*3+t*.01);
      let x=p.x*cr-p.z*sr, z=p.x*sr+p.z*cr, y=p.y; const y2=y*ct-z*st; z=y*st+z*ct; y=y2;
      const sc=1/(1.6-z*.6); const px=cx+x*R*n*sc*1.25, py=cy+y*R*n*sc*1.25; const d=(z+1)/2;
      const c=[0,1,2].map(i=>Math.round(lerp(B[i],A[i],(p.y+1)/2)));
      ctx.fillStyle=`rgba(${c},${.18+d*.72})`; ctx.beginPath(); ctx.arc(px,py,(.6+d*1.9)*(opts.dot||1),0,6.283); ctx.fill();
    }
    // inner core
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,R*.55); cg.addColorStop(0,'rgba(255,255,255,.95)'); cg.addColorStop(1,`rgba(${A},0)`); ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,R*.55,0,6.283); ctx.fill();
    // streams (absorb / emit)
    streams=streams.filter(s=>s.k<1); for(const s of streams){ s.k+=s.v; const k=s.dir>0? s.k : 1-s.k; const e=1-Math.pow(1-k,2);
      const x=lerp(s.x0,cx,e), y=lerp(s.y0,cy,e); ctx.fillStyle=`rgba(${A},${.9*(1-Math.abs(.5-s.k))})`; ctx.beginPath(); ctx.arc(x,y,2.2,0,6.283); ctx.fill(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    setMood(m){ const d=K.moods[m]||K.moods.idle; tgt={...d,a:hex(d.c1),b:hex(d.c2)}; },
    pulse(v=1){ pulse=Math.min(1.4,pulse+v); },
    absorb(angleDeg=-90,n=26){ const R=Math.max(W,H)*.6; for(let i=0;i<n;i++){ const a=(angleDeg+(Math.random()-.5)*50)*Math.PI/180; streams.push({x0:W/2+Math.cos(a)*R*(0.6+Math.random()*.4),y0:H/2+Math.sin(a)*R*(0.6+Math.random()*.4),k:-Math.random()*.6,v:.012+Math.random()*.01,dir:1}); } },
    emit(angleDeg=90,n=26){ const R=Math.max(W,H)*.6; for(let i=0;i<n;i++){ const a=(angleDeg+(Math.random()-.5)*40)*Math.PI/180; streams.push({x0:W/2+Math.cos(a)*R,y0:H/2+Math.sin(a)*R,k:-Math.random()*.5,v:.014+Math.random()*.01,dir:-1}); } }
  };
};

/* ---------- Overlay: flowing paths + flyers ---------- */
function overlay(){ let o=$('#k-overlay'); if(!o){ o=document.createElementNS('http://www.w3.org/2000/svg','svg'); o.id='k-overlay'; o.innerHTML='<defs><filter id="kglow"><feGaussianBlur stdDeviation="3"/></filter></defs>'; document.body.appendChild(o);} return o; }
const ctr=(el,anchor='c')=>{ const r=el.getBoundingClientRect(); const m={c:[.5,.5],t:[.5,0],b:[.5,1],l:[0,.5],r:[1,.5]}[anchor]; return [r.left+r.width*m[0], r.top+r.height*m[1]]; };
K.center=ctr;
K.link=(from,to,{color='#00aeef',dur=900,width=2.2,fa='c',ta='c',bend=.25,keep=900}={})=>new Promise(res=>{
  if(!from||!to) return res(); const o=overlay(); const [x1,y1]=ctr(from,fa),[x2,y2]=ctr(to,ta);
  const dx=x2-x1, dy=y2-y1; const mx=(x1+x2)/2 - dy*bend, my=(y1+y2)/2 + dx*bend;
  const d=`M${x1},${y1} Q${mx},${my} ${x2},${y2}`; const NS='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS,'g'); const glow=document.createElementNS(NS,'path'); const p=document.createElementNS(NS,'path'); const dot=document.createElementNS(NS,'circle');
  [glow,p].forEach(e=>{e.setAttribute('d',d);e.setAttribute('fill','none');e.setAttribute('stroke',color);e.setAttribute('stroke-linecap','round');});
  glow.setAttribute('stroke-width',width*3.5); glow.setAttribute('opacity',.18); glow.setAttribute('filter','url(#kglow)'); p.setAttribute('stroke-width',width);
  dot.setAttribute('r',4.5); dot.setAttribute('fill',color); g.append(glow,p,dot); o.appendChild(g);
  const L=p.getTotalLength(); [glow,p].forEach(e=>{e.style.strokeDasharray=L;e.style.strokeDashoffset=L;});
  const t0=performance.now(); (function step(now){ const k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,3); const off=L*(1-e);
    glow.style.strokeDashoffset=off; p.style.strokeDashoffset=off; const pt=p.getPointAtLength(L*e); dot.setAttribute('cx',pt.x); dot.setAttribute('cy',pt.y);
    if(k<1) requestAnimationFrame(step); else { res(); g.animate([{opacity:1},{opacity:0}],{duration:600,delay:keep,fill:'forwards'}).onfinish=()=>g.remove(); } })(t0);
});
K.fly=(from,to,{kind='heart',n=6,spread=50,dur=1100}={})=>{
  if(!from||!to) return; const [x1,y1]=ctr(from),[x2,y2]=ctr(to);
  for(let i=0;i<n;i++){ const f=document.createElement('div'); f.className='flyer '+kind; f.innerHTML= kind==='heart'?'❤':(kind==='coin'?'€':kind); document.body.appendChild(f);
    const ox=(Math.random()-.5)*spread, oy=(Math.random()-.5)*spread; const mx=(x1+x2)/2+ox*2, my=Math.min(y1,y2)-60-Math.random()*60;
    const a=f.animate([{transform:`translate(${x1+ox-10}px,${y1+oy-10}px) scale(.3)`,opacity:0},{transform:`translate(${x1+ox-10}px,${y1+oy-10}px) scale(1.1)`,opacity:1,offset:.12},{transform:`translate(${mx-10}px,${my-10}px) scale(1)`,opacity:1,offset:.55},{transform:`translate(${x2-10}px,${y2-10}px) scale(.5)`,opacity:.2}],{duration:dur+Math.random()*400,delay:i*90,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
    a.onfinish=()=>{ f.remove(); to.classList.remove('bump'); void to.offsetWidth; to.classList.add('bump'); };
  }
};

/* ---------- Signal pill ---------- */
K.signal=(st)=>{ const S=K.sources[st.src]; const amt=st.amt!=null?`<span class="sig-a ${st.amt<0?'neg':'pos'}">${K.eur(st.amt,true)}</span>`:'';
  return K.el(`<div class="sig tip" data-tip="${S.label}"><span class="sig-ic" style="background:${S.bg};color:${S.color}">${K.ic(S.icon)}</span><div style="min-width:0"><div class="sig-t">${st.t}</div><div class="sig-s">${st.s||''}</div></div>${amt}</div>`); };
K.adminPill=(t)=>K.el(`<div class="sig admin"><span class="sig-ic" style="background:#e9f9f0;color:#067647">${K.ic('check')}</span><div style="min-width:0"><div class="sig-t">${t}</div><div class="sig-s">Handled by agent</div></div></div>`);

/* ---------- Channel screens (inner screen HTML) ---------- */
K.kateCard=(m,cls='')=>`<div class="kate ${cls}"><div class="k-top"><span class="k-av">K</span>Kate · just now</div><h4>${m.title}</h4>${m.body?`<p>${m.body}</p>`:''}<ul>${(m.items||[]).map(i=>`<li><span class="ck">✓</span><span>${i}</span></li>`).join('')}</ul><div class="k-cta">${(m.ctas||[]).map((c,i)=>`<button class="btn ${i===0?'primary':''}" data-cta="${c}">${c}</button>`).join('')}</div>${m.why?`<div class="k-why">${m.why}</div>`:''}</div>`;
K.screens={
  idle:(ch,p)=>{ const now=new Date(); const tm=now.toTimeString().slice(0,5);
    return ({push:`<div class="lock"><div class="l-time">${tm}</div><div class="l-date">Tuesday 30 September</div><div class="l-empty">No notifications</div></div>`,
    whatsapp:`<div class="wa"><div class="wa-h"><span class="k-av">K</span><div>KBC · Kate<small>online</small></div></div><div class="wa-b"></div></div>`,
    mail:`<div class="mail"><div class="m-h"><div class="m-sub" style="margin:0">Inbox</div></div><div class="m-b"><p style="color:var(--faint)">Nothing new</p></div></div>`,
    call:`<div class="call" style="opacity:.6"><div class="c-av" style="animation:none">K</div><div class="c-n">Kate</div><div class="c-s">Only when it matters</div></div>`,
    messenger:`<div class="ms"><div class="ms-h"><span class="av">A</span>Alexis</div><div class="ms-b"><div class="m in">Thanks Marc, all good with the boiler 👍</div></div></div>`,
    browser:''}[ch]); },
  push:(m)=>`<div class="lock"><div class="l-time">19:10</div><div class="l-date">Tuesday 30 September</div>${K.kateCard(m)}</div>`,
  whatsapp:(m)=>`<div class="wa"><div class="wa-h"><span class="k-av">K</span><div>${m.contact}<small>Business account</small></div></div><div class="wa-b">${m.thread.map((x,i)=>`<div class="m ${x.f}" style="animation-delay:${i*.6}s">${x.t}</div>`).join('')}</div><div class="quick">${m.quick.map((q,i)=>`<button class="btn" data-cta="${q}">${q}</button>`).join('')}</div></div>`,
  mail:(m)=>`<div class="mail"><div class="m-h"><div class="m-from"><span class="k-av">K</span><div>${m.from}<div style="font-weight:400;color:var(--muted);font-size:9.5px">to me · Sat 10:00</div></div></div><div class="m-sub">${m.subject}</div></div><div class="m-b"><p>${m.body}</p>
    ${m.split?`<div class="bar">${m.split.map(s=>`<i style="width:${s.p}%;background:${s.c}"></i>`).join('')}</div><div class="list">${m.split.map(s=>`<div><span style="width:8px;height:8px;border-radius:2px;background:${s.c};margin-top:3px"></span>${s.l} ${s.p}%</div>`).join('')}</div>`:''}
    ${m.kpis?`<div class="kpis">${m.kpis.map(k=>`<div class="kpi"><b>${k.v}</b><span>${k.l}</span></div>`).join('')}</div>`:''}
    ${m.items?`<div class="list">${m.items.map(i=>`<div><span style="color:var(--calm);font-weight:800">·</span>${i}</div>`).join('')}</div>`:''}
    <div class="k-cta" style="display:flex;gap:6px">${m.ctas.map((c,i)=>`<button class="btn ${i===0?(m.split?'primary':'soft'):''}" style="font-size:10.5px;padding:6px 9px" data-cta="${c}">${c}</button>`).join('')}</div><p style="font-size:9.5px;color:var(--faint)">${m.why||''}</p></div></div>`,
  call:(m)=>`<div class="call"><div class="c-av">K</div><div class="c-n">${m.caller}</div><div class="c-s">${m.sub} · 03:14</div><div class="c-t">${m.lines.map((l,i)=>`<div style="animation-delay:${i*.9}s">${l}</div>`).join('')}</div><div class="c-cta">${m.ctas.map((c,i)=>`<button class="btn ${i===0?'primary':''}" data-cta="${c}">${c}</button>`).join('')}</div><div class="c-btns" style="margin-top:14px"><span class="no">${K.ic('phone-off')}</span><span class="yes">${K.ic('phone')}</span></div></div>`,
  messenger:(m)=>`<div class="ms"><div class="ms-h"><span class="av">A</span>${m.contact}</div><div class="ms-b"><div class="m in">Thanks Marc, all good with the boiler 👍</div></div><div class="draft"><small>Drafted by Kate · you send</small>${m.draft}<br><button class="btn" data-cta="Send">Send</button></div></div>`,
  browser:(m)=>`<div class="br-bar"><i></i><i></i><i></i><span class="url">${m.url}</span></div><div class="br-page"><div style="display:grid;gap:6px;align-content:start"><b style="font-size:11px">Choose your plan</b><div class="ph" style="height:34px"></div><div class="ph" style="height:34px"></div><div class="ph" style="height:22px;width:60%"></div></div><div style="display:grid;gap:6px;align-content:start"><b style="font-size:11px">Payment</b><div class="ph" style="height:18px"></div><div class="ph" style="height:18px"></div><div style="height:20px;border-radius:6px;background:#7b2ff7"></div></div></div>${K.kateCard(m,'br-pop')}`
};
K.messengerNotif=(m)=>`<div class="lock"><div class="l-time">09:02</div><div class="l-date">Monday 6 October</div><div class="kate" style="font-size:11px"><div class="k-top"><span class="k-av">K</span>Kate · now</div><h4 style="font-size:12px">${m.notif}</h4><div class="k-cta"><button class="btn primary" style="padding:5px 9px;font-size:10.5px">Open Messenger</button></div></div></div>`;

/* ---------- Brain web ---------- */
K.Brain=function(el,persona,{rings=[.30,.44],center=null,centerSize=86}={}){
  el.classList.add('brain'); el.innerHTML=`<svg class="web"></svg><div class="core"></div>`; const svg=el.querySelector('svg'), core=el.querySelector('.core');
  if(center) core.innerHTML=center;
  const nodes=[]; let idx=0;
  const ANG=[-90,150,30,-150,-30,90,190,-10,120,60,-120,230];
  const slot=(i)=>{ const ang=ANG[i%ANG.length]*Math.PI/180; const m=(i%2? .86:1)*(i>=ANG.length?.7:1); return [.5+Math.cos(ang)*rings[1]*m, .5+Math.sin(ang)*(rings[2]||.40)*m]; };
  function add(n,isNew,cls=''){ const [x,y]=slot(idx++); const d=K.el(`<div class="bnode ${isNew?'new':''} ${cls}" style="left:${x*100}%;top:${y*100}%;animation-delay:${isNew?0:-(idx*.7)}s, ${-(idx*.7)}s"><span class="dot" style="background:${K.groupColors[n.g]||'#9aa7b8'}"></span>${n.l}</div>`);
    el.appendChild(d); const ln=document.createElementNS('http://www.w3.org/2000/svg','line'); ln.setAttribute('x1','50%');ln.setAttribute('y1','50%');ln.setAttribute('x2',x*100+'%');ln.setAttribute('y2',y*100+'%'); if(isNew) ln.classList.add('hot'); svg.appendChild(ln); nodes.push({d,ln}); if(isNew) setTimeout(()=>{d.classList.remove('new');ln.classList.remove('hot')},4000); return d; }
  (K.baseBrain[persona]||[]).forEach(n=>add(n,false));
  return {add:(n,cls)=>add(n,true,cls), core, el};
};

/* ---------- Stats block ---------- */
K.Stats=function(el,side,init){
  const defs=K.statDefs[side]; const vals={...init};
  const fmt=(d,v)=> d.k==='assets'? K.eur(v) : d.k==='money'? '€'+Math.round(v) : d.k==='time'? (v>=60? Math.floor(v/60)+'h '+(v%60)+'m': v+'m') : Math.round(v)+(d.unit.startsWith('/')||d.unit===''?'':d.unit);
  el.innerHTML=defs.map(d=>`<div class="stat" data-k="${d.k}"><div class="s-row"><span style="display:flex;gap:6px;align-items:center">${K.ic(d.icon)}${d.label}</span><b>${fmt(d,vals[d.k])}</b></div><div class="track"><i style="width:${Math.min(100,vals[d.k]/d.max*100)}%;background:${side==='kbc'?'linear-gradient(90deg,#00aeef,#062a5b)':'linear-gradient(90deg,#ff8fb1,#ff4d6d)'}"></i></div></div>`).join('');
  return { apply(delta){ defs.forEach(d=>{ if(delta[d.k]==null) return; const from=vals[d.k], to=Math.max(0,from+delta[d.k]); vals[d.k]=to; const row=el.querySelector(`[data-k="${d.k}"]`); const b=row.querySelector('b');
      const t0=performance.now(); (function tick(now){ const k=Math.min(1,(now-t0)/1200); b.textContent=fmt(d,Math.round(from+(to-from)*(1-Math.pow(1-k,3)))); if(k<1) requestAnimationFrame(tick); })(t0);
      b.classList.add('up'); setTimeout(()=>b.classList.remove('up'),2500); row.querySelector('.track i').style.width=Math.min(100,to/d.max*100)+'%'; }); }, vals };
};

/* ---------- Player ---------- */
K.Player=function(scn,onStep,{speed=1}={}){
  let timers=[], i=0, t0=0, paused=false, elapsed=0, spd=speed; const steps=scn.steps;
  function schedule(){ clear(); t0=performance.now(); for(let j=i;j<steps.length;j++){ const st=steps[j]; timers.push(setTimeout(()=>{ i=j+1; onStep(st,j); },(st.at-elapsed)/spd)); } }
  function clear(){ timers.forEach(clearTimeout); timers=[]; }
  return { play(){ paused=false; schedule(); }, pause(){ if(paused) return; paused=true; elapsed+= (performance.now()-t0)*spd; clear(); },
    next(){ clear(); if(i<steps.length){ const st=steps[i]; elapsed=st.at; i++; onStep(st,i-1); } if(!paused) schedule(); },
    stop(){ clear(); }, get index(){return i}, get total(){return steps.length}, get paused(){return paused}, setSpeed(s){ this.pause(); spd=s; this.play(); } };
};

/* press a CTA visibly in a container */
K.press=(root,label)=>{ const b=[...root.querySelectorAll('[data-cta]')].find(x=>x.dataset.cta===label)||root.querySelector('[data-cta]'); if(b){ b.classList.add('pressed'); b.style.outline='3px solid rgba(0,174,239,.45)'; } return b; };
})(window.WATARI);
