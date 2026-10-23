"use client";
import { useEffect, useState } from "react";
import { CHAR_MAP, ELEMENTS } from "@/game/catalog";

// Comprueba una sola vez si existe la hoja de retratos /art/sheetN.jpg. Si falta
// (p. ej. en un despliegue nuevo sin los recursos gráficos) se dibuja un retrato
// provisional generado a partir de los datos del personaje, sin romper la UI.
const sheetState = new Map<number, boolean>();
const sheetWaiters = new Map<number, Set<(ok: boolean) => void>>();
function useSheetOk(sheet: number): boolean {
  const [ok, setOk] = useState<boolean>(sheetState.get(sheet) ?? true);
  useEffect(() => {
    if (sheetState.has(sheet)) { setOk(sheetState.get(sheet)!); return; }
    let set = sheetWaiters.get(sheet);
    if (!set) {
      set = new Set();
      sheetWaiters.set(sheet, set);
      const img = new Image();
      const done = (v: boolean) => {
        sheetState.set(sheet, v);
        sheetWaiters.get(sheet)?.forEach((f) => f(v));
        sheetWaiters.delete(sheet);
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = `/art/sheet${sheet}.jpg`;
    }
    set.add(setOk);
    return () => { set!.delete(setOk); };
  }, [sheet]);
  return ok;
}

const QUAD_POS = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];

export function Portrait({
  charKey, size, className = "", transformed = false, dim = false, style,
}: {
  charKey: string;
  size?: number | string;
  className?: string;
  transformed?: boolean;
  dim?: boolean;
  style?: React.CSSProperties;
}) {
  const def = CHAR_MAP[charKey];
  const sheetOk = useSheetOk(def?.portrait.sheet ?? 1);
  if (!def) return null;
  if (!sheetOk) {
    const fb: React.CSSProperties = {
      width: size ?? "100%", height: size ?? "100%",
      background: `radial-gradient(circle at 50% 30%, ${def.color}cc, ${def.color}33 55%, #0a1224 100%)`,
      filter: dim ? "grayscale(1) brightness(0.35)" : transformed ? "saturate(1.4) brightness(1.1)" : undefined,
      containerType: "size",
      ...style,
    };
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={fb} data-fallback-portrait>
        <span style={{ fontSize: "min(55cqw, 55cqh)", lineHeight: 1, opacity: 0.9, textShadow: "0 2px 10px #000a" }} className="font-display font-extrabold text-white">
          {def.name.charAt(0)}
        </span>
        <span style={{ position: "absolute", right: "6%", top: "4%", fontSize: "min(20cqw, 20cqh)" }}>{ELEMENTS[def.element].icon}</span>
        {transformed && !dim && <div className="pointer-events-none absolute inset-0 anim-pulse-soft" style={{ boxShadow: `inset 0 0 24px ${def.color}`, mixBlendMode: "screen" }} />}
      </div>
    );
  }
  const dimStyle: React.CSSProperties = {
    backgroundImage: `url(/art/sheet${def.portrait.sheet}.jpg)`,
    backgroundSize: "200% 200%",
    backgroundPosition: QUAD_POS[def.portrait.quad],
    width: size ?? "100%",
    height: size ?? "100%",
    filter: dim
      ? "grayscale(1) brightness(0.35)"
      : transformed
        ? "saturate(1.5) hue-rotate(-14deg) contrast(1.12) brightness(1.1)"
        : undefined,
    ...style,
  };
  return (
    <div className={`relative overflow-hidden ${className}`} style={dimStyle}>
      {transformed && !dim && (
        <div
          className="pointer-events-none absolute inset-0 anim-pulse-soft"
          style={{ boxShadow: `inset 0 0 ${typeof size === "number" ? size / 3 : 24}px ${def.color}`, mixBlendMode: "screen" }}
        />
      )}
    </div>
  );
}

export function RarityStars({ rarity, className = "" }: { rarity: number; className?: string }) {
  return (
    <span className={`tracking-tighter ${rarity === 5 ? "text-amber-300" : rarity === 4 ? "text-yellow-400" : "text-sky-300"} ${className}`}>
      {"★".repeat(rarity)}
    </span>
  );
}

export function rarityFrame(rarity: number): string {
  if (rarity === 5) return "frame-r5";
  if (rarity === 4) return "frame-r4";
  return "frame-r3";
}