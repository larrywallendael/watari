/* WATARI 2.0 · step bridge: lets the pitch shell drive any step page that runs inside its iframe. */
(function () {
  if (window.parent === window) return; // opened on its own: nothing to bridge
  const send = (m) => { try { window.parent.postMessage(Object.assign({ watari: 'x' }, m), location.origin); } catch (e) {} };
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.isContentEditable || /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    // Demos keep the arrow keys for their own steps; slides and the interlude use them to move on.
    const demo = /^\/d[12]\//.test(location.pathname);
    let dir = 0;
    if (e.key === 'PageDown' || e.key === ']' || e.key === 'Enter') dir = 1;
    if (e.key === 'PageUp' || e.key === '[') dir = -1;
    if (!demo && e.key === 'ArrowRight') dir = 1;
    if (!demo && e.key === 'ArrowLeft') dir = -1;
    if (dir) { e.preventDefault(); e.stopImmediatePropagation(); send({ watari: 'nav', dir: dir }); }
  }, true);
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    const s = window.WATARI_STEP || {};
    if (e.data.watari === 'reset' && s.reset) s.reset();
    if (e.data.watari === 'start' && s.start) s.start();
    if (e.data.watari === 'pause' && s.pause) s.pause();
  });
  send({ watari: 'ready', path: location.pathname });
})();
