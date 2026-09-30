import { runWatari } from "@/lib/agent";
import { getCustom, logRun } from "@/lib/db";
import { SEED_PERSONAS } from "@/lib/personas";
import { ipOf, limited } from "@/lib/ratelimit";
import type { TraceEvent } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ personaId: z.string().regex(/^[a-z0-9_-]{1,40}$/) }).strict();

export async function POST(req: Request) {
  if (limited("run:" + ipOf(req), 20)) return Response.json({ error: "Too many runs, wait a minute." }, { status: 429 });
  let body;
  try { body = Body.parse(await req.json()); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const persona = SEED_PERSONAS.find((p) => p.id === body.personaId) ?? (await getCustom(body.personaId).catch(() => null));
  if (!persona) return Response.json({ error: "Persona not found" }, { status: 404 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let n = 0;
      const t0 = Date.now();
      try {
        const decision = await runWatari(persona, (e: TraceEvent) => { n++; send({ type: "trace", e }); });
        send({ type: "decision", decision });
        await logRun(persona.id, decision, n, Date.now() - t0);
      } catch (err) {
        console.error("watari run failed", err);
        send({ type: "trace", e: { t: Date.now() - t0, kind: "error", label: "Run failed", detail: "see server logs" } });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
