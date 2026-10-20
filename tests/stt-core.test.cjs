// node --test tests/  ·  Soniox response parsing + endpointing + echo/barge-in rules (public/d1/core/stt-core.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { TurnTracker, simMessages } = require('../public/d1/core/stt-core.js');

// Responses shaped like https://soniox.com/docs/stt/api-reference/websocket-api (tokens, is_final, <end>, finished)
const R = {
  p1: { tokens: [{ text: 'O', start_ms: 600, end_ms: 700, confidence: 0.91, is_final: false }], final_audio_proc_ms: 0, total_audio_proc_ms: 760 },
  p2: { tokens: [{ text: 'Okay', start_ms: 600, end_ms: 860, confidence: 0.96, is_final: false }, { text: ' what', start_ms: 900, end_ms: 1100, confidence: 0.95, is_final: false }], final_audio_proc_ms: 0, total_audio_proc_ms: 1200 },
  f1: { tokens: [{ text: 'Okay', start_ms: 600, end_ms: 860, confidence: 0.97, is_final: true }, { text: '.', start_ms: 860, end_ms: 880, confidence: 0.9, is_final: true }, { text: ' What', start_ms: 900, end_ms: 1100, confidence: 0.95, is_final: true }, { text: ' do', start_ms: 1120, end_ms: 1220, confidence: 0.96, is_final: true }, { text: ' we', start_ms: 1240, end_ms: 1330, confidence: 0.97, is_final: true }, { text: ' do', start_ms: 1340, end_ms: 1460, confidence: 0.95, is_final: true }, { text: '?', start_ms: 1460, end_ms: 1480, confidence: 0.9, is_final: true }], final_audio_proc_ms: 1480, total_audio_proc_ms: 1900 },
  end: { tokens: [{ text: '<end>', confidence: 1, is_final: true }], final_audio_proc_ms: 2000, total_audio_proc_ms: 2000 },
  fin: { tokens: [], final_audio_proc_ms: 2100, total_audio_proc_ms: 2100, finished: true },
  err: { error_code: 401, error_type: 'unauthenticated', error_message: 'Invalid API key.', request_id: 'x' },
};

test('partials grow, final tokens replace non-final ones', () => {
  const t = new TurnTracker();
  assert.deepEqual(t.feed(R.p1, 760), [{ type: 'partial', text: 'O' }]);
  assert.deepEqual(t.feed(R.p2, 1200), [{ type: 'partial', text: 'Okay what' }]);
  const e = t.feed(R.f1, 1900);
  assert.equal(e[0].type, 'partial'); assert.equal(e[0].text, 'Okay. What do we do?');
  assert.equal(e.length, 1, 'no final before <end>');
});

test('end of turn needs <end> AND >= 700 ms of silence', () => {
  const t = new TurnTracker();
  t.feed(R.f1, 1900);
  // <end> arrives only 600 ms after the last word (1480): wait
  assert.deepEqual(t.feed(R.end, 2080), []);
  assert.deepEqual(t.tick(2150), []);
  const e = t.tick(2181);
  assert.equal(e.length, 1); assert.equal(e[0].type, 'final'); assert.equal(e[0].text, 'Okay. What do we do?');
  assert.ok(e[0].conf > 0.9 && e[0].conf <= 1);
  assert.deepEqual(t.tick(3000), [], 'flushes only once');
});

test('silence alone never ends a turn without <end>', () => {
  const t = new TurnTracker(); t.feed(R.f1, 1900); assert.deepEqual(t.tick(9000), []);
});

test('speaker continues after <end>: same turn, merged', () => {
  const t = new TurnTracker(); t.feed(R.f1, 1900); t.feed(R.end, 2000);
  t.feed({ tokens: [{ text: ' Fast', start_ms: 2100, end_ms: 2300, confidence: 0.9, is_final: false }] }, 2350);
  assert.deepEqual(t.tick(5000), [], 'non-final pending blocks the final');
  const e = t.feed({ tokens: [{ text: ' Fast', start_ms: 2100, end_ms: 2300, confidence: 0.9, is_final: true }, { text: '<end>', is_final: true, confidence: 1 }] }, 3100).filter(x => x.type === 'final'); assert.equal(e[0].text, 'Okay. What do we do? Fast');
});

