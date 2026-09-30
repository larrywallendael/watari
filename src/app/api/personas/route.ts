import { dbEnabled, listCustom, saveCustom } from "@/lib/db";
import { SEED_PERSONAS } from "@/lib/personas";
import { ipOf, limited } from "@/lib/ratelimit";
import { PersonaInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET() {
  const custom = await listCustom().catch(() => []);
  return Response.json({ seed: SEED_PERSONAS, custom, db: dbEnabled() });
}

export async function POST(req: Request) {
  if (limited("persona:" + ipOf(req), 10)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const parsed = PersonaInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid persona", issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  const id = "c-" + crypto.randomUUID().slice(0, 8);
  const persona = { ...parsed.data, id, custom: true, signals: parsed.data.signals.map((s, i) => ({ ...s, id: `${id}-s${i}`, category: s.category || undefined })) };
  try { await saveCustom(persona); } catch (e) { console.error(e); return Response.json({ error: "Could not save" }, { status: 500 }); }
  return Response.json({ persona });
}
