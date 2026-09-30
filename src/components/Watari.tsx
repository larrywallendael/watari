"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATALOG, CHANNELS, SIGNAL_CATEGORIES } from "@/lib/catalog";
import type { ChannelId, Decision, Persona, TraceEvent } from "@/lib/types";
import Terminal from "./Terminal";
import Builder from "./Builder";
import Evals from "./Evals";
import Tour, { type TourStep } from "./Tour";

const I = {
  bolt: <path d="M13 2L3 14h8l-1 8 10-12h-8z" />,
  play: <path d="M6 4l14 8-14 8z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6L9 17l-5-5" />,
  flask: <path d="M9 3h6M10 3v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-6-10V3" />,
  term: <path d="M4 17l6-5-6-5M12 19h8" />,
  push: <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />,
  chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  mail: <path d="M4 4h16v16H4zM4 6l8 7 8-7" />,
  phone: <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
};
export const Icon = ({ d, className = "w-4 h-4" }: { d: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>{d}</svg>
);
const CH_ICON: Record<ChannelId, React.ReactNode> = { push: I.push, whatsapp: I.chat, mail: I.mail, call: I.phone, messenger: I.chat, browser: I.user };

const STATUS: Record<string, { label: string; cls: string; tip: string }> = {
  deliver: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", tip: "WATARI speaks: right moment, right channel, pre-filled actions." },
  confirm_first: { label: "Asks to confirm", cls: "bg-sky-50 text-sky-700 border-sky-200", tip: "Sensitive inference: the customer confirms before anything happens." },
  hold: { label: "Held back", cls: "bg-amber-50 text-amber-700 border-amber-200", tip: "A rule blocked sending now. It is queued, not lost." },
  suppress: { label: "Stays silent", cls: "bg-slate-100 text-slate-600 border-slate-200", tip: "Not enough evidence or no consent. Silence is a decision." },
};

export default function Watari() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [custom, setCustom] = useState<Persona[]>([]);
  const [db, setDb] = useState(false);
  const [sel, setSel] = useState("lotte");
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [running, setRunning] = useState(false);
  const [termOpen, setTermOpen] = useState(true);
  const [builder, setBuilder] = useState(false);
  const [evals, setEvals] = useState(false);
  const [tour, setTour] = useState(false);
  const [approved, setApproved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const all = [...personas, ...custom];
  const persona = all.find((p) => p.id === sel);

  const load = useCallback(async () => {
    const r = await fetch("/api/personas").then((x) => x.json()).catch(() => null);
    if (r) { setPersonas(r.seed); setCustom(r.custom); setDb(r.db); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("build")) setBuilder(true);
  }, []);

  const run = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setSel(id); setTrace([]); setDecision(null); setRunning(true); setApproved(false); setTermOpen(true);
    try {
      const res = await fetch("/api/watari", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaId: id }), signal: ac.signal });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); setTrace([{ t: 0, kind: "error", label: j.error ?? "Request failed" }]); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const m = JSON.parse(l);
          if (m.type === "trace") { await new Promise((r) => setTimeout(r, m.e.kind === "llm" ? 30 : 110)); setTrace((t) => [...t, m.e]); }
          if (m.type === "decision") setDecision(m.decision);
        }
      }
    } catch (e) { if ((e as Error).name !== "AbortError") setTrace((t) => [...t, { t: 0, kind: "error", label: "Connection lost" }]); }
    finally { if (abortRef.current === ac) setRunning(false); }
  }, []);

  const steps: TourStep[] = [
    { target: "brand", title: "This is WATARI", body: "The screens here are only a window. The product is the agent: it decides when KBC speaks, how, and when to stay quiet. The goal is to kill apps, not add one." },
    { target: "personas", title: "Pick a customer", body: "Four synthetic Belgians, each with bank, insurance and app signals. Let's run Lotte, who is moving from Gent to Leuven.", action: () => run("lotte") },
    { target: "terminal", title: "Watch it think", body: "Every step streams live: data reads, deterministic rules (green), blocks (red), LLM reasoning (purple) and guardrails. Nothing hidden." },
    { target: "context", title: "Evidence, not guesses", body: "Notary, removal firm and Fluvius combine into 'moving'. The pharmacy payment is excluded under GDPR Art. 9, never used." },
    { target: "surface", title: "One tap, pre-filled", body: "The moment lands on the channel WATARI picked, in the customer's usual window. Approve all, or pick." },
    { target: "personas", title: "Now the hard case", body: "Karim just paid a funeral home. Watch WATARI mute every promo and send one human message.", action: () => run("karim") },
    { target: "builder", title: "Try to break it", body: "Build your own customer with any signals, even free text. WATARI classifies them with the LLM, then the same rules apply." },
    { target: "evals", title: "Tested, not scripted", body: "14 behavioural evals, including unseen customers and safety cases, run against the live engine." },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${termOpen ? "pb-[38vh]" : "pb-14"}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--line)]">
        <div className="max-w-[1400px] mx-auto px-5 h-14 flex items-center gap-4">
          <div data-tour="brand" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--navy)] text-white grid place-items-center"><Icon d={I.bolt} /></div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-[0.18em] text-[var(--navy)]">WATARI</div>
              <div className="text-[11px] text-[var(--muted)] -mt-0.5">Agent lab · build customers, inspect decisions, run evals · <a href="/" className="underline">back to the live demo</a></div>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden md:inline text-[11px] mono text-[var(--muted)]" title="Demo clock used by the Quiet Hours rules">demo clock · Wed 30 Sep 18:20</span>
          <button data-tour="evals" onClick={() => setEvals(true)} className="h-9 px-3 rounded-lg border border-[var(--line)] text-sm flex items-center gap-2 hover:bg-slate-50" title="Run the behavioural eval suite"><Icon d={I.flask} />Evals</button>
          <button data-tour="builder" onClick={() => setBuilder(true)} className="h-9 px-3 rounded-lg border border-[var(--line)] text-sm flex items-center gap-2 hover:bg-slate-50" title="Create your own customer and signals"><Icon d={I.plus} />Build a customer</button>
          <button onClick={() => setTour(true)} className="h-9 px-3 rounded-lg bg-[var(--navy)] text-white text-sm flex items-center gap-2 hover:opacity-90" title="Guided 60-second walkthrough"><Icon d={I.play} />Demo mode</button>
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto px-5 py-5 grid gap-5 lg:grid-cols-[300px_1fr_380px]">
        {/* Personas */}
        <section data-tour="personas" className="bg-white rounded-2xl border border-[var(--line)] p-3 h-fit">
          <div className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase px-2 pt-1 pb-2">Customers</div>
          <div className="grid gap-1.5">
            {all.map((p) => (
              <button key={p.id} onClick={() => run(p.id)} disabled={running && sel === p.id}
                className={`text-left rounded-xl px-3 py-2.5 border transition ${sel === p.id ? "border-[var(--cyan)] bg-sky-50/60" : "border-transparent hover:bg-slate-50"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${p.custom ? "bg-violet-100 text-violet-700" : "bg-[var(--navy)] text-white"}`}>{p.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.name}, {p.age}</div>
                    <div className="text-xs text-[var(--muted)] truncate">{p.city} · {p.segment}</div>
                  </div>
                  {sel === p.id && running && <span className="ml-auto w-2 h-2 rounded-full bg-[var(--cyan)] pulse" />}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setBuilder(true)} className="mt-2 w-full text-sm rounded-xl border border-dashed border-[var(--line)] py-2 text-[var(--muted)] hover:text-[var(--navy)] hover:border-[var(--navy)] flex items-center justify-center gap-1.5"><Icon d={I.plus} />Your own customer</button>
          <p className="text-[11px] text-[var(--muted)] px-2 pt-3">Synthetic data only. {db ? "Custom customers saved in Postgres." : "Custom customers kept in memory."}</p>
        </section>

        {/* Surface */}
        <section data-tour="surface" className="bg-white rounded-2xl border border-[var(--line)] p-5 min-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">What the customer experiences</div>
              <div className="text-sm text-[var(--muted)]">Visualisation only. WATARI chooses the channel, the screen is not the product.</div>
            </div>
            {decision && <span title={STATUS[decision.status].tip} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS[decision.status].cls}`}>{STATUS[decision.status].label}</span>}
          </div>

          <div className="flex gap-2 mb-5 flex-wrap">
            {(Object.keys(CHANNELS) as ChannelId[]).map((c) => {
              const on = decision?.channel === c;
              const noVoice = c === "call" && persona && !persona.consent.voice && !persona.consent.emergency;
              return (
                <div key={c} title={noVoice ? "No voice consent: channel excluded" : CHANNELS[c].label}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${on ? "bg-[var(--navy)] text-white border-[var(--navy)]" : noVoice ? "text-slate-300 border-slate-100 line-through" : "text-[var(--muted)] border-[var(--line)]"}`}>
                  <Icon d={CH_ICON[c]} className="w-3.5 h-3.5" />{CHANNELS[c].short}
                </div>
              );
            })}
          </div>

          <div className="grid place-items-center">
            <div className="w-[320px] rounded-[36px] border-[10px] border-slate-900 bg-[#EEF3F8] h-[470px] relative overflow-hidden shadow-xl">
              <div className="absolute top-0 inset-x-0 h-7 flex justify-center"><div className="w-24 h-5 bg-slate-900 rounded-b-2xl" /></div>
              <div className="pt-9 px-4 text-[11px] text-slate-500 flex justify-between"><span>{decision?.sendAt?.replace("Today ", "") ?? "18:20"}</span><span>KBC Mobile</span></div>
              <div className="px-3 pt-3 grid gap-2.5">
                {!decision && !running && <div className="text-center text-sm text-slate-400 pt-24 px-6">Pick a customer to let WATARI decide.</div>}
                {running && !decision && <div className="text-center text-sm text-slate-500 pt-24 caret">WATARI is thinking</div>}
                {decision && <PhoneCard d={decision} persona={persona} approved={approved} onApprove={() => setApproved(true)} />}
              </div>
            </div>
          </div>
        </section>

        {/* Context */}
        <section data-tour="context" className="bg-white rounded-2xl border border-[var(--line)] p-4 h-fit">
          <div className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase mb-2">Customer context</div>
          {persona ? (
            <>
              <p className="text-sm text-slate-700">{persona.bio}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(persona.consent).map(([k, v]) => (
                  <span key={k} title="From My Terms / Privacy op maat" className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${v ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-400 bg-slate-50 line-through"}`}><Icon d={I.lock} className="w-3 h-3" />{k.replace("_", " ")}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-[var(--muted)]">Contacts 30d</div><div className="mono font-semibold text-[var(--ai)]">{persona.contacts30d} / 3</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-[var(--muted)]">Opens app at</div><div className="mono font-semibold text-[var(--ai)]">{persona.appOpenHours.map((h) => h + "h").join(" ")}</div></div>
              </div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase mt-4 mb-1.5">Signals ({persona.signals.length})</div>
              <div className="grid gap-1">
                {persona.signals.map((s) => {
                  const c = s.category ? SIGNAL_CATEGORIES[s.category] : undefined;
                  const used = decision?.why && trace.some((t) => t.kind === "pass" && t.label.includes(c?.label ?? "@@"));
                  const tag = !c ? { t: "free text · AI", cls: "text-violet-700 bg-violet-50" } : c.art9 ? { t: "Art. 9 · excluded", cls: "text-red-700 bg-red-50" } : c.noise ? { t: "routine", cls: "text-slate-500 bg-slate-100" } : { t: c.label, cls: "text-sky-800 bg-sky-50" };
                  return (
                    <div key={s.id} className={`flex items-start gap-2 text-xs rounded-lg px-2 py-1.5 border ${used ? "border-emerald-200 bg-emerald-50/40" : "border-transparent"}`}>
                      <span className="mono text-[var(--muted)] w-10 shrink-0">{s.date.slice(5)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{s.merchant ?? s.text}{s.amount !== undefined && <span className="mono text-slate-500"> · €{Math.abs(s.amount).toLocaleString("en-BE")}</span>}</div>
                        <span className={`inline-block mt-0.5 px-1.5 rounded text-[10px] font-medium ${tag.cls}`}>{tag.t}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="text-sm text-slate-400">Loading…</p>}
        </section>
      </main>

      <div data-tour="terminal">
        <Terminal trace={trace} running={running} open={termOpen} setOpen={setTermOpen} decision={decision} persona={persona} />
      </div>

      {builder && <Builder onClose={() => setBuilder(false)} onCreated={async (p) => { setBuilder(false); await load(); setCustom((c) => (c.some((x) => x.id === p.id) ? c : [p, ...c])); run(p.id); }} />}
      {evals && <Evals onClose={() => setEvals(false)} />}
      {tour && <Tour steps={steps} onClose={() => { setTour(false); try { localStorage.setItem("watari-toured", "1"); } catch {} }} />}
    </div>
  );
}

function PhoneCard({ d, persona, approved, onApprove }: { d: Decision; persona?: Persona; approved: boolean; onApprove: () => void }) {
  if (d.status === "suppress" || d.status === "hold") {
    return (
      <div className="rise rounded-2xl bg-white/70 border border-dashed border-slate-300 p-4 text-center mt-16">
        <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 grid place-items-center text-slate-500"><Icon d={I.moon} /></div>
        <div className="font-semibold text-sm mt-2">{d.status === "hold" ? "Nothing sent. Queued." : "Nothing sent."}</div>
        <div className="text-xs text-slate-500 mt-1">{d.why[0]}</div>
        {d.status === "hold" && d.sendAt && <div className="text-[11px] mono text-[var(--ai)] mt-2">{d.eventLabel} · {d.sendAt}</div>}
        <div className="text-[10px] text-slate-400 mt-3">{persona?.name.split(" ")[0]} sees no notification. That is the feature.</div>
      </div>
    );
  }
  const m = d.message!;
  return (
    <div className="rise rounded-2xl bg-white shadow-md border border-slate-200 p-3.5 grid gap-2">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-4 h-4 rounded bg-[var(--navy)] text-white grid place-items-center"><Icon d={I.bolt} className="w-2.5 h-2.5" /></span>{d.channel ? CHANNELS[d.channel].label : ""} · {d.sendAt}
        {d.aiWritten && <span className="ml-auto text-[9px] px-1.5 rounded bg-violet-50 text-violet-700" title="Copy written by the LLM, validated by rules">AI copy</span>}</div>
      <div className="font-semibold text-[13px] leading-snug">{m.title}</div>
      <div className="text-xs text-slate-600 leading-relaxed">{m.body}</div>
      {d.status === "deliver" && d.bundle.length > 0 && (
        <div className="grid gap-1">
          {d.bundle.map((b, i) => (
            <div key={b.productId} className="flex items-start gap-2 text-[11px] rise" style={{ animationDelay: `${i * 90}ms` }}>
              <span className={`mt-0.5 w-3.5 h-3.5 rounded-full grid place-items-center shrink-0 ${approved ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{approved && <Icon d={I.check} className="w-2.5 h-2.5" />}</span>
              <div><div className="font-medium">{CATALOG[b.productId]?.title}</div>{b.prefill && <div className="text-slate-500">{b.prefill}</div>}</div>
            </div>
          ))}
        </div>
      )}
      {d.mutedUntil && <div className="text-[10px] rounded-md bg-amber-50 text-amber-800 px-2 py-1">All promotions paused until {d.mutedUntil}</div>}
      <div className="flex gap-1.5 pt-1">
        <button onClick={onApprove} className={`flex-1 text-xs font-semibold rounded-lg py-2 ${approved ? "bg-emerald-600 text-white" : "bg-[var(--navy)] text-white"}`}>{approved ? "Done in 8 seconds" : m.cta}</button>
        <button className="text-xs rounded-lg px-2.5 border border-slate-200 text-slate-600">Not now</button>
      </div>
      <details className="text-[10px] text-slate-500">
        <summary className="cursor-pointer select-none">Why am I seeing this?</summary>
        <ul className="list-disc pl-4 mt-1 grid gap-0.5">{d.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </details>
    </div>
  );
}
