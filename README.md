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

## Status
- Done: pitch shell, slides, interlude, Demo 2 (full), Demo 1 big screen in Demo 2 style with phone mirror and zoom pop-outs
- Next: live phone sync and voice for Demo 1 (Soniox STT/TTS, Claude for deviations). Today the stage and phone sync in the same browser (rehearsal mode)

## Stack
Next.js 15 on Vercel · static demo pages in `public/` · env: `ANTHROPIC_API_KEY`, `SONIOX_API_KEY`. Design inputs and decisions: `design/`.
