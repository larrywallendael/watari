// Neon Postgres: custom personas + run traces. Everything degrades gracefully without DATABASE_URL.
import { neon } from "@neondatabase/serverless";
import type { Decision, Persona } from "./types";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;
let ready: Promise<void> | null = null;
const mem: Persona[] = [];

async function init() {
  if (!sql) return;
  if (!ready) ready = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS watari_personas (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS watari_runs (id BIGSERIAL PRIMARY KEY, persona_id TEXT NOT NULL, decision JSONB NOT NULL, trace_len INT, ms INT, created_at TIMESTAMPTZ DEFAULT now())`;
  })();
  return ready;
}

export const dbEnabled = () => !!sql;

export async function listCustom(): Promise<Persona[]> {
  if (!sql) return mem;
  await init();
  const rows = await sql`SELECT data FROM watari_personas ORDER BY created_at DESC LIMIT 20`;
  return rows.map((r) => r.data as Persona);
}

export async function saveCustom(p: Persona) {
  if (!sql) { mem.unshift(p); mem.splice(20); return; }
  await init();
  await sql`INSERT INTO watari_personas (id, data) VALUES (${p.id}, ${JSON.stringify(p)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
  await sql`DELETE FROM watari_personas WHERE id NOT IN (SELECT id FROM watari_personas ORDER BY created_at DESC LIMIT 200)`;
}

export async function getCustom(id: string): Promise<Persona | null> {
  if (!sql) return mem.find((p) => p.id === id) ?? null;
  await init();
  const rows = await sql`SELECT data FROM watari_personas WHERE id = ${id}`;
  return (rows[0]?.data as Persona) ?? null;
}

export async function logRun(personaId: string, d: Decision, traceLen: number, ms: number) {
  if (!sql) return;
  try { await init(); await sql`INSERT INTO watari_runs (persona_id, decision, trace_len, ms) VALUES (${personaId}, ${JSON.stringify(d)}::jsonb, ${traceLen}, ${ms})`; } catch {}
}

export async function runStats() {
  if (!sql) return null;
  try { await init(); const r = await sql`SELECT count(*)::int AS runs, coalesce(avg(ms),0)::int AS avg_ms FROM watari_runs`; return r[0]; } catch { return null; }
}
