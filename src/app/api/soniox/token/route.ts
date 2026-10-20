import { NextResponse } from "next/server";
import { limited, ipOf } from "@/lib/ratelimit";
import { SONIOX, hasSoniox, mintTempKey } from "@/lib/soniox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints a short-lived Soniox key for the phone's STT websocket. The real key stays here.
export async function POST(req: Request) {
  if (limited("soniox-token:" + ipOf(req), 12)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!hasSoniox()) return NextResponse.json({ error: "no_key" }, { status: 503 });
  try {
    const k = await mintTempKey("transcribe_websocket", 3600);
    return NextResponse.json(
      { api_key: k.api_key, expires_at: k.expires_at, model: SONIOX.sttModel, url: "wss://stt-rt.soniox.com/transcribe-websocket" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[soniox/token]", (e as Error).message);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
