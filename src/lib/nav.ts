export type Tab =
  | "home" | "story" | "missions" | "team" | "chars"
  | "album" | "afk" | "summon" | "events" | "shop" | "profile" | "settings";

export const MENU: { tab: Tab; icon: string; label: string; desc: string }[] = [
  { tab: "story", icon: "📖", label: "Historia", desc: "Campaña principal" },
  { tab: "missions", icon: "🗡️", label: "Misiones", desc: "Normales y difíciles" },
  { tab: "afk", icon: "⛺", label: "Expediciones", desc: "Recursos AFK (12 h)" },
  { tab: "team", icon: "🛡️", label: "Equipo", desc: "Formaciones" },
  { tab: "chars", icon: "👥", label: "Personajes", desc: "Mejora tus héroes" },
  { tab: "album", icon: "📚", label: "Álbum", desc: "Colección completa" },
  { tab: "summon", icon: "🌀", label: "Invocaciones", desc: "Gacha de héroes" },
  { tab: "events", icon: "🎪", label: "Eventos", desc: "Contenido temporal" },
  { tab: "shop", icon: "🏪", label: "Tienda", desc: "Materiales y más" },
  { tab: "profile", icon: "🏆", label: "Perfil", desc: "Logros y cuenta" },
  { tab: "settings", icon: "⚙️", label: "Ajustes", desc: "Audio y opciones" },
];