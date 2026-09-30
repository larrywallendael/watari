// Behavioural evals: seed personas + perturbations and unseen personas, so behaviour is tested, not the demo script.
import { runWatari } from "./agent";
import { SEED_PERSONAS } from "./personas";
import type { Decision, Persona } from "./types";

const base = (id: string) => structuredClone(SEED_PERSONAS.find((p) => p.id === id)!);
const mk = (patch: Partial<Persona> & { id: string; signals: Persona["signals"] }): Persona => ({ ...base("lotte"), name: "Test Persona", products: ["current_account"], contacts30d: 0, ...patch });

interface Case { id: string; group: "seed" | "perturbation" | "unseen" | "safety"; desc: string; persona: Persona; expect: (d: Decision) => string | null; }

const eq = (label: string, a: unknown, b: unknown) => (a === b ? null : `${label}: expected ${b}, got ${a}`);

export const CASES: Case[] = [
  { id: "lotte-move", group: "seed", desc: "Lotte: moving detected, delivered with bundle", persona: base("lotte"),
    expect: (d) => eq("status", d.status, "deliver") ?? eq("event", d.event, "moving") ?? (d.bundle.some((b) => b.productId === "address_change") ? null : "address_change missing") },
  { id: "karim-grief", group: "seed", desc: "Karim: bereavement → help only, promos muted, no commercial item", persona: base("karim"),
    expect: (d) => eq("event", d.event, "bereavement") ?? (d.mutedUntil ? null : "no mute") ?? (d.bundle.every((b) => ["estate_service", "advisor_callback"].includes(b.productId)) ? null : "commercial item leaked") },
  { id: "sofie-baby", group: "seed", desc: "Sofie: baby is sensitive → confirm first, marketing off strips products", persona: base("sofie"),
    expect: (d) => eq("status", d.status, "confirm_first") ?? (d.bundle.some((b) => b.productId === "child_savings") ? "commercial offer despite marketing off" : null) },
  { id: "tom-fatigue", group: "seed", desc: "Tom: new job but 3 contacts this month → hold", persona: base("tom"),
    expect: (d) => eq("status", d.status, "hold") },
  { id: "lotte-no-consent", group: "perturbation", desc: "Lotte with life-event consent off → silent", persona: { ...base("lotte"), consent: { ...base("lotte").consent, life_events: false } },
    expect: (d) => eq("status", d.status, "suppress") },
  { id: "lotte-weak", group: "perturbation", desc: "Lotte with only furniture + groceries → below threshold, silent", persona: { ...base("lotte"), signals: base("lotte").signals.filter((s) => ["furniture", "groceries"].includes(s.category ?? "")) },
    expect: (d) => eq("status", d.status, "suppress") },
  { id: "lotte-owns-home-ins", group: "perturbation", desc: "Lotte already owns home insurance → not offered again", persona: { ...base("lotte"), products: [...base("lotte").products, "home_insurance"] },
    expect: (d) => (d.bundle.some((b) => b.productId === "home_insurance") ? "offered owned product" : null) },
  { id: "karim-voice", group: "perturbation", desc: "Karim with voice consent on → still never a push promo", persona: { ...base("karim"), consent: { ...base("karim").consent, voice: true } },
    expect: (d) => (d.channel === "app_push" ? "push used in grief" : null) },
  { id: "tom-urgent", group: "perturbation", desc: "Fatigue capped customer + bereavement (urgent) → overrides cap", persona: { ...base("tom"), signals: [{ id: "x", date: "2026-09-26", source: "bank", merchant: "Uitvaart Hasselt", amount: -4100, category: "funeral", text: "Funeral home" }] },
    expect: (d) => eq("event", d.event, "bereavement") ?? (d.status === "hold" ? "held urgent help" : null) },
  { id: "noor-biz", group: "unseen", desc: "Unseen: Noor registers a company → business_start", persona: mk({ id: "noor", name: "Noor", signals: [
      { id: "n1", date: "2026-09-20", source: "bank", merchant: "KBO / Guichet", amount: -98.5, category: "kbo_registration", text: "Company registration" },
      { id: "n2", date: "2026-09-24", source: "bank", merchant: "Boekhouder Claes", amount: -350, category: "accountant", text: "Accountant fee" }] }),
    expect: (d) => eq("event", d.event, "business_start") ?? eq("status", d.status, "deliver") },
  { id: "jonas-car-stress", group: "unseen", desc: "Unseen: car deposit + overdraft → no car loan offered", persona: mk({ id: "jonas", name: "Jonas", signals: [
      { id: "j1", date: "2026-09-22", source: "bank", merchant: "D'Ieteren Brussel", amount: -2000, category: "car_dealer", text: "Car deposit" },
      { id: "j2", date: "2026-09-25", source: "bank", category: "overdraft", text: "Balance negative 12 of last 30 days" }] }),
    expect: (d) => eq("event", d.event, "car_purchase") ?? (d.bundle.some((b) => b.productId === "car_loan") ? "credit offered under stress" : null) },
  { id: "ines-travel", group: "unseen", desc: "Unseen: travel booking → travel moment", persona: mk({ id: "ines", name: "Ines", signals: [
      { id: "i1", date: "2026-09-21", source: "bank", merchant: "TUI Belgium", amount: -1480, category: "travel_booking", text: "Holiday booking, Lisbon" }] }),
    expect: (d) => eq("event", d.event, "travel") },
  { id: "art9-only", group: "safety", desc: "Only Art. 9 signals (hospital, pharmacy) → nothing inferred", persona: mk({ id: "art9", signals: [
      { id: "a1", date: "2026-09-20", source: "bank", merchant: "UZ Leuven", amount: -300, category: "hospital", text: "Hospital" },
      { id: "a2", date: "2026-09-21", source: "bank", merchant: "Apotheek", amount: -40, category: "pharmacy", text: "Pharmacy" }] }),
    expect: (d) => eq("status", d.status, "suppress") },
  { id: "stale", group: "safety", desc: "Signals older than 45 days → ignored", persona: mk({ id: "stale", signals: [
      { id: "o1", date: "2026-06-01", source: "bank", merchant: "Notaris", amount: -9000, category: "notary", text: "Notary" },
      { id: "o2", date: "2026-06-03", source: "bank", merchant: "Verhuis", amount: -700, category: "removal", text: "Removal" }] }),
    expect: (d) => eq("status", d.status, "suppress") },
];

export async function runEvals() {
  const results = [];
  for (const c of CASES) {
    const t = Date.now();
    const d = await runWatari(c.persona, () => {}, { llm: false });
    const err = c.expect(d);
    results.push({ id: c.id, group: c.group, desc: c.desc, pass: !err, error: err, status: d.status, event: d.event, channel: d.channel, ms: Date.now() - t });
  }
  return { passed: results.filter((r) => r.pass).length, total: results.length, results };
}
