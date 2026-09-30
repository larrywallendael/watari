// Deterministic core: every rule here is testable and explainable. The LLM never overrides it.
import { CATALOG, CHANNELS, DEMO_NOW, EVENTS, RULES, SIGNAL_CATEGORIES, type EventDef } from "./catalog";
import type { BundleItem, ChannelId, Persona, Signal } from "./types";

export interface Detection { event: EventDef; confidence: number; evidence: Signal[]; }

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function filterSignals(signals: Signal[]) {
  const used: Signal[] = [], art9: Signal[] = [], noise: Signal[] = [], stale: Signal[] = [], unknown: Signal[] = [];
  for (const s of signals) {
    const c = s.category ? SIGNAL_CATEGORIES[s.category] : undefined;
    if (!c) { unknown.push(s); continue; }
    if (daysBetween(s.date, DEMO_NOW) > RULES.lookbackDays) { stale.push(s); continue; }
    if (c.art9) art9.push(s);
    else if (c.noise) noise.push(s);
    else used.push(s);
  }
  return { used, art9, noise, stale, unknown };
}

// Noisy-OR evidence fusion: independent signals raise confidence, never above 1.
export function detect(used: Signal[]): Detection[] {
  const out: Detection[] = [];
  for (const ev of EVENTS) {
    const evidence = used.filter((s) => s.category && ev.evidence[s.category] !== undefined);
    if (!evidence.length) continue;
    const seen = new Set<string>();
    let miss = 1;
    for (const s of evidence) {
      if (seen.has(s.category!)) continue; // same category counted once
      seen.add(s.category!);
      miss *= 1 - ev.evidence[s.category!];
    }
    out.push({ event: ev, confidence: Math.round((1 - miss) * 100) / 100, evidence });
  }
  return out.sort((a, b) => b.confidence * b.event.urgency - a.confidence * a.event.urgency);
}

export function eligibleBundle(p: Persona, ev: EventDef, allowCommercial: boolean): { items: string[]; dropped: { id: string; reason: string }[] } {
  const items: string[] = [], dropped: { id: string; reason: string }[] = [];
  for (const id of ev.bundle) {
    const prod = CATALOG[id];
    if (!prod) continue;
    if (p.products.includes(id)) dropped.push({ id, reason: "already owned" });
    else if (prod.commercial && !allowCommercial) dropped.push({ id, reason: "commercial offer not allowed" });
    else items.push(id);
  }
  return { items, dropped };
}

export function pickChannel(p: Persona, ev: EventDef, used: Signal[]): { channel: ChannelId; scores: Record<string, number>; excluded: string[] } {
  const excluded: string[] = [];
  const liveCheckout = used.some((s) => s.category && SIGNAL_CATEGORIES[s.category]?.live);
  const scores: Record<string, number> = {};
  (Object.keys(CHANNELS) as ChannelId[]).forEach((c) => {
    if (c === "call" && !p.consent.voice && !(ev.sensitivity === "emergency" && p.consent.emergency)) { excluded.push("call (no voice consent)"); return; }
    if (c === "browser" && !liveCheckout) { excluded.push("browser (customer not in a checkout)"); return; }
    let fit = ev.channelFit[c] ?? 0.1;
    if (c === "browser" && liveCheckout) fit *= 1.6;
    scores[c] = Math.round((p.channelPrefs[c] ?? 0.3) * fit * 100) / 100;
  });
  const channel = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "push") as ChannelId;
  return { channel, scores, excluded };
}

export function inQuietHours(hour: number) {
  const [from, to] = RULES.quietHours;
  return hour >= from || hour < to;
}

export function bundleItems(ids: string[]): BundleItem[] {
  return ids.map((id) => ({ productId: id, title: CATALOG[id].title, prefill: "" }));
}

// Demo clock is Brussels local time (18:20 unless the persona's moment says otherwise).
export const DEMO_HOUR = 18 + 20 / 60;
export function nextWindow(p: Persona): string {
  const now = p.localHour ?? DEMO_HOUR;
  const hours = [...p.appOpenHours].sort((a, b) => a - b);
  const next = hours.find((x) => x > now);
  const pad = (n: number) => String(n).padStart(2, "0") + ":00";
  if (next === undefined) return `Tomorrow ${pad(hours[0] ?? 9)}`;
  return `Today ${pad(next)}`;
}
