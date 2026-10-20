# WATARI 2.0 · build notes (shared by all builder agents)

Repo root: /home/claude/watari2 (Next.js 15, deployed on Vercel project `watari`, live at https://watari-indol.vercel.app).
WATARI 1.0 is gone. Only these building blocks stay: Next.js + Vercel, API routes, Claude API (ANTHROPIC_API_KEY), Soniox (SONIOX_API_KEY, STT + TTS), rate limit helper `src/lib/ratelimit.ts`.

## Pitch flow (one web app, click or clicker through it)
| # | Step | URL inside the shell | Owner dir |
|---|---|---|---|
| 1 | Slide 1 (blank placeholder for now) | /app/slide.html?n=1 | public/app |
| 2 | Slide 2 (blank placeholder) | /app/slide.html?n=2 | public/app |
| 3 | Demo 1 · Payroll call ("CFO on Call") | /d1/index.html | public/d1 |
| 4 | Interlude · one agent, many CFO jobs (carousel: payroll call → investor update) | /app/interlude.html | public/app |
| 5 | Demo 2 · Investor update | /d2/index.html | public/d2 |
| 6 | Slide 3 (blank placeholder) | /app/slide.html?n=3 | public/app |

Shell = `/` → `public/app/index.html` (rewrite in next.config.ts). Each step loads in a full-screen iframe. Phone web app = `/phone` → `public/d1/phone.html`.

## Static pages rules
- Plain HTML/CSS/JS, no build step, no CDN scripts (CSP: script-src 'self' 'unsafe-inline'). Google Fonts CSS is allowed.
- Pages live in a sub folder: put `<base href="/d1/">` (or `/d2/`, `/app/`) in the head so relative paths work behind rewrites.
- Light mode only. No em dashes in copy (use "·" or a short hyphen). No coloured accent borders stuck on one side of cards.
- Design source of truth for styling = public/d2/index.html (the investor-update wireframe "v4 camera"): tokens (--navy #0b3b7a, --navy-d #062a5b, --cyan #00aeef, --ink #0b1f33, --bg #f4f7fb, --line #e3e9f1, Inter + JetBrains Mono), header (orb logo mark + WATARI + subline, company chip, numbered phase rail, controls right), white rounded panels, soft shadows, camera zoom, execution log bottom-left.
- Stage canvas = fixed 1600x940 design scaled to the window (see `fit()` in d2).

## Shell bridge (every step page)
Each step page includes `/app/bridge.js` (script src absolute). It:
- forwards keys PageDown / PageUp / "]" / "[" to the parent: `parent.postMessage({watari:'nav',dir:+1|-1},'*')`
- listens to parent messages `{watari:'reset'}` and `{watari:'start'}` and calls `window.WATARI_STEP?.reset()` / `.start()` if the page defines it.
- ArrowLeft/ArrowRight stay inside demos (they use them).

## Demo 1 realtime (no paid realtime account)
- Transport: WebRTC data channel via PeerJS public cloud signaling (stage peer id `watari2-<room>-stage`), plus a throttled ntfy.sh topic fallback for control events. Room default `kbc`, override with `?room=`.
- Stage (laptop) = engine + clock. Phone = renders + sends taps, STT partials/finals and audio level.
- STT: Soniox real-time WebSocket from the phone with a temporary key from `/api/soniox/token`.
- TTS: `/api/tts` (Soniox TTS, male voice) returns audio; the 4 scripted Watari lines are pre-fetched at "arm audio".
- Deviations: `/api/line` (Claude) writes one short reply inside the plan, allowlisted actions only.
