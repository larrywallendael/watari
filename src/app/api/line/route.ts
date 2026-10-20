import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { limited, ipOf } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["mail", "credit", "payroll", "crm", "cal", "repay", "none"] as const;
const Stage = z.enum(["await1", "await2", "approve", "chaseOnly"]);
const Body = z.object({
  text: z.string().trim().min(1).max(400),
  stage: Stage.default("await1"),
  transcript: z.array(z.object({ who: z.enum(["watari", "user"]), text: z.string().max(400) })).max(12).default([]),
});
const Out = z.object({ line: z.string().trim().min(2).max(220), action: z.enum(ACTIONS).default("none") });

// Safe scripted lines if Claude is slow, down or off-plan. Always inside the same plan.
const SAFE: Record<z.infer<typeof Stage>, string> = {
  await1: "Short version: I chase Colruyt from your mailbox and bridge the gap with your KBC credit line. Want me to?",
  await2: "Same plan: chase Colruyt, bridge thirty-one thousand with your KBC credit line, about sixty euros. Shall I go ahead?",
  approve: "The approval is on your screen from KBC. Tap approve and payroll is covered.",
  chaseOnly: "Understood. I'll chase Colruyt and call you Thursday if they still haven't paid.",
};

const SYSTEM = `You are Watari, an AI CFO on a live phone call with Larry, founder of Kodo (B2B SaaS, 12 people, Leuven).
Facts (never invent others): payroll for 12 people goes out Friday 23 Oct, €79,200. Balance today €48,200, so €31,000 short.
Cause: Colruyt Group has not paid invoice INV-2026-0412, €31,000, sent 10 Sep, 40 days late. Every other client is on time.
Plan: send a reminder to Colruyt from Larry's mailbox, and bridge the gap with Larry's KBC credit line (€50,000 limit, draw €31,000, about €60 interest for ~2 weeks, fixed 5.2% APR, no other fees, repay anytime, auto-repay when Colruyt pays). Larry must approve the KBC draw on his phone. Follow-up booked Thursday 09:00.
You may only act through these action ids: mail, credit, payroll, crm, cal, repay, none.
Rules: reply with ONE or two short spoken sentences, 20 words max in total, plain English, no lists, no emojis, no markdown, no dashes, numbers written as words when spoken (say "thirty-one thousand euros").
Stay inside the plan. If Larry asks something off-topic, answer in a few words and steer back to the plan. Never claim something is done before he approves. Never ask for passwords, codes or card details.
Output ONLY JSON: {"line":"...","action":"none"}`;

const STAGE_HINT: Record<z.infer<typeof Stage>, string> = {
  await1: "You just told Larry about the payroll gap and the late Colruyt invoice. He has not heard the plan yet.",
  await2: "You proposed the plan (chase Colruyt + bridge with the KBC credit line, about sixty euros). Waiting for his go.",
  approve: "The KBC approval notification is on his phone. Waiting for him to tap approve.",
  chaseOnly: "Larry declined the credit line. You only chase Colruyt and check back Thursday.",
};

// Spoken + shown on stage: no dashes, max 25 words, cut at a sentence boundary when possible.
function clampWords(s: string, n = 25) {
  const clean = s.replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/[*_#`"]/g, "").replace(/\s+/g, " ").trim();
  const words = (x: string) => x.split(" ").filter(Boolean).length;
  if (words(clean) <= n) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = "";
  for (const sn of sentences) { const next = (out + " " + sn.trim()).trim(); if (words(next) > n) break; out = next; }
  if (out) return out;
  return clean.split(" ").slice(0, n).join(" ").replace(/[,;:]$/, "") + ".";
}

export async function POST(req: Request) {
  if (limited("line:" + ipOf(req), 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { text, stage, transcript } = parsed.data;
  const safe = { line: SAFE[stage], action: "none" as const, source: "safe" as const };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ ...safe, reason: "no_key" });
  const model = process.env.ANTHROPIC_LINE_MODEL || "claude-haiku-4-5";
  const t0 = Date.now();
  try {
    const client = new Anthropic({ apiKey: key, timeout: 4000, maxRetries: 0 });
    const convo = transcript.map((l) => `${l.who === "watari" ? "Watari" : "Larry"}: ${l.text}`).join("\n");
    const msg = await client.messages.create(
      {
        model,
        max_tokens: 120,
        temperature: 0.4,
        system: SYSTEM,
        messages: [
          { role: "user", content: `${STAGE_HINT[stage]}\nCall so far:\n${convo || "(none)"}\nLarry just said: "${text.replace(/"/g, "'")}"\nYour JSON:` },
          { role: "assistant", content: "{" },
        ],
      },
      { signal: AbortSignal.timeout(4000) },
    );
    const raw = "{" + msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = raw.slice(0, raw.lastIndexOf("}") + 1);
    const out = Out.safeParse(JSON.parse(json));
    if (!out.success) return NextResponse.json({ ...safe, reason: "invalid", ms: Date.now() - t0 });
    return NextResponse.json({ line: clampWords(out.data.line), action: out.data.action, source: "claude", model, ms: Date.now() - t0 });
  } catch (e) {
    console.error("[line]", (e as Error).message);
    return NextResponse.json({ ...safe, reason: "error", ms: Date.now() - t0 });
  }
}
