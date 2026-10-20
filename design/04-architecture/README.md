# Architecture (later)

Filled after a wireframe is approved. Planned contents:
- `SCREENS.md`: screen-by-screen flow with timings and transitions
- `COMPONENTS.md`: reusable UI parts (orb, phone, call screen, carousel, app windows, ledger) with props
- `DATA.md`: scenario/step JSON contract the UI plays (extends `public/w/core/data.js` step types)
- `BUILD-PLAN.md`: stack, what is real vs scripted, order of work, demo fallbacks (cached run, backup video)

Principles carried from WATARI 1.0
- The decision layer stays deterministic and explainable; LLM only writes and classifies
- The screen is a window on the agent; every visual beat maps to a trace event
- Stage-safe: every live moment has a scripted fallback that looks identical
