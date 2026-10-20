import { NextResponse } from "next/server";
import { z } from "zod";
import { limited, ipOf } from "@/lib/ratelimit";
import { SONIOX, hasSoniox, synth } from "@/lib/soniox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().trim().min(1).max(400) });

// POST {text} -> audio/mpeg (Soniox TTS, male voice). Cached in memory per text.
export async function POST(req: Request) {
  if (limited("tts:" + ipOf(req), 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!hasSoniox()) return NextResponse.json({ error: "no_key" }, { status: 503 });
  try {
    const t0 = Date.now();
    const a = await synth(parsed.data.text);
    return new NextResponse(a.buf, {
      headers: {
        "Content-Type": a.type,
        "Cache-Control": "private, max-age=3600",
        "X-TTS-Voice": SONIOX.ttsVoice,
        "X-TTS-Cache": a.cached ? "hit" : "miss",
        "X-TTS-Ms": String(Date.now() - t0),
      },
    });
  } catch (e) {
    console.error("[tts]", (e as Error).message);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