test('finished flushes the last words, error is surfaced', () => {
  const t = new TurnTracker(); t.feed(R.f1, 1900);
  const e = t.feed(R.fin, 1950); assert.equal(e[0].type, 'final'); assert.equal(e[1].type, 'finished');
  const x = new TurnTracker().feed(R.err, 0); assert.equal(x[0].type, 'error'); assert.equal(x[0].errorType, 'unauthenticated');
});

test('Watari echo through the mic is dropped, no barge-in', () => {
  const t = new TurnTracker();
  t.watari(true, "Done. Payroll is covered. Your team gets paid Friday.", 1000);
  const e = t.feed({ tokens: [{ text: 'Payroll', start_ms: 1200, end_ms: 1500, confidence: 0.8, is_final: false }, { text: ' is', start_ms: 1500, end_ms: 1600, is_final: false, confidence: 0.8 }, { text: ' covered', start_ms: 1600, end_ms: 2200, is_final: false, confidence: 0.8 }, { text: ' 31,000', start_ms: 2200, end_ms: 2600, is_final: false, confidence: 0.8 }] }, 2700);
  assert.deepEqual(e, []);
  t.watari(false, '', 3000);
  t.feed({ tokens: [{ text: '<end>', is_final: true, confidence: 1 }] }, 4000);
  assert.deepEqual(t.tick(5000), []);
});

test('Larry talking over Watari > 600 ms = barge-in, his words are kept', () => {
  const t = new TurnTracker();
  t.watari(true, 'I chase Colruyt from your mailbox and bridge the gap', 1000);
  let e = t.feed({ tokens: [{ text: 'Wait', start_ms: 1500, end_ms: 1800, is_final: false, confidence: 0.9 }] }, 1850);
  assert.deepEqual(e, [], 'held back under 600 ms');
  e = t.feed({ tokens: [{ text: 'Wait', start_ms: 1500, end_ms: 1800, is_final: false, confidence: 0.9 }, { text: ' how', start_ms: 1850, end_ms: 2000, is_final: false, confidence: 0.9 }, { text: ' much', start_ms: 2000, end_ms: 2200, is_final: false, confidence: 0.9 }] }, 2250);
  assert.equal(e[0].type, 'barge'); assert.equal(e[1].text, 'Wait how much');
  t.watari(false, '', 2300);
  const ff = t.feed({ tokens: [{ text: 'Wait', start_ms: 1500, end_ms: 1800, is_final: true, confidence: 0.9 }, { text: ' how', start_ms: 1850, end_ms: 2000, is_final: true, confidence: 0.9 }, { text: ' much', start_ms: 2000, end_ms: 2200, is_final: true, confidence: 0.9 }, { text: '?', start_ms: 2200, end_ms: 2210, is_final: true, confidence: 0.9 }, { text: '<end>', is_final: true, confidence: 1 }] }, 3000).filter(x => x.type === 'final'); const f = t.tick(3000).concat(ff); assert.equal(f[0].type, 'final'); assert.equal(f[0].text, 'Wait how much?');
});

test('short noise while Watari speaks (< 600 ms) is discarded', () => {
  const t = new TurnTracker(); t.watari(true, 'Shall I go ahead?', 0);
  t.feed({ tokens: [{ text: 'Mm', start_ms: 100, end_ms: 300, is_final: true, confidence: 0.4 }] }, 400);
  t.watari(false, '', 1200);
  t.feed({ tokens: [{ text: '<end>', is_final: true, confidence: 1 }] }, 2000);
  assert.deepEqual(t.tick(2500), []);
});

test('simulated stream (sim provider) yields filler partials then one final', () => {
  const t = new TurnTracker(); const { msgs } = simMessages('Do it.', 5000);
  const all = []; for (const m of msgs) all.push(...t.feed(m.msg, 5000 + m.at));
  for (let a = 5000 + msgs.at(-1).at; a < 9000; a += 50) all.push(...t.tick(a));
  const p = all.filter(e => e.type === 'partial'), f = all.filter(e => e.type === 'final');
  assert.ok(p[0].text.startsWith('Uh,')); assert.equal(f.length, 1); assert.equal(f[0].text, 'Uh, Do it.');
});
