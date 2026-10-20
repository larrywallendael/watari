/* WATARI · STT turn logic (pure, no DOM). Used by voice.js in the browser and by the node unit tests.
   Input  = Soniox real-time websocket responses: {tokens:[{text,start_ms,end_ms,confidence,is_final}], final_audio_proc_ms, total_audio_proc_ms, finished?, error_code?}
   Output = events: {type:'partial',text} · {type:'final',text,conf,words} · {type:'barge'} · {type:'error',code,errorType,message} · {type:'finished'}
   Rules
   - final tokens accumulate, non-final tokens are replaced by each response (Soniox semantics)
   - end of turn = "<end>" (endpoint) or "<fin>" (manual finalize) token AND >= endSilenceMs of silence after the last word
   - while Watari speaks, words that belong to its own line (echo through the mic) are dropped; other words held back
     become a barge-in once they cover >= bargeMs of audio; without barge-in they are discarded when Watari stops   */
(function(root){
'use strict';
const SPECIAL=/^\s*<[a-z]+>\s*$/i;
const norm=w=>(w||'').toLowerCase().replace(/[^a-z0-9']/g,'');

function TurnTracker(opt){
  opt=opt||{};
  this.endSilenceMs=opt.endSilenceMs==null?700:opt.endSilenceMs;
  this.bargeMs=opt.bargeMs==null?600:opt.bargeMs;
  this.reset();
}
TurnTracker.prototype.reset=function(){
  this.fin=[];            // final tokens of the current turn (kept)
  this.nonFin=[];         // latest non-final tokens
  this.endSeen=false;     // got <end>/<fin> for the current turn
  this.lastWordEnd=0;     // audio ms of the last real (non-special) token end
  this.lastPartial='';
  this.win=null;          // Watari speaking window {start,end,words:Set,barged,text}
  this.wins=[];           // closed windows (audio ms) for late-arriving tokens
};
// Watari playback boundaries, in audio ms of the mic stream
TurnTracker.prototype.watari=function(on,text,audioMs){
  if(on){ this.win={start:audioMs,end:Infinity,words:new Set(String(text||'').split(/\s+/).map(norm).filter(Boolean)),barged:false};
    // numbers are spoken as words, Soniox may write digits: treat digits as echo too
    this.win.digits=true; return []; }
  if(this.win){ this.win.end=audioMs; this.wins.push(this.win); if(this.wins.length>6) this.wins.shift(); this.win=null; }
  return [];
};
TurnTracker.prototype._windowFor=function(t){
  if(this.win && t.start_ms>=this.win.start-50) return this.win;
  for(const w of this.wins){ if(t.start_ms>=w.start-50 && t.start_ms<=w.end+250) return w; }
  return null;
};
TurnTracker.prototype._isEcho=function(word,w){ const n=norm(word); if(!n) return true; if(w.words.has(n)) return true; if(w.digits && /^[0-9.,€%]+$/.test(n)) return true;
  // filler / short tokens of the line ("i", "a") are echo-ish, keep it simple
  return false; };
// group tokens into words: a token starting with a space (or the first token) opens a new word
function words(tokens){ const out=[]; for(const t of tokens){ if(SPECIAL.test(t.text)) continue;
  if(!out.length || /^\s/.test(t.text)) out.push({text:t.text.trim(),start_ms:t.start_ms||0,end_ms:t.end_ms||0,toks:[t]});
  else { const w=out[out.length-1]; w.text+=t.text; w.end_ms=t.end_ms||w.end_ms; w.toks.push(t); } }
  return out; }
TurnTracker.prototype._filter=function(tokens,ev){
  // drop echo words inside a Watari window; detect barge-in from non-echo words
  const ws=words(tokens), keep=[];
  for(const w of ws){ const win=this._windowFor(w); w.win=win; if(!win) continue;
    w.echo=this._isEcho(w.text,win); if(w.echo) continue;
    if(win.firstUser==null) win.firstUser=w.start_ms;
    win.userEnd=Math.max(win.userEnd||0,w.end_ms);
    if(!win.barged && win===this.win && win.userEnd-win.firstUser>=this.bargeMs){ win.barged=true; ev.push({type:'barge'}); } }
  for(const w of ws){ if(!w.win || (!w.echo && w.win.barged)) keep.push(...w.toks); }
  return keep;
};
TurnTracker.prototype.text=function(){ return (this.fin.concat(this.nonFin)).map(t=>t.text).join('').replace(/\s+/g,' ').trim(); };
TurnTracker.prototype.feed=function(msg,audioNow){
  const ev=[];
  if(!msg) return ev;
  if(msg.error_code||msg.error_type){ ev.push({type:'error',code:msg.error_code,errorType:msg.error_type,message:msg.error_message}); return ev; }
  const toks=Array.isArray(msg.tokens)?msg.tokens:[];
  const special=toks.filter(t=>SPECIAL.test(t.text||''));
  const real=this._filter(toks.filter(t=>!SPECIAL.test(t.text||'')&&t.text),ev);
  const newFin=real.filter(t=>t.is_final), newNon=real.filter(t=>!t.is_final);
  if(newFin.length||newNon.length){
    for(const t of real) this.lastWordEnd=Math.max(this.lastWordEnd,t.end_ms||0);
    if(this.endSeen && (newNon.length||newFin.length)) this.endSeen=false; // speaker kept going: same turn
  }
  this.fin.push(...newFin); this.nonFin=newNon;
  if(special.some(t=>/<(end|fin)>/i.test(t.text))) this.endSeen=true;
  const txt=this.text();
  if(txt!==this.lastPartial && (newFin.length||newNon.length)){ this.lastPartial=txt; ev.push({type:'partial',text:txt}); }
  ev.push(...this.tick(audioNow));
  if(msg.finished){ const f=this._flush(); if(f) ev.push(f); ev.push({type:'finished'}); }
  return ev;
};
// call ~every 50 ms with the current audio clock (ms of audio sent)
TurnTracker.prototype.tick=function(audioNow){
  if(!this.endSeen || this.nonFin.length) return [];
  if(audioNow!=null && audioNow-this.lastWordEnd<this.endSilenceMs) return [];
  const f=this._flush(); return f?[f]:[];
};
TurnTracker.prototype._flush=function(){
  const toks=this.fin.concat(this.nonFin); this.endSeen=false;
  const text=toks.map(t=>t.text).join('').replace(/\s+/g,' ').trim();
  this.fin=[]; this.nonFin=[]; this.lastPartial='';
  if(!text) return null;
  const c=toks.filter(t=>typeof t.confidence==='number'); const conf=c.length? c.reduce((a,t)=>a+t.confidence,0)/c.length : 1;
  return {type:'final',text,conf:Math.round(conf*1000)/1000,words:text.split(/\s+/).length};
};
// Simulated Soniox stream for a scripted line: returns [{at:ms offset, msg}] shaped exactly like real responses
function simMessages(text,startMs,opt){
  opt=opt||{}; const filler=opt.filler!==false; const out=[];
  let ws=String(text).split(/\s+/).filter(Boolean); if(filler && !/^(uh|um|euh)/i.test(ws[0]||'')) ws=['Uh,'].concat(ws);
  let t=startMs+(opt.lead||120); const toks=[];
  ws.forEach((w,i)=>{ const dur=180+Math.min(260,w.length*35); toks.push({text:(i?' ':'')+w,start_ms:t,end_ms:t+dur,confidence:opt.conf!=null?opt.conf:(/^uh/i.test(w)?0.62:0.93+((i*7)%5)/100)}); t+=dur+60;
    out.push({at:t-startMs+90,msg:{tokens:toks.map(x=>({...x,is_final:false})),final_audio_proc_ms:startMs,total_audio_proc_ms:t}}); });
  const end=t; // Soniox finalizes + sends <end> after its endpoint delay
  out.push({at:end-startMs+420,msg:{tokens:toks.map(x=>({...x,is_final:true})),final_audio_proc_ms:end,total_audio_proc_ms:end+300}});
  out.push({at:end-startMs+620,msg:{tokens:[{text:'<end>',confidence:1,is_final:true}],final_audio_proc_ms:end+500,total_audio_proc_ms:end+520}});
  return {msgs:out,endMs:end};
}
const api={TurnTracker,simMessages,words,norm};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else (root.W=root.W||{}).SttCore=api;
})(typeof window!=='undefined'?window:globalThis);
