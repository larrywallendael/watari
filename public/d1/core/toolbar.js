/* Click-to-operate toolbar: same as the keys, for when the page is inside a frame and keys don't reach it */
(function(){
const B=[['v','Variant ▸','Next sub-variant (V)'],['g','Zones','Show numbered zones (G)'],[' ','Start / answer','Start the story or answer the call (Space)'],['n','Next line','Speak your next scripted line (N)'],['y','Approve','Approve on the phone (Y)'],['p','Pause','Pause or resume the whole demo, both screens (P)'],['m','Auto','Auto voice on/off (M)'],['l','Log','Execution log (L)'],['r','Reset','Reset (R)'],['u','Arm audio','Arm audio (U)']];
const css=`#wtb{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9999;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:6px;border-radius:14px;background:rgba(255,255,255,.92);border:1px solid #dce3ec;box-shadow:0 6px 24px rgba(11,31,51,.14);font:600 12px/1 "IBM Plex Sans",system-ui,sans-serif}
#wtb button{height:30px;padding:0 11px;border-radius:9px;border:1px solid #dce3ec;background:#fff;color:#0b1f33;cursor:pointer;font:inherit;white-space:nowrap}
#wtb button:hover{background:#e6f4fb}#wtb button.pri{background:#003665;color:#fff;border-color:#003665}
#wtb button:focus-visible{outline:2px solid #00aeef;outline-offset:1px}
#wtb .x{width:30px;padding:0}#wtb.min>button:not(.x){display:none}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const bar=document.createElement('div'); bar.id='wtb';
bar.innerHTML=`<button class="x" title="Hide or show the toolbar">☰</button>`+B.map(([k,l,t],i)=>`<button data-k="${k}" title="${t}" class="${i===0?'pri':''}">${l}</button>`).join('');
document.body.appendChild(bar);
bar.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; e.stopPropagation();
  if(b.classList.contains('x')){ bar.classList.toggle('min'); return; }
  const k=b.dataset.k; window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true})); b.blur(); });
})();
