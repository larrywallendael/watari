/* WATARI live bridge: every story tab also runs the REAL agent (/api/watari) and streams its trace
   into the execution log. The animation is the visualisation; the log + verdict card are the agent. */
(function () {
  const MAP = { move: 'lotte', grief: 'karim', baby: 'maes', job: 'arne', subs: 'nina', rent: 'marc', family: 'els' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = document.createElement('style');
  css.textContent = `
  .lv{font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.06em;padding:1px 5px;border-radius:5px;background:#062a5b;color:#fff;margin-right:6px}
  .lv.b{background:#fdecec;color:#b42318}.lv.a{background:#f1efff;color:#5b4bd6}.lv.g{background:#e9f9f0;color:#067647}.lv.d{background:var(--cyan);color:#fff}
  .ln.live-block{background:#fff6f5}.ln.live-dec{background:#eef8ff}
  .verdict{position:absolute;right:10px;top:6px;z-index:130;max-width:300px;background:rgba(255,255,255,.97);border:1px solid var(--line);border-radius:12px;padding:5px 10px;box-shadow:var(--sh-1);font-size:11px;display:none;cursor:default}
  .verdict.show{display:block;animation:pop .45s var(--ease) both}
  .verdict .one{display:flex;align-items:center;gap:6px;white-space:nowrap;font-weight:600;color:var(--ink-2)}
  .verdict .one i{width:6px;height:6px;border-radius:50%;background:var(--ok);display:inline-block;animation:blink 1.4s infinite;flex:none}
  .verdict .one b{font-family:var(--mono);font-size:10.5px;color:var(--navy)}
  .verdict .one .ok{color:#067647}.verdict .one .x{color:#b54708}
  .verdict .more{display:none;margin-top:6px;border-top:1px solid var(--line);padding-top:6px;width:280px;white-space:normal}
  .verdict:hover .more{display:block}
  .verdict .row{display:flex;justify-content:space-between;gap:8px;padding:1.5px 0}.verdict .row b{font-family:var(--mono);font-size:10.5px;color:var(--navy);text-align:right}
  .verdict .msg{margin-top:6px;font-size:11px;color:var(--ink-2);line-height:1.35;border-top:1px solid var(--line);padding-top:6px}
  .hbtn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 11px;border-radius:10px;border:1px solid var(--line-2);background:#fff;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;white-space:nowrap}
  .hbtn:hover{background:var(--bg)} .hbtn svg{width:14px;height:14px} .hbtn.pri{background:var(--navy);color:#fff;border-color:var(--navy)}
  .tour-hl{position:fixed;z-index:900;border-radius:16px;box-shadow:0 0 0 3px var(--cyan),0 0 0 9999px rgba(6,30,60,.32);pointer-events:none;transition:all .45s var(--ease)}
  .tour{position:fixed;z-index:901;width:340px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 20px 50px rgba(6,42,91,.25);padding:14px 15px;transition:top .45s var(--ease),left .45s var(--ease)}
  .tour .tp{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--navy)}
  .tour .bar{flex:1;height:3px;border-radius:3px;background:var(--line);overflow:hidden}.tour .bar i{display:block;height:100%;background:var(--cyan);transition:width .4s}
  .tour h4{margin:8px 0 4px;font-size:14.5px}.tour p{margin:0;font-size:12.5px;color:var(--ink-2);line-height:1.45}
  .tour .act{display:flex;align-items:center;gap:6px;margin-top:11px}.tour .act .sp{flex:1}
  .tour button{height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--line-2);background:#fff;font-size:11.5px;font-weight:600;cursor:pointer}
  .tour button.pri{background:var(--navy);color:#fff;border-color:var(--navy)} .tour .x{border:none;background:none;color:var(--faint);font-size:14px;padding:0 4px;height:auto}
  `;
  document.head.appendChild(css);

  // header buttons
  const ctrl = document.querySelector('header .ctrl');
  ctrl.insertAdjacentHTML('beforebegin', `<button class="hbtn tip" data-tip="Create your own customer and signals, see how the agent reacts" id="bBuild">${K.ic('user-plus')}Build</button><button class="hbtn pri tip" data-tip="Guided 60-second tour" id="bDemo">${K.ic('play-circle')}Demo</button>`);
  document.getElementById('bBuild').onclick = () => (location.href = '/lab?build=1');
  document.getElementById('bDemo').onclick = () => startTour();
  const wheelP = document.querySelector('.wheelp');
  wheelP.style.position = 'relative';
  document.getElementById('wheel').insertAdjacentHTML('beforeend', '<div class="verdict" id="verdict"></div>');
  K.icons();

  const ST = { read: 'in', rule: 'ok', pass: 'ok', block: 'lock', llm: 'ai', tool: 'out', guard: 'lock', decision: 'back', error: 'run', info: 'sig', done: 'ok' };
  const BADGE = { block: ['BLOCK', 'b'], guard: ['GUARD', 'b'], llm: ['THINK', 'a'], pass: ['PASS', 'g'], rule: ['RULE', ''], decision: ['DECIDE', 'd'], read: ['READ', ''], tool: ['CALL', ''], error: ['ERROR', 'b'], info: ['INFO', ''] };
  let ac = null, curGen = 0;

  function liveLog(e) {
    if (e.kind === 'phase') { log('sig', `<span class="lv">WATARI</span><b>${esc(e.label)}</b> · ${esc(e.detail || '')}`, 'none', 'gate'); return; }
    const [b, c] = BADGE[e.kind] || ['LIVE', ''];
    const cls = e.kind === 'block' || e.kind === 'guard' ? 'live-block' : e.kind === 'decision' ? 'live-dec' : '';
    log(ST[e.kind] || 'ok', `<span class="lv ${c}">${b}</span>${esc(e.label)}`, e.kind === 'llm' ? 'ai' : 'sys', cls, e.detail ? esc(e.detail) : undefined);
  }

  function verdict(d, scen) {
    const v = document.getElementById('verdict'); const want = scen.ch;
    const got = d.status === 'suppress' || d.status === 'hold' ? 'silence' : d.channel;
    const ok = got === want;
    const lbl = { push: 'Lock screen', whatsapp: 'WhatsApp', mail: 'E-mail', call: 'Phone call', messenger: 'Messenger', browser: 'Browser', silence: 'Silence' };
    v.innerHTML = `<div class="one"><i></i>Live agent<b>${esc(lbl[got] || got)}</b>·<b>${Math.round((d.confidence || 0) * 100)}%</b><span class="${ok ? 'ok' : 'x'}">${ok ? '✓ matches' : '≠ differs'}</span></div>
      <div class="more"><div class="row"><span>Moment</span><b>${esc(d.eventLabel || 'none')}</b></div>
      <div class="row"><span>Decision</span><b>${esc(d.status.replace('_', ' '))}</b></div>
      <div class="row"><span>When</span><b>${esc(d.sendAt || '-')}</b></div>
      ${d.blockedBy && d.blockedBy.length ? `<div class="row"><span>Rules hit</span><b>${esc(d.blockedBy.join(', '))}</b></div>` : ''}
      ${d.message ? `<div class="msg"><b>${esc(d.message.title)}</b>${d.aiWritten ? ' <span class="ai-tag">AI copy</span>' : ''}<br>${esc(d.message.body)}</div>` : ''}</div>`;
    v.title = 'Decided live by the WATARI agent. Hover for details.';
    v.classList.add('show');
  }

  async function runLive(id) {
    const persona = MAP[id]; if (!persona) return;
    ac && ac.abort(); ac = new AbortController(); const my = ++curGen;
    const v = document.getElementById('verdict'); v.classList.remove('show');
    log('out', `<span class="lv">WATARI</span>POST /api/watari · customer=<b>${persona}</b> · real agent, not the script`, 'sys', 'gate');
    try {
      const res = await fetch('/api/watari', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: persona }), signal: ac.signal });
      if (!res.ok || !res.body) { log('run', `<span class="lv b">ERROR</span>agent unavailable (${res.status})`, 'sys'); return; }
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const l of lines) {
          if (!l.trim() || my !== curGen) continue;
          const m = JSON.parse(l);
          if (m.type === 'trace') { await new Promise((r) => setTimeout(r, m.e.kind === 'llm' ? 60 : 140)); if (my === curGen) liveLog(m.e); }
          if (m.type === 'decision' && my === curGen) verdict(m.decision, K.scenario(id));
        }
      }
    } catch (e) { if (e.name !== 'AbortError') log('run', '<span class="lv b">ERROR</span>connection lost', 'sys'); }
  }

  const origLoad = window.load;
  window.load = load = function (id) { origLoad(id); runLive(id); };
  // first scenario already loaded by the page: run the agent for it too
  runLive(new URLSearchParams(location.search).get('s') || 'move');

  // ---------- demo mode ----------
  const openLog = () => { const d = document.getElementById('logdock'); if (!d.classList.contains('open')) toggleLog(); };
  const closeLog = () => document.getElementById('logdock').classList.remove('open');
  const STEPS = [
    { sel: 'header', t: 'This is WATARI', b: 'A moment engine for KBC. The screens are only a window: the goal is to kill apps. The product is the agent that decides when KBC speaks, how, and when it stays quiet.', go: () => { closeLog(); load('move'); } },
    { sel: '.sigcol', t: 'Signals in', b: 'Bank, insurance and partner signals stream in, filtered by My Terms. Lotte pays a notary, a removal firm and a final Fluvius bill.' },
    { sel: '.orbitp', t: 'One brain, many hands', b: 'The agent fuses signals into one life moment, asks for least-privilege scopes, and then calls partners over API, agent-to-agent or the web.' },
    { sel: '#logdock', t: 'Watch it think, live', b: 'This log is the real agent running on the server: data reads, deterministic rules, blocks in red, LLM reasoning in purple, guardrails. Not a script.', go: openLog },
    { sel: '.wheelp', t: 'Right channel, right moment', b: 'Push, WhatsApp, mail, call, Messenger, browser or silence. The live verdict card shows what the agent decided and whether it matches the story.', go: closeLog },
    { sel: '.ledp', t: 'Hearts and coins', b: 'Time and money saved for the customer, retained value for KBC. Some moments only earn hearts.' },
    { sel: '#tabs', t: 'The hard case', b: 'Bereavement: the agent turns calm, mutes every promo, waits five days and hands over to a human. Watch the red BLOCK lines.', go: () => { load('grief'); setTimeout(openLog, 1500); } },
    { sel: '#bBuild', t: 'Try to break it', b: 'Build your own customer with any signals, even free text or a prompt injection. The same agent decides. The lab also runs the eval suite.', go: closeLog },
  ];
  let ti = 0, auto = true, timer = null, hl = null, box = null;
  function place() {
    const s = STEPS[ti]; const el = document.querySelector(s.sel); if (!el || !box) return;
    const r = el.getBoundingClientRect(); const pad = 6;
    Object.assign(hl.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const W = 340, H = box.offsetHeight || 180; let left = r.right + 14, top = r.top;
    if (left + W > innerWidth - 12) left = r.left - W - 14;
    if (left < 12) { left = Math.min(Math.max(12, r.left), innerWidth - W - 12); top = r.bottom + 12; if (top + H > innerHeight - 12) top = Math.max(12, r.top - H - 12); }
    top = Math.min(Math.max(12, top), innerHeight - H - 12);
    Object.assign(box.style, { left: left + 'px', top: top + 'px' });
  }
  function show() {
    const s = STEPS[ti]; clearTimeout(timer); s.go && s.go();
    box.innerHTML = `<div class="tp">DEMO<span style="font-family:var(--mono);color:var(--faint)">${ti + 1}/${STEPS.length}</span><span class="bar"><i style="width:${((ti + 1) / STEPS.length) * 100}%"></i></span><button class="x" title="End demo (Esc)">✕</button></div>
      <h4>${s.t}</h4><p>${s.b}</p>
      <div class="act"><button data-a="auto">${auto ? '❚❚ Auto' : '▶ Auto'}</button><span class="sp"></span>${ti ? '<button data-a="back">Back</button>' : ''}<button class="pri" data-a="next">${ti < STEPS.length - 1 ? 'Next' : 'Explore'}</button></div>`;
    setTimeout(place, 60); setTimeout(place, 500);
    if (auto && ti < STEPS.length - 1) timer = setTimeout(() => { ti++; show(); }, ti === 6 ? 9000 : 6500);
  }
  function endTour() { clearTimeout(timer); hl && hl.remove(); box && box.remove(); hl = box = null; try { localStorage.setItem('watari-tour', '1'); } catch (e) {} }
  function startTour() {
    endTour(); ti = 0; auto = true;
    hl = document.createElement('div'); hl.className = 'tour-hl'; box = document.createElement('div'); box.className = 'tour';
    document.body.append(hl, box);
    box.addEventListener('click', (e) => { const a = e.target.closest('button'); if (!a) return;
      if (a.classList.contains('x')) return endTour();
      if (a.dataset.a === 'auto') { auto = !auto; show(); }
      if (a.dataset.a === 'back') { ti = Math.max(0, ti - 1); show(); }
      if (a.dataset.a === 'next') { if (ti >= STEPS.length - 1) return endTour(); ti++; show(); } });
    show();
  }
  addEventListener('resize', place);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && box) endTour(); }, true);
  let seen = false; try { seen = !!localStorage.getItem('watari-tour'); } catch (e) {}
  if (!seen && !new URLSearchParams(location.search).get('notour')) setTimeout(startTour, 1200);
})();
