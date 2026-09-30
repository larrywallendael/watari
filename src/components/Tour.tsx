"use client";
import { useEffect, useState } from "react";

export interface TourStep { target: string; title: string; body: string; action?: () => void; }

export default function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const s = steps[i];

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
    const inner = (el?.firstElementChild as HTMLElement | null) && s.target === "terminal" ? (el!.firstElementChild as HTMLElement) : el;
    inner?.classList.add("tour-hi");
    if (s.target !== "terminal") inner?.scrollIntoView({ behavior: "smooth", block: "center" });
    const upd = () => setRect(inner?.getBoundingClientRect() ?? null);
    upd(); const iv = setInterval(upd, 300);
    s.action?.();
    return () => { inner?.classList.remove("tour-hi"); clearInterval(iv); };
  }, [i, s]);

  useEffect(() => {
    if (!auto) return;
    const tm = setTimeout(() => (i < steps.length - 1 ? setI(i + 1) : null), s.action ? 7500 : 5500);
    return () => clearTimeout(tm);
  }, [i, auto, steps.length, s.action]);

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, steps.length - 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0)); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose, steps.length]);

  const W = 340;
  let top = 90, left = 24;
  if (rect) {
    const below = rect.bottom + 12, above = rect.top - 12;
    top = below + 190 < window.innerHeight ? below : Math.max(70, above - 190);
    left = Math.min(Math.max(12, rect.left), window.innerWidth - W - 12);
    if (s.target === "terminal") { top = Math.max(70, rect.top - 200); left = window.innerWidth - W - 24; }
  }

  return (
    <div className="fixed z-[70] rise" style={{ top, left, width: W }}>
      <div className="rounded-2xl bg-white border border-[var(--line)] shadow-2xl p-4">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mb-1">
          <span className="font-bold tracking-widest text-[var(--navy)]">DEMO</span><span className="mono">{i + 1}/{steps.length}</span>
          <div className="flex-1 h-1 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-[var(--cyan)] transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
          <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-700" title="End demo (Esc)">✕</button>
        </div>
        <div className="font-semibold">{s.title}</div>
        <p className="text-sm text-slate-600 mt-1">{s.body}</p>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setAuto(!auto)} className="text-xs text-[var(--muted)] hover:text-[var(--navy)]" title="Auto-advance on/off">{auto ? "❚❚ Auto" : "▶ Auto"}</button>
          <span className="flex-1" />
          {i > 0 && <button onClick={() => setI(i - 1)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)]">Back</button>}
          {i < steps.length - 1 ? <button onClick={() => setI(i + 1)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white">Next</button>
            : <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white">Explore</button>}
        </div>
      </div>
    </div>
  );
}
