"use client";
import { useEffect, useState } from "react";

interface R { id: string; group: string; desc: string; pass: boolean; error: string | null; status: string; event: string | null; channel: string | null; ms: number }

export default function Evals({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ passed: number; total: number; results: R[]; stats: { runs: number; avg_ms: number } | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetch("/api/evals").then((r) => r.json()).then((j) => (j.error ? setErr(j.error) : setData(j))).catch(() => setErr("Failed")); }, []);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-5 rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><div className="font-bold text-lg">Behavioural evals</div><div className="text-sm text-[var(--muted)]">Run live against the deterministic engine. Seed cases, perturbations, unseen customers and safety cases.</div></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {err && <p className="text-red-600 mt-4">{err}</p>}
        {!data && !err && <p className="mt-6 text-sm text-slate-500 caret">Running {""}</p>}
        {data && (
          <>
            <div className="flex gap-3 mt-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-3"><div className="text-xs text-emerald-800">Passed</div><div className="mono text-2xl font-bold text-emerald-700">{data.passed}/{data.total}</div></div>
              {data.stats && <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-600">Production runs logged</div><div className="mono text-2xl font-bold text-[var(--ai)]">{data.stats.runs}</div></div>}
            </div>
            <table className="w-full text-sm mt-4">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]"><th className="py-2">Case</th><th>Group</th><th>Result</th><th>Outcome</th></tr></thead>
              <tbody>{data.results.map((r) => (
                <tr key={r.id} className="border-t border-[var(--line)] align-top">
                  <td className="py-2 pr-3">{r.desc}</td>
                  <td className="pr-3"><span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100">{r.group}</span></td>
                  <td className="pr-3">{r.pass ? <span className="text-emerald-700 font-semibold">pass</span> : <span className="text-red-700 font-semibold" title={r.error ?? ""}>fail</span>}</td>
                  <td className="mono text-xs text-slate-600">{r.status}{r.event ? ` · ${r.event}` : ""}{r.channel ? ` · ${r.channel}` : ""}</td>
                </tr>))}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
