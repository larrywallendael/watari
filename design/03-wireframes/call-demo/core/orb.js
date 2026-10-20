/* WATARI orb + flow paths, extracted from public/w/core/engine.js (v7) so the orb looks identical.
   Added: orb.level(v) = live voice amplitude (0..1) for the speaking waveform. */
(function(K){
const $=(s,r=document)=>r.querySelector(s); K.$=$; K.$$=(s,r=document)=>[...r.querySelectorAll(s)];
K.ic=(n,cls='')=>`<i data-lucide="${n}" class="ic ${cls}"></i>`;
K.icons=()=>{ try{ window.lucide && lucide.createIcons(); }catch(e){} };
K.eur=(v,sign)=>{ const a=Math.abs(v); const s=a.toLocaleString('nl-BE',{maximumFractionDigits:0}); return (sign? (v<0?'−':'+'):'')+'€'+s; };
K.el=(html)=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
K.wait=ms=>new Promise(r=>setTimeout(r,ms));
K.moods={
  idle:{c1:'#00aeef',c2:'#6d8cff',speed:.0022,amp:.05,label:'Listening'},
  focus:{c1:'#12b76a',c2:'#00aeef',speed:.004,amp:.07,label:'Scanning'},
  alert:{c1:'#ff7a00',c2:'#ffb547',speed:.0075,amp:.13,label:'Payroll at risk'},
  speaking:{c1:'#00aeef',c2:'#2f6bff',speed:.005,amp:.08,label:'Speaking'},
  listening:{c1:'#8b7cf6',c2:'#00aeef',speed:.0016,amp:.035,label:'Listening to Larry'},
  thinking:{c1:'#5b3fd1',c2:'#00aeef',speed:.008,amp:.09,label:'Thinking'},
  done:{c1:'#12b76a',c2:'#7ee0b0',speed:.003,amp:.06,label:'Done'},
  calm:{c1:'#8b7cf6',c2:'#b8c7ff',speed:.0009,amp:.03,label:'Quiet'}
};
/* ---------- Particle orb ---------- */
K.Orb=function(canvas,opts={}){
  const ctx=canvas.getContext('2d'); const N=opts.n||620; let W=0,H=0,dpr=1, t=0, pulse=0, rot=0, lvl=0;
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
    pulse*=.955; lvl*=.86; const ampX=cur.amp+lvl*.22; rot+=cur.speed*16/16*1.6;
    ctx.clearRect(0,0,W,H); const cx=W/2, cy=H/2, R=Math.min(W,H)*(opts.scale||.30)*(1+pulse*.18);
    const gr=ctx.createRadialGradient(cx,cy,R*.1,cx,cy,R*1.9); const A=cur.a.map(Math.round),B=cur.b.map(Math.round);
    gr.addColorStop(0,`rgba(${A},.26)`); gr.addColorStop(.5,`rgba(${B},.10)`); gr.addColorStop(1,`rgba(${B},0)`); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    const cr=Math.cos(rot), sr=Math.sin(rot), tilt=.35, ct=Math.cos(tilt), st=Math.sin(tilt);
    for(const p of pts){
      const n=1+ampX*Math.sin(t*.0016*p.f+p.s)+pulse*.25*Math.sin(p.s*3+t*.01);
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
    level(v){ lvl=Math.max(lvl,Math.min(1,v)); },
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
    const a=f.animate([{transform:`translate(${x1+ox-10}px,${y1+oy-10}px) scale(.3)`,opacity:0},{transform:`translate(${x1+ox-10}px,${y1+oy-10}px) scale(1.1)`,opacity:1,offset:.12},{transform:`translate(${mx-10}px,${my-10}px) scale(1)`,opacity:1,offset:.55},{transform:`translate(${x2-10}px,${y2-10}px) scale(.5)`,opacity:.2}],{duration:dur+Math.random()*400,delay:i*90,easing:'cubic-bezier(.5,0,.3,1)',fill:'both'});
    a.onfinish=()=>{ f.remove(); to.classList.remove('bump'); void to.offsetWidth; to.classList.add('bump'); };
  }
};


})(window.K=window.K||{});
