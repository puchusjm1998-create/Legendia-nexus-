// ============================================================
// LEGENDIA NEXUS — Navegación y pestañas principales
// ============================================================

export type Tab =
  | "home"
  | "story"
  | "missions"
  | "team"
  | "characters"
  | "chars"
  | "album"
  | "summon"
  | "events"
  | "shop"
  | "profile"
  | "settings"
  | "afk";

export interface NavItem {
  tab: Tab;
  icon: string;
  label: string;
  desc?: string;
}

export const MENU: NavItem[] = [
  { tab: "home", icon: "🏯", label: "Inicio", desc: "Base de operaciones" },
  { tab: "story", icon: "📖", label: "Historia", desc: "Campaña multiversal" },
  { tab: "afk", icon: "⏳", label: "Expedición", desc: "Recursos AFK (12h)" },
  { tab: "summon", icon: "🌀", label: "Invocar", desc: "Gacha y banners" },
  { tab: "album", icon: "📚", label: "Álbum", desc: "Galería de héroes" },
  { tab: "chars", icon: "👥", label: "Personajes", desc: "Gestionar colección" },
  { tab: "team", icon: "🛡️", label: "Equipo", desc: "Formaciones tácticas" },
  { tab: "shop", icon: "🛒", label: "Tienda", desc: "Mercado y canje" },
  { tab: "events", icon: "🎪", label: "Eventos", desc: "Desafíos por tiempo" },
];
