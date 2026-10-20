import { NextResponse } from "next/server";
import { limited, ipOf } from "@/lib/ratelimit";
import { SONIOX, hasSoniox } from "@/lib/soniox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rehearsal check: which providers are configured (booleans only, never key material).
export async function GET(req: Request) {
  if (limited("rt-status:" + ipOf(req), 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  return NextResponse.json(
    {
      soniox: hasSoniox(),
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      sttModel: SONIOX.sttModel,
      ttsModel: SONIOX.ttsModel,
      ttsVoice: SONIOX.ttsVoice,
      lineModel: process.env.ANTHROPIC_LINE_MODEL || "claude-haiku-4-5",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
