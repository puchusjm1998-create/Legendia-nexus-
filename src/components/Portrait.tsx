// ============================================================
// LEGENDIA NEXUS — Retratos de Personajes, Rarezas y Marcos
// ============================================================
"use client";
import { CHAR_MAP, ELEMENTS, UNIVERSES } from "@/game/catalog";

const QUAD_POS = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];

const CHAR_ICONS: Record<string, string> = {
  kagero: "🔥",
  ryuen: "🗡️",
  ayame: "🌸",
  raiko: "⚡",
  mizuha: "🌊",
  jin: "🛡️",
  kaion: "🌑",
  lyra: "✨",
  aurelia: "👑",
  naruto: "🍥",
  sasuke: "👁️",
  madara: "☄️",
  kakashi: "⚡",
  itachi: "🦅",
  menma: "🌀",
  mecha_naruto: "🤖",
  shion: "🔔",
  shino_dr: "🪱",
  lightning: "⚡",
  cloud: "🗡️",
  sephiroth: "🪶",
  noctis: "👑",
  noel: "🏹",
  serah: "🎀",
  clive: "🔥",
  zack: "✨",
  regis: "🛡️",
};

export function Portrait({
  charKey,
  size,
  className = "",
  transformed = false,
  dim = false,
  style,
}: {
  charKey: string;
  size?: number | string;
  className?: string;
  transformed?: boolean;
  dim?: boolean;
  style?: React.CSSProperties;
}) {
  const def = CHAR_MAP[charKey];
  if (!def) return null;

  const icon = CHAR_ICONS[charKey] || "⚔️";
  const elementDef = ELEMENTS[def.element];
  const universeDef = UNIVERSES[def.universe];

  const dimStyle: React.CSSProperties = {
    width: size ?? "100%",
    height: size ?? "100%",
    filter: dim
      ? "grayscale(1) brightness(0.35)"
      : transformed
        ? "saturate(1.4) contrast(1.15) brightness(1.1)"
        : undefined,
    ...style,
  };

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden font-display select-none ${className}`}
      style={{
        ...dimStyle,
        background: `radial-gradient(circle at 60% 40%, ${def.color}dd 0%, #0a1224 85%)`,
      }}
    >
      {/* Patrón de fondo geométrico sutil */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${def.color} 0, ${def.color} 1px, transparent 0, transparent 50%)`,
          backgroundSize: "12px 12px",
        }}
      />

      {/* Inicial estilizada gigante en el fondo */}
      <span
        className="absolute font-black opacity-15 text-5xl pointer-events-none text-white uppercase"
        style={{ transform: "scale(1.8) rotate(-10deg)" }}
      >
        {def.name.charAt(0)}
      </span>

      {/* Icono central de personaje */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span
          className="filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{ fontSize: typeof size === "number" ? `${Math.max(16, size * 0.42)}px` : "2rem" }}
        >
          {icon}
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-tighter text-white drop-shadow-[0_1px_3px_#000]">
          {def.name.split(" ")[0]}
        </span>
      </div>

      {/* Insignia de Universo en la esquina */}
      <div className="absolute top-1 left-1 z-20 text-[10px] drop-shadow-md">
        {universeDef.icon}
      </div>

      {/* Insignia de Elemento en la esquina opuesta */}
      <div
        className="absolute top-1 right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full text-[9px] shadow-sm"
        style={{ backgroundColor: `${elementDef.color}cc` }}
        title={elementDef.name}
      >
        {elementDef.icon}
      </div>

      {/* Efecto de transformación luminosa */}
      {transformed && !dim && (
        <>
          <div
            className="pointer-events-none absolute inset-0 anim-pulse-soft ring-2 ring-inset"
            style={{
              boxShadow: `inset 0 0 ${typeof size === "number" ? size / 3 : 24}px ${def.color}`,
              borderColor: def.color,
            }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-amber-500/80 to-transparent py-0.5 text-center text-[8px] font-black tracking-widest text-white uppercase">
            DESPERTAR
          </div>
        </>
      )}
    </div>
  );
}

export function RarityStars({ rarity, className = "" }: { rarity: number; className?: string }) {
  return (
    <span
      className={`tracking-tighter ${
        rarity === 5 ? "text-amber-300" : rarity === 4 ? "text-yellow-400" : "text-sky-300"
      } ${className}`}
    >
      {"★".repeat(rarity)}
    </span>
  );
}

export function rarityFrame(rarity: number): string {
  if (rarity === 5) return "frame-r5";
  if (rarity === 4) return "frame-r4";
  return "frame-r3";
}