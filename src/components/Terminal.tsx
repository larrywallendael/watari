"use client";
import { useEffect, useRef } from "react";
import type { Decision, Kind, Persona, TraceEvent } from "@/lib/types";

const K: Record<Kind, { tag: string; cls: string }> = {
  phase: { tag: "", cls: "" },
  read: { tag: "READ", cls: "text-sky-700 bg-sky-50" },
  rule: { tag: "RULE", cls: "text-slate-600 bg-slate-100" },
  pass: { tag: "PASS", cls: "text-emerald-700 bg-emerald-50" },
  block: { tag: "BLOCK", cls: "text-red-700 bg-red-50" },
  llm: { tag: "THINK", cls: "text-violet-700 bg-violet-50" },
  tool: { tag: "CALL", cls: "text-cyan-800 bg-cyan-50" },
  guard: { tag: "GUARD", cls: "text-orange-700 bg-orange-50" },
  decision: { tag: "DECIDE", cls: "text-white bg-[var(--navy)]" },
  done: { tag: "DONE", cls: "text-emerald-700 bg-emerald-50" },
  error: { tag: "ERROR", cls: "text-red-700 bg-red-100" },
  info: { tag: "INFO", cls: "text-slate-600 bg-slate-100" },
};

export default function Terminal({ trace, running, open, setOpen, decision, persona }: { trace: TraceEvent[]; running: boolean; open: boolean; setOpen: (b: boolean) => void; decision: Decision | null; persona?: Persona }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [trace.length]);
  const blocks = trace.filter((t) => t.kind === "block" || t.kind === "guard").length;
  const llm = trace.filter((t) => t.kind === "llm").length;
  const rules = trace.filter((t) => t.kind === "pass" || t.kind === "rule").length;

  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 bg-white border-t border-[var(--line)] shadow-[0_-8px_30px_rgba(11,31,51,.08)] transition-[height] duration-300 ${open ? "h-[36vh]" : "h-12"}`}>
      <button onClick={() => setOpen(!open)} className="w-full h-12 px-5 flex items-center gap-3 text-sm hover:bg-slate-50" title={open ? "Collapse the agent terminal" : "Open the agent terminal"}>
        <span className={`w-2 h-2 rounded-full ${running ? "bg-[var(--cyan)] pulse" : trace.length ? "bg-emerald-500" : "bg-slate-300"}`} />
        <span className="font-bold tracking-[0.14em] text-[var(--navy)]">WATARI</span>
        <span className="mono text-xs text-[var(--muted)]">agent terminal{persona ? ` · ${persona.name}` : ""}</span>
        <span className="flex-1" />
        {trace.length > 0 && (
          <span className="hidden sm:flex gap-3 mono text-[11px]">
            <span className="text-emerald-700" title="Deterministic rules evaluated">{rules} rules</span>
            <span className="text-red-700" title="Blocks and guardrail interventions">{blocks} blocks</span>
            <span className="text-violet-700" title="LLM reasoning lines">{llm} thoughts</span>
            <span className="text-slate-500">{trace[trace.length - 1]?.t ?? 0} ms</span>
          </span>
        )}
        <svg viewBox="0 0 24 24" className={`w-4 h-4 transition ${open ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div ref={ref} className="h-[calc(36vh-48px)] overflow-y-auto px-5 pb-4 mono text-[12.5px] leading-relaxed bg-[#FAFBFD]">
          {!trace.length && <div className="text-slate-400 pt-4">$ watari run --customer &lt;id&gt;   # pick a customer to start</div>}
          {trace.map((e, i) => e.kind === "phase" ? (
            <div key={i} className="rise mt-3 mb-1 flex items-center gap-2 text-[var(--navy)] font-bold tracking-widest text-[11px]">
              <span>{e.label}</span><span className="font-normal tracking-normal text-slate-400 normal-case">{e.detail}</span><span className="flex-1 border-t border-dashed border-slate-200" />
            </div>
          ) : (
            <div key={i} className="rise flex items-start gap-2 py-[1px]">
              <span className="text-slate-300 w-12 shrink-0 text-right">{e.t}ms</span>
              <span className={`shrink-0 w-[58px] text-center text-[10px] font-bold rounded px-1 py-[1px] ${K[e.kind].cls}`}>{K[e.kind].tag}</span>
              <span className={`${e.kind === "llm" ? "text-violet-800 italic" : e.kind === "block" ? "text-red-700" : e.kind === "decision" ? "font-bold text-[var(--navy)]" : "text-slate-800"}`}>
                {e.label}{e.detail && <span className="text-slate-400"> · {e.detail}</span>}
              </span>
            </div>
          ))}
          {running && <div className="caret text-slate-400 pl-14 pt-1">{trace.some((t) => t.label.includes("compose")) ? "thinking" : "working"}</div>}
          {decision && !running && (
            <div className="rise mt-3 rounded-lg border border-[var(--line)] bg-white p-3 text-[12px]">
              <details><summary className="cursor-pointer text-[10px] text-slate-400">decision.json · <span className="text-[var(--ai)]">values = computed by rules</span>{decision.aiWritten && <> · <span className="text-violet-700">message = LLM-written, rule-validated</span></>}</summary>
              <pre className="whitespace-pre-wrap text-slate-700">{JSON.stringify({ status: decision.status, event: decision.event, confidence: decision.confidence, channel: decision.channel, sendAt: decision.sendAt, mutedUntil: decision.mutedUntil ?? undefined, bundle: decision.bundle.map((b) => b.productId), blockedBy: decision.blockedBy }, null, 2)}</pre></details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
