# WATARI design hub

Single source of truth for the KBC final (Ghent, 20 Oct 2026): inputs, context, decisions, wireframes, architecture, hand-off.
Design only. **No backend code here.** The build happens in a separate chat (`cse_01N7g7bHWJ4D8N5HU8ZVp6DR`) that reads this folder.

## Folder map
| Folder | What lives here | Who writes |
|---|---|---|
| `00-inputs/` | Raw material: transcripts, briefs, images, screenshots, mega prompts. Never edited, only added | Larry + design chat |
| `01-context/` | Digested context: event, brief, judging, what is already built | Design chat |
| `02-decisions/` | Dated decision log + open questions | Design chat, Larry approves |
| `03-wireframes/` | Wireframe options, one folder per option, plus the review board | Design chat |
| `04-architecture/` | Screen flow, components, data contracts, build plan (later) | Design chat |
| `05-handoff/` | `HANDOFF.md`: the only file the builder needs to start | Design chat, frozen per version |

## Start here
- Builder: read `05-handoff/HANDOFF.md`, then `02-decisions/DECISIONS.md`
- Larry: drop new material in `00-inputs/` (images in `images/`, prompts in `briefs/`)
- Anyone: `01-context/CONTEXT.md` for the 2-minute story so far

## Rules
- Wireframes are self-contained HTML (vanilla JS, no build step), open by double-click
- Reuse the v7 visual core in `../public/w/core/` (orb, channels, data) where it fits
- Every option states: what the jury sees in 3 seconds, the story, what is fake vs real
- Light mode, KBC navy/cyan, icons, detail behind a click, no coloured side borders on cards
- Decisions only count once logged in `02-decisions/DECISIONS.md`
- Keep it flexible: nothing here locks the stack until `04-architecture/` says so
