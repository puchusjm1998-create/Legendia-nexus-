"use client";
import { useEffect } from "react";
import { ELEMENTS, type Element } from "@/game/catalog";
import { getAudio } from "@/game/audio";

export function Btn({
  children, onClick, variant = "gold", className = "", disabled = false, small = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "gold" | "blue" | "ghost" | "danger" | "green";
  className?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const base = "btn-cut font-display uppercase tracking-wider transition-all duration-150 active:scale-95 select-none";
  const variants: Record<string, string> = {
    gold: "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 hover:from-amber-200 hover:to-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)]",
    blue: "bg-gradient-to-b from-cyan-400 to-sky-600 text-sky-950 hover:from-cyan-300 hover:to-sky-500 shadow-[0_0_18px_rgba(56,189,248,0.3)]",
    green: "bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 hover:from-emerald-300",
    ghost: "bg-white/8 text-slate-200 border border-white/15 hover:bg-white/15",
    danger: "bg-gradient-to-b from-rose-500 to-red-700 text-white hover:from-rose-400",
  };
  return (
    <button
      disabled={disabled}
      onClick={() => { getAudio().sfx("click"); onClick?.(); }}
      className={`${base} ${variants[variant]} ${small ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"} ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function ElementChip({ element, small = false }: { element: Element; small?: boolean }) {
  const e = ELEMENTS[element];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm font-semibold ${small ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-xs"}`}
      style={{ background: `${e.color}22`, color: e.color, border: `1px solid ${e.color}55` }}
    >
      <span>{e.icon}</span>{e.name}
    </span>
  );
}

export function Modal({
  children, onClose, wide = false,
}: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm anim-fade" onClick={onClose}>
      <div
        className={`panel-cut relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[92dvh] overflow-y-auto bg-[#101a30] border border-cyan-400/20 anim-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded bg-white/10 text-slate-300 hover:bg-rose-500/60 hover:text-white transition-colors"
          aria-label="Cerrar"
        >✕</button>
        {children}
      </div>
    </div>
  );
}

export function Bar({
  value, max, color, className = "", label,
}: { value: number; max: number; color: string; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-sm bg-black/50 ${className}`}>
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      {label && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">{label}</span>}
    </div>
  );
}

export function SectionTitle({ icon, children, sub }: { icon: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3 flex items-end gap-2">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-amber-300 leading-none">{children}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="mb-1 h-px flex-1 bg-gradient-to-r from-amber-400/50 to-transparent" />
    </div>
  );
}

export function StatRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div className="flex items-center justify-between rounded bg-white/5 px-2.5 py-1.5 text-sm">
      <span className="text-slate-400"><span className="mr-1.5">{icon}</span>{label}</span>
      <span className="font-bold text-slate-100">{value}</span>
    </div>
  );
}