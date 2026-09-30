import { runEvals } from "@/lib/evals";
import { runStats } from "@/lib/db";
import { ipOf, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (limited("evals:" + ipOf(req), 10)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const r = await runEvals();
  return Response.json({ ...r, stats: await runStats() });
}
