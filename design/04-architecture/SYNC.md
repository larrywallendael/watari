# CFO on Call · stage sync design (for the builder)

Prototype: `03-wireframes/call-demo/` (engine `core/call.js`, phone `core/phone.js`, contract `CONTRACT.md`). Build = same events, real transport, real voice.

## Roles
| Device | Runs | Plays sound |
|---|---|---|
| Laptop (big screen) | The story engine (state machine + script), all big-screen visuals | Only after hang-up (app sounds), never during ring/call |
| iPhone 16 (web app, Add to Home Screen) | Renders lock screen, incoming call, call, KBC approval; mic; TTS playback | Ringtone, Watari voice |

## Transport
- One realtime room per demo run. Hosted pub/sub (Ably, Pusher or PartyKit). Vercel functions can't keep WebSockets open
- Events exactly as in `CONTRACT.md`. Phone sends `input` + `say` (STT partials/finals) + `level`; laptop sends everything else
- Laptop is the clock. A late joiner gets a `snapshot` and redraws (already in the prototype)
- Latency budget: ring visible on both < 150 ms after `call:ringing`

## Voice loop (on the iPhone)
1. Mic → Soniox streaming STT (partials every ~100 ms) → `say {who:user, partial}` to the room
2. End of turn = Soniox endpoint + 700 ms silence. Watari never talks over Larry
3. Laptop engine: intent first (affirm, what, cost, why, deny), scripted line if it matches, otherwise Claude writes a short answer inside the same plan (allowlisted actions only)
4. Line → ElevenLabs streaming TTS, played on the iPhone; phone sends `level` (RMS, ~15/s) so the big orb pulses with the voice
5. Scripted lines are pre-rendered as audio files: zero TTS latency on the happy path, live TTS only when Larry deviates

## Stage risks and answers
- iOS blocks audio until a tap: "Tap to arm audio" screen on the phone (in the prototype)
- iOS web can't vibrate. If needed: real outbound call via ElevenLabs + Twilio (native ring + buzz), the stage mirrors that call through webhooks instead
- Venue network: own hotspot; if the room link drops, laptop keys `N` (next line), `Y` (approve), `B` (backup video) keep the show going
- Screen lock: Auto-Lock Never + Wake Lock request on arm
