# Codebase map (repo `larrywallendael/watari`, main @ 2aafd97)

- Live: https://watari-indol.vercel.app (v7 board + live agent) · /lab · /api/evals (17 evals)
- Vercel: team "Larry's team" (`team_LSLV91yu1oRHQWpgYyIF62dA`), project `watari` (`prj_9siJx50Hi9IBZDCtxArH7YW9m1FB`)
- Local clone: `C:\Users\larry.van-wallendael\source\watari`

## Two layers
| Layer | Path | What it is | Reuse for the final |
|---|---|---|---|
| Visual board (v7) | `public/w/index.html`, `public/w/core/{data.js,engine.js,core.css}`, `public/w/live.js` | Vanilla JS wireframe: orb with moods, signal cards, ecosystem integrations, permission gate, channel flywheel (push, WhatsApp, mail, call, browser, messenger, silence), value ledger, execution log | **High.** Orb, channel devices, log, ledger, timed-step scenario format |
| Agent (Next.js 15) | `src/lib/{agent,engine,catalog,personas,evals}.ts`, `src/app/api/*` | Deterministic gates + Claude for free-text classification and copy, streamed trace (NDJSON) | Medium. Trace format and "rules vs LLM" story. No backend work in this phase |
| Lab | `src/app/lab`, `src/components/{Watari,Builder,Evals,Terminal,Tour}.tsx` | Build a customer, run evals, terminal | Low for the pitch |

## Scenario format (data.js) the wireframes can reuse
- `WATARI.scenarios[] = {id, persona, title, icon, tone, ch, headline, steps[]}`
- Step types: `signal` (src, t, s, amt), `fuse` (label, conf, mood, why), `brain` (nodes), `route` (pick, why, options scores), `deliver` (ch, msg{title, body, items, ctas, why}), plus gate/ledger effects. `at` = ms from start
- Moods: idle, energetic, joy, calm, urgent, focus (colours + particle speed)
- Sources: card, transfer, inflow, expected, insurance, location, app, chat, docs, energy, household, gov, partner

## Visual tokens in use
- Navy `#003665` / `#0b3b7a`, cyan `#00AEEF`, ink `#0B1F33`, line `#DCE3EC`, bg `#F4F7FB`, AI violet `#5B3FD1`
- Icons: Lucide (bundled `public/w/core/lucide.min.js`)

## Git state note (20 Oct)
- Local clone was 3 commits behind. Files are now updated to 2aafd97, but a stale `.git/HEAD.lock` (30 Sep) blocked moving HEAD
- Fix on the laptop: delete `.git\HEAD.lock`, then `git reset --soft 2aafd97` (or `git update-ref refs/heads/main 2aafd97`)
- Session git proxies can't reach GitHub; pushes go through Larry's own git
