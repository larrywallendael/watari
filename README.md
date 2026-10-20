# WATARI 2.0 · KBC's AI CFO for startups

**Live:** https://watari-indol.vercel.app · phone app: https://watari-indol.vercel.app/phone

One web app that runs the whole pitch. Click the tracker at the bottom, or use a clicker (PageDown/PageUp).

| # | Step | Path |
|---|---|---|
| 1 | Slide · Cover | `public/app/slides/01-cover.html` |
| 2 | Demo 1 · Payroll call (CFO on Call) | `public/d1/` (stage) + `/phone` |
| 3 | Interlude · one agent, many CFO jobs | `public/app/interlude.html` |
| 4 | Demo 2 · Investor update | `public/d2/` |
| 5 | Slide · Win-win-win | `public/app/slides/02-win-win-win.html` |
| 6 | Slide · Market | `public/app/slides/03-market.html` |
| 7 | Slide · Vision | `public/app/slides/04-vision.html` |

## Demo keys
- Demo 1: Space start/answer · N next line · Y approve · H hang up · R reset · P pause · B backup video
- Demo 2: Space play/pause · → next phase · R restart · 1-5 jump

## Demo 1 on stage (laptop + iPhone)
1. iPhone: open https://watari-indol.vercel.app/phone in Safari → Share → Add to Home Screen → open WATARI from the home screen (full screen)
2. Tap "arm audio" once (sound + mic). Do Not Disturb on, Auto-Lock never
3. Laptop: open https://watari-indol.vercel.app/#2 (or /d1). The grey dot top-right turns green when the phone is linked
4. Space starts. The iPhone rings, answer, talk. Approve the KBC notification with a tap
- Live: peer-to-peer link (PeerJS) with ntfy fallback, Soniox STT (stt-rt-v5) + Soniox TTS (voice Adrian), Claude Haiku for off-script answers
- Safety keys on the laptop: N next line · Y approve · H hang up · B backup video · P pause · R reset
- Rooms: default `kbc`; use `?room=xyz` on both devices to isolate a rehearsal

## Status
- Done: pitch shell, slides, interlude, Demo 2, Demo 1 with live phone sync, voice and Claude (tested on production: P2P link, STT, TTS, Claude)

## Stack
Next.js 15 on Vercel · static demo pages in `public/` · env: `ANTHROPIC_API_KEY`, `SONIOX_API_KEY`. Design inputs and decisions: `design/`.
