# CFO on Call · event contract (stage ⇄ phone)

One master engine (the stage page) runs the story and emits events on `W.bus`. Every screen only renders events.
Phone taps come back as `input` events. Transport = BroadcastChannel today (two windows, same browser), WebSocket relay in the real build.

## Load order in a page
```html
<link rel="stylesheet" href="core/phone.css">
<script src="core/lucide.min.js"></script>   <!-- optional icons: K.ic('name') then K.icons() -->
<script src="core/orb.js"></script>          <!-- K.Orb(canvas,{scale,n}), K.link(fromEl,toEl,{color,dur,bend}), K.fly(fromEl,toEl,{kind:'coin'|'heart'}) -->
<script src="core/call.js"></script>         <!-- W.CFG, W.PARTNERS, W.logo(id,size), W.bus, W.engine, W.audio, W.state -->
<script src="core/phone.js"></script>        <!-- W.Phone.mount(el,{mode:'mirror'}) ; set el.style --s for scale -->
```
`W.logo(id)` needs this CSS in the page: `.wlogo{display:inline-grid;place-items:center;border-radius:8px;background:var(--lg);color:var(--lf);font-weight:800;overflow:hidden}.wlogo img{width:100%;height:100%;object-fit:contain}.wlogo img+b{display:none}`
Partner ids: `kbc, sdworx, attio, peppol, outlook, calendar, colruyt`.

## Events (W.bus.on(type, fn(data)))
| type | data | when |
|---|---|---|
| `reset` | {} | R key / restart |
| `scene` | {name: calm · signals · alert · dialing · ringing · call · work · end} | story beats |
| `mood` | {mood: idle · focus · alert · speaking · listening · thinking · done · calm, label} | call `orb.setMood(mood)` |
| `log` | {kind: phase · read · rule · call · pass · block · think · decide, text, detail, t} | execution log lines |
| `signal` | {id: bal · pay · inv, src: partner id, title, sub, amt, tone: pos · neg · late} | data flowing into the orb |
| `gap` | {balance, payroll, gap} | cash vs payroll, show the empty part |
| `search` | {src: attio · peppol, q} | Watari looking for the cause |
| `cause` | {name, short, invoice, amount, daysLate, sent, color} | the late client |
| `dial` | {} | path from orb to the phone starts |
| `call` | {status: ringing · active · ended, start, dur} | phone state |
| `say` | {who: watari · user, text, sid, partial, final} | live transcript. user partials stream word by word (STT) |
| `level` | {who, v 0..1} | ~14/s voice amplitude, drive `orb.level(v)` / waveform |
| `say-start` / `say-end` | {sid} | Watari audio playback boundaries |
| `think` | {start:true} or {step:'text'} | reasoning after a user turn |
| `await` | {accept:[...], hint} | engine waits for Larry; hint = scripted line |
| `proposal` | {} | Watari starts the proposal: previews appear WHILE it speaks |
| `action` | {id: mail · credit · payroll · crm · cal · repay, app: partner id, title, detail, status: preview · running · done} | work items |
| `notif` | {id, app: kbc · watari, title, body, actions, status: shown · approved · declined · dismissed, lock} | phone notifications (lock = after the call, on lock screen) |
| `ledger` | {k: payroll · timeSaved · fee · kbcCredit, v} | outcome numbers |
| `sfx` | {name: tick · click · whoosh · chime · send · success · alert · notif · end} | app sounds; the stage plays them itself only outside the call |
| `peers` | {phone, stage} timestamps | `W.phoneLinked()` true = audio on the phone |
| `auto` | {on} | auto user voice toggled |
| `backup` | {} | B key: show the backup video overlay |

## Inputs (W.bus.emit('input',{type}))
`start · answer · decline · approve · declineNotif · hangup · reset`. Operator: `W.engine.start()`, `W.engine.say(text)` (deviation line, same as an STT final), `W.engine.simNext()`.

## Keys on the stage
Space start/answer · A answer · N next scripted line (when auto off) · Y approve · H hang up · R reset · M auto user voice · T type a line · U arm audio · B backup video

## Audio rule
During ringing + call all sound comes from the phone (ringtone, Watari voice). Stage plays app sounds only in `work`/`end`. If no phone is linked, the stage plays everything (rehearsal).
