# WATARI · KBC moment engine

> KBC answers 80 million questions. WATARI answers the ones customers never had to ask, and knows when to stay quiet.

Tectonic Hackathon 2026 · KBC track. Live demo: `/` (wireframe + live agent log + verdict), agent lab: `/lab` (build a customer, evals). Everything runs on **synthetic data**. There are no real customers and no real KBC systems.

## What it is
WATARI is an orchestration agent that sits between KBC's signals (bank, insurance, app) and its channels (push, Kate, mail, voice, advisor). For each customer it decides:

1. **UNDERSTAND**: which life moment is happening (moving, bereavement, baby, new job, car, business start, travel). It uses noisy-OR evidence fusion over signals and a confidence threshold.
2. **ADAPT**: whether to speak at all (consent, fatigue cap, sensitivity, financial stress), on which channel, and when (the customer's usual app-open window).
3. **ACT**: a single pre-filled, one-tap bundle. The LLM writes the copy, and the rules validate every product it proposes.

The UI is only a window onto the agent. The **agent terminal** at the bottom streams every read, rule, block, LLM thought and guardrail live.

## Deterministic vs LLM
| Layer | Who decides |
|---|---|
| Consent gate, GDPR Art. 9 exclusion, lookback window | Rules |
| Life-moment detection + confidence | Rules (noisy-OR) |
| Sensitivity mode (help-only / confirm-first), promo mute, fatigue cap, stress | Rules |
| Channel + timing | Rules (preference × fit, habits) |
| Product allowlist + eligibility | Rules |
| Free-text signal → category | LLM, validated against a closed list |
| Message copy + reasoning | LLM, schema-validated, allowlist re-checked, commercial items stripped in help-only mode |

If the LLM fails or no key is set, WATARI falls back to template copy. The decision never depends on the LLM.

## Evals
`GET /api/evals` runs 17 behavioural cases (the 7 stories,: the seed personas, perturbations (consent off, weak evidence, owned product), unseen customers (business start, car + overdraft, travel) and safety cases (Art. 9 only, stale signals). They're also visible in the app under **Evals**.

## Run locally
```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (optional) and DATABASE_URL (optional)
npm run dev
```
Without `DATABASE_URL`, custom customers are kept in memory. Without `ANTHROPIC_API_KEY`, copy comes from templates.

## Stack
Next.js 15 (App Router) on Vercel · Neon Postgres (custom personas + run logs) · Claude API (Anthropic SDK, streaming) · zod validation · Tailwind.

## Security
- Keys live only in server env vars and are never sent to the browser. `.env*` is git-ignored
- Every input is validated with strict zod schemas, length caps and enums. Persona IDs are regex-checked
- Signal text goes to the LLM as data, and output categories and products are validated against closed allowlists (the prompt-injection preset in the builder demonstrates this)
- Per-IP rate limits on the agent, persona and eval endpoints
- Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- Parameterised SQL only (Neon tagged templates)

## Unfinished / next
- Voice channel (ElevenLabs) is represented but doesn't place a call
- Scale run (100k synthetic customers) isn't in this build
- Rate limiting is per instance (in memory). Production would use Redis/Upstash
