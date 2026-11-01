// ============================================================
// LEGENDIA NEXUS — Catálogo de Personajes, Universos y Materiales
// Expansión Multiversal: Legendia Nexus, Naruto y Final Fantasy
// ============================================================

export type Universe = "nexus" | "naruto" | "finalfantasy";
export type Element = "fire" | "water" | "wind" | "lightning" | "earth" | "light" | "dark";
export type Role = "Guerrero" | "Asesino" | "Tirador" | "Mago" | "Soporte" | "Tanque";
export type StatusType = "burn" | "stun" | "atkUp" | "defUp" | "defDown" | "regen";

export interface CharBaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface SkillDef {
  name: string;
  desc: string;
  cost: number;
  cooldown: number;
  range: number;
  target: "enemy" | "ally" | "self";
  power?: number;
  effect?: { type: StatusType; turns: number; chance?: number };
}

export interface UltimateDef {
  name: string;
  desc: string;
  range: number;
  target: "enemy" | "ally";
  color: string;
  power?: number;
  effect?: { type: StatusType; turns: number };
}

export interface CharDef {
  key: string;
  name: string;
  title: string;
  rarity: 3 | 4 | 5;
  universe: Universe;
  element: Element;
  role: Role;
  color: string;
  move: number;
  range: number;
  base: CharBaseStats;
  growth: CharBaseStats;
  basic: { name: string; power: number };
  skill: SkillDef;
  ultimate: UltimateDef;
  passive: { name: string; desc: string };
  lore?: string;
  transform: {
    name: string;
    desc: string;
    mult: CharBaseStats;
    cost: { materials: Record<string, number>; gold: number };
    materials?: Record<string, number>;
    reqLevel?: number;
    boost?: number;
  };
  portrait: { sheet: number; quad: number };
}

export const UNIVERSES: Record<Universe, { name: string; icon: string; desc: string }> = {
  nexus: { name: "Legendia Nexus", icon: "🏯", desc: "El nexo original donde convergen todas las líneas astrales." },
  naruto: { name: "Mundo Shinobi", icon: "🍥", desc: "Guerreros que moldean el chakra y la Voluntad de Fuego." },
  finalfantasy: { name: "Mundo Cristalino", icon: "⚔️", desc: "Héroes impulsados por la energía Mako y la bendición del Cristal." },
};

export const ELEMENTS: Record<Element, { name: string; icon: string; color: string }> = {
  fire: { name: "Fuego", icon: "🔥", color: "#f97316" },
  water: { name: "Agua", icon: "💧", color: "#38bdf8" },
  wind: { name: "Viento", icon: "🌪️", color: "#4ade80" },
  lightning: { name: "Rayo", icon: "⚡", color: "#facc15" },
  earth: { name: "Tierra", icon: "🪨", color: "#a16207" },
  light: { name: "Luz", icon: "✨", color: "#e0e7ff" },
  dark: { name: "Oscuridad", icon: "🌑", color: "#a855f7" },
};

export const MATERIALS: Record<string, { name: string; icon: string; desc: string; rarity: number }> = {
  esencia: { name: "Esencia Astral", icon: "🧪", desc: "Concentrado de maná básico para mejoras de nivel.", rarity: 2 },
  cristal: { name: "Cristal Puro", icon: "💎", desc: "Prisma resonante para despertar ascensos.", rarity: 3 },
  pergamino: { name: "Pergamino Táctico", icon: "📜", desc: "Tratado marcial para el aprendizaje de técnicas.", rarity: 2 },
  mako_crystal: { name: "Cristal de Mako", icon: "🟢", desc: "Energía vital del planeta cristalizada, ideal para transformaciones.", rarity: 4 },
  residual_chakra: { name: "Chakra Residual", icon: "🌀", desc: "Residuo de poder shinobi para catalizar sellos y técnicas.", rarity: 3 },
  attire_sphere: { name: "Esfera de Atavío", icon: "🔮", desc: "Esfera capaz de transmutar trajes y liberar el potencial oculto.", rarity: 4 },
  biju_fragment: { name: "Fragmento de Bijū", icon: "🦊", desc: "Porción de chakra inmenso de una bestia con cola.", rarity: 5 },
  stardust: { name: "Polvo de Estrellas", icon: "✨", desc: "Materia primordial estelar del Nexus para forjas milagrosas.", rarity: 4 },
  crystal_fragment: { name: "Fragmento de Cristal", icon: "🔷", desc: "Esquirla de cristal sagrado que potencia habilidades definitivas.", rarity: 3 },
  nexus_coins: { name: "Monedas del Nexus", icon: "🪙", desc: "Divisa de intercambio interdimensional en la tienda secreta.", rarity: 3 },
};

export const RARITY_CAP: Record<number, number> = { 3: 50, 4: 70, 5: 90 };

export const STARTER_TEAM = ["ryuen", "ayame", "raiko", "mizuha"];

export const CHARACTERS: CharDef[] = [
  // ==================== ORIGINAL LEGENDIA CAST ====================
  {
    key: "kagero",
    name: "Kagero",
    title: "La Llama del Velo Umbral",
    rarity: 5,
    universe: "nexus",
    element: "fire",
    role: "Asesino",
    color: "#f43f5e",
    move: 4,
    range: 1,
    base: { hp: 1100, atk: 195, def: 85, spd: 48 },
    growth: { hp: 75, atk: 14.5, def: 5.2, spd: 1.1 },
    basic: { name: "Tajo Carmesí", power: 1.15 },
    skill: { name: "Danza Ignea", desc: "Daño masivo de fuego a un enemigo con 80% de infligir quemadura.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.7, effect: { type: "burn", turns: 3, chance: 0.8 } },
    ultimate: { name: "Loto del Eclipse", desc: "Ataque devastador que atraviesa armadura y purifica sus llamas.", range: 1, target: "enemy", color: "#f43f5e", power: 3.2, effect: { type: "burn", turns: 4 } },
    passive: { name: "Instinto Asesino", desc: "+25% daño contra objetivos con estados alterados." },
    transform: { name: "Kagero Umbral Despertada", desc: "Despierta las llamas prohibidas del Velo.", mult: { hp: 1.35, atk: 1.45, def: 1.25, spd: 1.3 }, cost: { materials: { esencia: 25, cristal: 10, mako_crystal: 5 }, gold: 12000 } },
    portrait: { sheet: 1, quad: 0 },
  },
  {
    key: "ryuen",
    name: "Ryuen",
    title: "Espada del Sol Naciente",
    rarity: 4,
    universe: "nexus",
    element: "fire",
    role: "Guerrero",
    color: "#f97316",
    move: 3,
    range: 1,
    base: { hp: 1050, atk: 155, def: 110, spd: 38 },
    growth: { hp: 72, atk: 11.5, def: 7.2, spd: 0.9 },
    basic: { name: "Corte de Brasa", power: 1.0 },
    skill: { name: "Tajo Solar", desc: "Aumenta su propio ATK y golpea al rival con gran ímpetu.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.5, effect: { type: "atkUp", turns: 2 } },
    ultimate: { name: "Tormenta de Dragones", desc: "Un rugido llameante que golpea con fuerza descomunal.", range: 1, target: "enemy", color: "#f97316", power: 2.8 },
    passive: { name: "Corazón Firme", desc: "Cuando los PV caen bajo el 40%, gana DEF +30%." },
    transform: { name: "Ryuen Forma Dragón Solar", desc: "La espada hereda el espíritu ancestral del dragón.", mult: { hp: 1.3, atk: 1.35, def: 1.3, spd: 1.2 }, cost: { materials: { esencia: 15, cristal: 5, residual_chakra: 10 }, gold: 8000 } },
    portrait: { sheet: 1, quad: 1 },
  },
  {
    key: "ayame",
    name: "Ayame",
    title: "Viento del Cerezo",
    rarity: 4,
    universe: "nexus",
    element: "wind",
    role: "Tirador",
    color: "#10b981",
    move: 3,
    range: 3,
    base: { hp: 820, atk: 165, def: 75, spd: 46 },
    growth: { hp: 55, atk: 12.8, def: 4.8, spd: 1.1 },
    basic: { name: "Flecha Pétalo", power: 1.05 },
    skill: { name: "Vendaval Verde", desc: "Disparo perforante de viento a distancia.", cost: 2, cooldown: 2, range: 3, target: "enemy", power: 1.55 },
    ultimate: { name: "Ráfaga de Pétalos Astrales", desc: "Lluvia de flechas etéreas que descienden sobre el objetivo.", range: 4, target: "enemy", color: "#10b981", power: 2.9 },
    passive: { name: "Paso Ligero", desc: "+1 de alcance si no se mueve durante el turno." },
    transform: { name: "Ayame Danza del Céfiro", desc: "Conexión profunda con las corrientes del viento.", mult: { hp: 1.25, atk: 1.4, def: 1.2, spd: 1.35 }, cost: { materials: { esencia: 15, pergamino: 10, crystal_fragment: 5 }, gold: 8000 } },
    portrait: { sheet: 1, quad: 2 },
  },
  {
    key: "raiko",
    name: "Raiko",
    title: "Chispa de Tormenta",
    rarity: 4,
    universe: "nexus",
    element: "lightning",
    role: "Mago",
    color: "#eab308",
    move: 3,
    range: 2,
    base: { hp: 860, atk: 175, def: 78, spd: 42 },
    growth: { hp: 58, atk: 13.2, def: 4.9, spd: 1.0 },
    basic: { name: "Descarga", power: 1.05 },
    skill: { name: "Rayo Catenario", desc: "Trueno condensado que puede aturdir al enemigo (50%).", cost: 3, cooldown: 3, range: 2, target: "enemy", power: 1.6, effect: { type: "stun", turns: 1, chance: 0.5 } },
    ultimate: { name: "Ira del Trueno Celestial", desc: "Descarga voltaica fulminante que desintegra barreras.", range: 3, target: "enemy", color: "#eab308", power: 3.0 },
    passive: { name: "Conductividad", desc: "Gana 10 extra de energía al acertar golpes críticos." },
    transform: { name: "Raiko Diosa del Voltio", desc: "Canaliza relámpagos puros que orbitan su cuerpo.", mult: { hp: 1.25, atk: 1.42, def: 1.2, spd: 1.3 }, cost: { materials: { esencia: 15, cristal: 5, attire_sphere: 2 }, gold: 8000 } },
    portrait: { sheet: 1, quad: 3 },
  },
  {
    key: "mizuha",
    name: "Mizuha",
    title: "Doncella de la Marea",
    rarity: 4,
    universe: "nexus",
    element: "water",
    role: "Soporte",
    color: "#06b6d4",
    move: 3,
    range: 2,
    base: { hp: 980, atk: 110, def: 95, spd: 36 },
    growth: { hp: 68, atk: 7.5, def: 6.8, spd: 0.8 },
    basic: { name: "Gota Cortante", power: 0.9 },
    skill: { name: "Rocío Sanador", desc: "Cura las heridas de un aliado y otorga regeneración.", cost: 2, cooldown: 2, range: 3, target: "ally", effect: { type: "regen", turns: 3 } },
    ultimate: { name: "Maremoto Purificador", desc: "Oleada mística que cura a un aliado y limpia debuff.", range: 3, target: "ally", color: "#06b6d4", effect: { type: "regen", turns: 4 } },
    passive: { name: "Fuente de Vida", desc: "Al inicio de cada ronda, cura pasivamente 5% PV a los aliados cercanos." },
    transform: { name: "Mizuha Gracia de los Océanos", desc: "El canto de las sirenas del Nexus amplifica sus mareas.", mult: { hp: 1.4, atk: 1.15, def: 1.35, spd: 1.25 }, cost: { materials: { esencia: 15, pergamino: 10, mako_crystal: 4 }, gold: 8000 } },
    portrait: { sheet: 2, quad: 0 },
  },
  {
    key: "jin",
    name: "Jin",
    title: "Baluarte Inquebrantable",
    rarity: 4,
    universe: "nexus",
    element: "earth",
    role: "Tanque",
    color: "#ca8a04",
    move: 2,
    range: 1,
    base: { hp: 1400, atk: 120, def: 155, spd: 28 },
    growth: { hp: 95, atk: 8.5, def: 12.0, spd: 0.6 },
    basic: { name: "Maza de Roca", power: 0.95 },
    skill: { name: "Fortaleza Sísmica", desc: "Aumenta masivamente su propia DEF y atrae la atención enemiga.", cost: 2, cooldown: 3, range: 1, target: "self", effect: { type: "defUp", turns: 3 } },
    ultimate: { name: "Monolito del Juicio", desc: "Empala al rival con una estaca de granito eterno.", range: 1, target: "enemy", color: "#ca8a04", power: 2.6, effect: { type: "defDown", turns: 2 } },
    passive: { name: "Piel de Diamante", desc: "Reduce el daño recibido en 15% de forma pasiva." },
    transform: { name: "Jin Bastión Titánico", desc: "Armadura de piedra ancestral del fondo del Nexus.", mult: { hp: 1.45, atk: 1.2, def: 1.5, spd: 1.1 }, cost: { materials: { esencia: 20, cristal: 6, stardust: 4 }, gold: 8000 } },
    portrait: { sheet: 2, quad: 1 },
  },
  {
    key: "kaion",
    name: "Kaion",
    title: "Segador de la Noche Eterna",
    rarity: 5,
    universe: "nexus",
    element: "dark",
    role: "Asesino",
    color: "#9333ea",
    move: 4,
    range: 1,
    base: { hp: 1080, atk: 200, def: 88, spd: 49 },
    growth: { hp: 74, atk: 15.0, def: 5.4, spd: 1.15 },
    basic: { name: "Tajo Abisal", power: 1.18 },
    skill: { name: "Sombra Ejecutora", desc: "Golpe fulminante que reduce la defensa enemiga.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.75, effect: { type: "defDown", turns: 3 } },
    ultimate: { name: "Vórtice del Fin de los Tiempos", desc: "Corta la realidad consumiendo el alma del adversario.", range: 1, target: "enemy", color: "#9333ea", power: 3.3 },
    passive: { name: "Sed de Oscuridad", desc: "Recupera 15% de daño infligido como PV." },
    transform: { name: "Kaion Forma Abisal Pura", desc: "La esencia del vacío envuelve su hoja en llamas negras.", mult: { hp: 1.35, atk: 1.48, def: 1.25, spd: 1.32 }, cost: { materials: { esencia: 25, cristal: 10, stardust: 6 }, gold: 12000 } },
    portrait: { sheet: 2, quad: 2 },
  },
  {
    key: "lyra",
    name: "Lyra",
    title: "Voz de los Querubines",
    rarity: 5,
    universe: "nexus",
    element: "light",
    role: "Soporte",
    color: "#38bdf8",
    move: 3,
    range: 3,
    base: { hp: 1050, atk: 135, def: 105, spd: 40 },
    growth: { hp: 70, atk: 9.0, def: 7.2, spd: 0.9 },
    basic: { name: "Arpegio Divino", power: 0.95 },
    skill: { name: "Himno de Bendición", desc: "Aumenta el ATK de un aliado y le otorga regeneración constante.", cost: 2, cooldown: 2, range: 3, target: "ally", effect: { type: "atkUp", turns: 3 } },
    ultimate: { name: "Sinfonía del Resplandor", desc: "Reanima la vitalidad de un compañero con luz pura.", range: 3, target: "ally", color: "#38bdf8", effect: { type: "regen", turns: 4 } },
    passive: { name: "Aura Celestial", desc: "Todos los aliados ganan +10% de velocidad pasiva." },
    transform: { name: "Lyra Serafín Resplandeciente", desc: "Alas astrales coronadas por la luz del Nexus.", mult: { hp: 1.38, atk: 1.25, def: 1.35, spd: 1.28 }, cost: { materials: { esencia: 25, pergamino: 15, crystal_fragment: 8 }, gold: 12000 } },
    portrait: { sheet: 2, quad: 3 },
  },
  {
    key: "aurelia",
    name: "Aurelia",
    title: "La Lanza de la Corona Solar",
    rarity: 5,
    universe: "nexus",
    element: "light",
    role: "Guerrero",
    color: "#f59e0b",
    move: 3,
    range: 2,
    base: { hp: 1200, atk: 185, def: 125, spd: 41 },
    growth: { hp: 82, atk: 13.8, def: 8.5, spd: 0.95 },
    basic: { name: "Estocada Radiante", power: 1.1 },
    skill: { name: "Lanza del Alba", desc: "Perfora en línea y potencia su propia defensa.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.6, effect: { type: "defUp", turns: 2 } },
    ultimate: { name: "Juicio del Sol Invencible", desc: "Carga solar que cae desde el cenit con poder divino.", range: 2, target: "enemy", color: "#f59e0b", power: 3.1 },
    passive: { name: "Nobleza Imperial", desc: "+20% daño a enemigos con más PV actuales que ella." },
    transform: { name: "Aurelia Emperatriz de la Luz", desc: "La armadura imperial resplandece como una estrella.", mult: { hp: 1.38, atk: 1.42, def: 1.38, spd: 1.25 }, cost: { materials: { esencia: 25, cristal: 10, attire_sphere: 4 }, gold: 12000 } },
    portrait: { sheet: 3, quad: 0 },
  },

  // ==================== UNIVERSO NARUTO ====================
  {
    key: "naruto",
    name: "Naruto Uzumaki",
    title: "Héroe de la Voluntad de Fuego",
    rarity: 5,
    universe: "naruto",
    element: "wind",
    role: "Guerrero",
    color: "#ea580c",
    move: 4,
    range: 1,
    base: { hp: 1250, atk: 205, def: 110, spd: 46 },
    growth: { hp: 86, atk: 15.5, def: 7.8, spd: 1.1 },
    basic: { name: "Combo Uzumaki de Clones", power: 1.15 },
    skill: { name: "Rasengan del Viento", desc: "Esfera giratoria de chakra puro que pulveriza la defensa rival.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.8, effect: { type: "defDown", turns: 2 } },
    ultimate: { name: "Fūton: Rasenshuriken", desc: "Técnica legendaria de viento a nivel celular con daño devastador.", range: 3, target: "enemy", color: "#38bdf8", power: 3.4, effect: { type: "burn", turns: 3 } },
    passive: { name: "Voluntad Inquebrantable", desc: "Recupera 10% de PV al inicio de cada turno si tiene menos del 50%." },
    transform: {
      name: "Naruto Modo Barion & Kurama",
      desc: "La fusión definitiva de chakra nuclear y la presencia de Kurama.",
      mult: { hp: 1.5, atk: 1.6, def: 1.4, spd: 1.45 },
      cost: { materials: { residual_chakra: 30, biju_fragment: 8, stardust: 6 }, gold: 15000 },
    },
    portrait: { sheet: 3, quad: 1 },
  },
  {
    key: "sasuke",
    name: "Sasuke Uchiha",
    title: "Sombra del Rinnegan",
    rarity: 5,
    universe: "naruto",
    element: "lightning",
    role: "Asesino",
    color: "#6366f1",
    move: 4,
    range: 2,
    base: { hp: 1120, atk: 215, def: 95, spd: 52 },
    growth: { hp: 78, atk: 16.2, def: 6.2, spd: 1.25 },
    basic: { name: "Tajo Kusanagi Electrificado", power: 1.2 },
    skill: { name: "Chidori Eisou", desc: "Lanza de relámpago con alta probabilidad de aturdir.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.75, effect: { type: "stun", turns: 1, chance: 0.6 } },
    ultimate: { name: "Flecha de Indra & Kirin", desc: "El arco del Susanoo dispara la técnica más poderosa del trueno.", range: 3, target: "enemy", color: "#818cf8", power: 3.5 },
    passive: { name: "Amenotejikara", desc: "Puede intercambiar posición y esquivar el primer ataque de cada combate." },
    transform: {
      name: "Sasuke Rinnegan Supremo & Susanoo",
      desc: "Despierta el Susanoo armado y la visión completa de seis caminos.",
      mult: { hp: 1.4, atk: 1.62, def: 1.35, spd: 1.5 },
      cost: { materials: { residual_chakra: 30, stardust: 8, attire_sphere: 5 }, gold: 15000 },
    },
    portrait: { sheet: 3, quad: 2 },
  },
  {
    key: "madara",
    name: "Madara Uchiha",
    title: "Fantasma de los Uchiha",
    rarity: 5,
    universe: "naruto",
    element: "fire",
    role: "Guerrero",
    color: "#dc2626",
    move: 3,
    range: 2,
    base: { hp: 1380, atk: 220, def: 130, spd: 44 },
    growth: { hp: 92, atk: 16.5, def: 9.0, spd: 1.05 },
    basic: { name: "Gouka Mekkyaku", power: 1.15 },
    skill: { name: "Corte del Susanoo Perfecto", desc: "Onda expansiva que parte montañas y rompe defensas.", cost: 3, cooldown: 3, range: 2, target: "enemy", power: 1.9, effect: { type: "defDown", turns: 3 } },
    ultimate: { name: "Tengai Shinsei (Meteorito Doble)", desc: "Invoca dos meteoritos gigantescos sobre el campo de batalla.", range: 3, target: "enemy", color: "#ef4444", power: 3.6, effect: { type: "burn", turns: 4 } },
    passive: { name: "Poder de los Seis Caminos", desc: "Inmune a aturdimientos y +20% ATK permanente." },
    transform: {
      name: "Madara Rikudou Sabio Seis Caminos",
      desc: "El Jinchūriki del Diez Colas con los orbes de la Verdad.",
      mult: { hp: 1.55, atk: 1.65, def: 1.5, spd: 1.35 },
      cost: { materials: { residual_chakra: 35, biju_fragment: 12, stardust: 8 }, gold: 20000 },
    },
    portrait: { sheet: 3, quad: 3 },
  },
  {
    key: "kakashi",
    name: "Kakashi Hatake",
    title: "El Ninja Copia",
    rarity: 5,
    universe: "naruto",
    element: "lightning",
    role: "Mago",
    color: "#3b82f6",
    move: 3,
    range: 2,
    base: { hp: 1040, atk: 190, def: 100, spd: 47 },
    growth: { hp: 72, atk: 14.2, def: 7.0, spd: 1.12 },
    basic: { name: "Golpe Kunai Rápido", power: 1.05 },
    skill: { name: "Raikiri Cortador de Rayos", desc: "Concentración letal de relámpago con alta tasa crítica.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.7, effect: { type: "atkUp", turns: 2 } },
    ultimate: { name: "Kamui Shuriken & Vórtice", desc: "Shurikens imbuídos en la dimensión del Kamui.", range: 3, target: "enemy", color: "#60a5fa", power: 3.25 },
    passive: { name: "Ojo del Sharingan", desc: "+30% de probabilidad de crítico y anticipación táctica." },
    transform: {
      name: "Kakashi Doble Mangekyō & Susanoo Alado",
      desc: "El poder temporal de Obito manifestado en un Susanoo azul.",
      mult: { hp: 1.38, atk: 1.5, def: 1.35, spd: 1.4 },
      cost: { materials: { residual_chakra: 25, pergola: 15, attire_sphere: 4 }, gold: 12000 },
    },
    portrait: { sheet: 4, quad: 0 },
  },
  {
    key: "itachi",
    name: "Itachi Uchiha",
    title: "Cuervo de la Ilusión",
    rarity: 5,
    universe: "naruto",
    element: "dark",
    role: "Mago",
    color: "#b91c1c",
    move: 3,
    range: 3,
    base: { hp: 1010, atk: 210, def: 90, spd: 48 },
    growth: { hp: 69, atk: 15.8, def: 6.0, spd: 1.15 },
    basic: { name: "Dispersión de Cuervos", power: 1.08 },
    skill: { name: "Tsukuyomi Ilusorio", desc: "Encierra al rival en una tortura mental, aturdiéndolo por completo.", cost: 3, cooldown: 3, range: 3, target: "enemy", power: 1.65, effect: { type: "stun", turns: 1, chance: 0.75 } },
    ultimate: { name: "Llamas Negras de Amaterasu", desc: "El fuego que nunca se extingue quema la esencia del oponente.", range: 3, target: "enemy", color: "#18181b", power: 3.3, effect: { type: "burn", turns: 4 } },
    passive: { name: "Espada de Totsuka & Espejo Yata", desc: "Al recibir daño mortal, sobrevive con 1 PV (1 vez por combate)." },
    transform: {
      name: "Itachi Susanoo Carmesí del Juicio",
      desc: "Invoca la armadura espectral con la legendaria jarra selladora.",
      mult: { hp: 1.4, atk: 1.55, def: 1.45, spd: 1.25 },
      cost: { materials: { residual_chakra: 25, cristal: 10, stardust: 6 }, gold: 14000 },
    },
    portrait: { sheet: 4, quad: 1 },
  },
  {
    key: "menma",
    name: "Menma Oscuro",
    title: "Espiral del Mundo Paralelo",
    rarity: 5,
    universe: "naruto",
    element: "dark",
    role: "Asesino",
    color: "#7e22ce",
    move: 4,
    range: 1,
    base: { hp: 1180, atk: 218, def: 98, spd: 50 },
    growth: { hp: 80, atk: 16.0, def: 6.6, spd: 1.2 },
    basic: { name: "Zarpazo de Chakra Negro", power: 1.16 },
    skill: { name: "Dai Rasenringu", desc: "Anillo espiral negativo que estalla con onda gravitatoria.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.85, effect: { type: "defDown", turns: 2 } },
    ultimate: { name: "Colapso del Gran Anillo Oscuro", desc: "Devastación total aniquilando el espacio dimensional.", range: 2, target: "enemy", color: "#6b21a8", power: 3.45 },
    passive: { name: "Furia del Zorro Negro", desc: "Gana +5% ATK por cada turno transcurrido (hasta +30%)." },
    transform: {
      name: "Menma Forma Kurama Oscuro",
      desc: "El zorro demoníaco del mundo de Genjutsu despierta en el Nexus.",
      mult: { hp: 1.45, atk: 1.58, def: 1.35, spd: 1.4 },
      cost: { materials: { residual_chakra: 28, biju_fragment: 6, mako_crystal: 6 }, gold: 14000 },
    },
    portrait: { sheet: 4, quad: 2 },
  },
  {
    key: "mecha_naruto",
    name: "Mecha-Naruto",
    title: "Arma Mecatrónica Shinobi",
    rarity: 4,
    universe: "naruto",
    element: "lightning",
    role: "Tanque",
    color: "#0284c7",
    move: 3,
    range: 2,
    base: { hp: 1350, atk: 140, def: 145, spd: 32 },
    growth: { hp: 90, atk: 9.8, def: 11.2, spd: 0.7 },
    basic: { name: "Proyectil de Acero Shinobi", power: 1.0 },
    skill: { name: "Absorción de Chakra Láser", desc: "Drena la energía del objetivo y recarga sus propios sistemas.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.45, effect: { type: "atkUp", turns: 2 } },
    ultimate: { name: "Cañón Bijuu Mecánico", desc: "Descarga de plasma de alta intensidad con blindaje frontal.", range: 3, target: "enemy", color: "#38bdf8", power: 2.75 },
    passive: { name: "Blindaje de Titanio", desc: "Inmune a venenos y reduce el daño a distancia recibido en 25%." },
    transform: {
      name: "Mecha-Kurama Modo Coloso",
      desc: "Se transforma en una fortaleza mecanizada bípeda gigantesca.",
      mult: { hp: 1.5, atk: 1.35, def: 1.6, spd: 1.1 },
      cost: { materials: { residual_chakra: 20, cristal: 8, stardust: 4 }, gold: 9000 },
    },
    portrait: { sheet: 4, quad: 3 },
  },
  {
    key: "shion",
    name: "Sacerdotisa Shion",
    title: "Oráculo del Reino de los Demonios",
    rarity: 4,
    universe: "naruto",
    element: "light",
    role: "Soporte",
    color: "#f472b6",
    move: 3,
    range: 3,
    base: { hp: 990, atk: 125, def: 98, spd: 39 },
    growth: { hp: 67, atk: 8.2, def: 6.9, spd: 0.9 },
    basic: { name: "Destello de la Campana", power: 0.92 },
    skill: { name: "Barrera Espiritual Purificadora", desc: "Restaura la salud de un aliado y aumenta su defensa.", cost: 2, cooldown: 2, range: 3, target: "ally", effect: { type: "defUp", turns: 3 } },
    ultimate: { name: "Sello de Luz Sagrada", desc: "Campanadas celestiales que curan intensamente y otorgan regeneración.", range: 3, target: "ally", color: "#f472b6", effect: { type: "regen", turns: 4 } },
    passive: { name: "Premonición del Destino", desc: "Aumenta la ganancia de chakra del equipo en +1 por ronda." },
    transform: {
      name: "Shion Despertar de la Campana Divina",
      desc: "El sello ancestral del dragón demoníaco se vuelve poder benévolo.",
      mult: { hp: 1.35, atk: 1.25, def: 1.38, spd: 1.3 },
      cost: { materials: { residual_chakra: 18, pergamino: 12, crystal_fragment: 6 }, gold: 9000 },
    },
    portrait: { sheet: 5, quad: 0 },
  },
  {
    key: "shino_dr",
    name: "Shinō del Cielo",
    title: "Heredero de las Sombras Voladoras",
    rarity: 4,
    universe: "naruto",
    element: "dark",
    role: "Mago",
    color: "#475569",
    move: 3,
    range: 2,
    base: { hp: 1030, atk: 172, def: 88, spd: 43 },
    growth: { hp: 70, atk: 13.0, def: 5.8, spd: 1.05 },
    basic: { name: "Dardo de Sombra", power: 1.02 },
    skill: { name: "Vórtice del Cero Colas", desc: "Extrae el chakra vital del adversario reduciendo su ataque.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.5, effect: { type: "atkUp", turns: 2 } },
    ultimate: { name: "Despertar del Reibi", desc: "Monstruosidad de sombras oscuras que devora la luz enemiga.", range: 3, target: "enemy", color: "#334155", power: 2.85 },
    passive: { name: "Chakra Oscuro Vital", desc: "Cada vez que inflige daño, gana 8% de velocidad temporal." },
    transform: {
      name: "Shinō Reibi Desatado",
      desc: "Fusión corporal con la sanguijuela gigante del Cero Colas.",
      mult: { hp: 1.42, atk: 1.4, def: 1.3, spd: 1.25 },
      cost: { materials: { residual_chakra: 20, cristal: 8, mako_crystal: 4 }, gold: 9000 },
    },
    portrait: { sheet: 5, quad: 1 },
  },

  // ==================== UNIVERSO FINAL FANTASY ====================
  {
    key: "lightning",
    name: "Lightning Farron",
    title: "Caballero del Trono de Étro",
    rarity: 5,
    universe: "finalfantasy",
    element: "lightning",
    role: "Guerrero",
    color: "#ec4899",
    move: 4,
    range: 2,
    base: { hp: 1220, atk: 212, def: 115, spd: 50 },
    growth: { hp: 84, atk: 16.0, def: 8.2, spd: 1.2 },
    basic: { name: "Tajo Sable Pistola", power: 1.18 },
    skill: { name: "Chispa Fulgurante & Golpe Veloz", desc: "Danza acrobática de espada y ráfaga eléctrica devastadora.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.8, effect: { type: "atkUp", turns: 2 } },
    ultimate: { name: "Ejército de Uno (Scene Drive)", desc: "Secuencia legendaria de 11 cortes a velocidad ultrasónica.", range: 2, target: "enemy", color: "#f472b6", power: 3.5 },
    passive: { name: "Sincronía de Paradigmas", desc: "Alterna entre Ofensiva (+20% ATK) y Defensiva (+25% DEF) según su vida." },
    transform: {
      name: "Lightning Modo Valquiria de Étro",
      desc: "La armadura divina otorgada por la diosa de la muerte y el caos.",
      mult: { hp: 1.45, atk: 1.6, def: 1.45, spd: 1.42 },
      cost: { materials: { mako_crystal: 25, crystal_fragment: 10, stardust: 6 }, gold: 15000 },
    },
    portrait: { sheet: 5, quad: 2 },
  },
  {
    key: "cloud",
    name: "Cloud Strife",
    title: "Ex-Soldado de Primera Clase",
    rarity: 5,
    universe: "finalfantasy",
    element: "wind",
    role: "Guerrero",
    color: "#059669",
    move: 3,
    range: 1,
    base: { hp: 1300, atk: 225, def: 120, spd: 43 },
    growth: { hp: 88, atk: 16.8, def: 8.5, spd: 1.0 },
    basic: { name: "Tajo de Espada Mortal", power: 1.2 },
    skill: { name: "Corte Cruzado (Cross-Slash)", desc: "Dibuja un kanji de tres tajos con probabilidad de aturdir.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.85, effect: { type: "stun", turns: 1, chance: 0.55 } },
    ultimate: { name: "Omnilátigo (Omnislash Ver. 5)", desc: "Separa la espada en múltiples filos para ejecutar el límite definitivo.", range: 2, target: "enemy", color: "#10b981", power: 3.65 },
    passive: { name: "Espíritu de Soldado", desc: "Los golpes críticos infligen 2.2x de daño en lugar de 1.5x." },
    transform: {
      name: "Cloud Límite Mako Desatado",
      desc: "La energía del planeta inunda sus ojos con un resplandor verdoso eterno.",
      mult: { hp: 1.42, atk: 1.65, def: 1.38, spd: 1.35 },
      cost: { materials: { mako_crystal: 30, stardust: 8, attire_sphere: 4 }, gold: 15000 },
    },
    portrait: { sheet: 5, quad: 3 },
  },
  {
    key: "sephiroth",
    name: "Sephiroth",
    title: "El Ángel de una Sola Ala",
    rarity: 5,
    universe: "finalfantasy",
    element: "dark",
    role: "Asesino",
    color: "#64748b",
    move: 4,
    range: 2,
    base: { hp: 1280, atk: 235, def: 105, spd: 51 },
    growth: { hp: 85, atk: 17.5, def: 7.2, spd: 1.22 },
    basic: { name: "Corte Masamune de Dos Metros", power: 1.22 },
    skill: { name: "Octaslash Sombrío", desc: "Ocho tajos invisibles que fragmentan las defensas del objetivo.", cost: 3, cooldown: 3, range: 2, target: "enemy", power: 1.95, effect: { type: "defDown", turns: 3 } },
    ultimate: { name: "Supernova del Génesis", desc: "Destruye planetas en el espacio astral para colapsar sobre el enemigo.", range: 3, target: "enemy", color: "#475569", power: 3.75, effect: { type: "burn", turns: 4 } },
    passive: { name: "Voluntad de Jenova", desc: "Al eliminar a un rival, resetea todos sus enfriamientos de habilidades." },
    transform: {
      name: "Sephiroth Ala Negra Trascendente",
      desc: "El ala negra de la calamidad emerge extendiendo plumas de perdición.",
      mult: { hp: 1.48, atk: 1.7, def: 1.4, spd: 1.48 },
      cost: { materials: { mako_crystal: 35, biju_fragment: 8, stardust: 10 }, gold: 20000 },
    },
    portrait: { sheet: 6, quad: 0 },
  },
  {
    key: "noctis",
    name: "Noctis Lucis Caelum",
    title: "El Rey Entronizado de Lucis",
    rarity: 5,
    universe: "finalfantasy",
    element: "light",
    role: "Guerrero",
    color: "#0284c7",
    move: 4,
    range: 3,
    base: { hp: 1200, atk: 215, def: 110, spd: 48 },
    growth: { hp: 82, atk: 16.2, def: 7.8, spd: 1.15 },
    basic: { name: "Estocada con Lanza Espectral", power: 1.12 },
    skill: { name: "Warp Strike (Asalto en Fase)", desc: "Se teletransporta hacia el objetivo con multiplicador de distancia.", cost: 2, cooldown: 2, range: 3, target: "enemy", power: 1.75 },
    ultimate: { name: "Armiger Unleashed (Coro de Reyes)", desc: "Invoca las trece armas reales ancestrales en un torbellino mortal.", range: 3, target: "enemy", color: "#38bdf8", power: 3.55 },
    passive: { name: "Anillo de los Lucii", desc: "Esquiva automáticamente ataques a distancia con un 20% de probabilidad." },
    transform: {
      name: "Noctis Rey Verdadero de la Luz",
      desc: "El poder milenario del Cristal sagrado canalizado en su sangre real.",
      mult: { hp: 1.45, atk: 1.62, def: 1.42, spd: 1.4 },
      cost: { materials: { mako_crystal: 25, crystal_fragment: 12, stardust: 6 }, gold: 15000 },
    },
    portrait: { sheet: 6, quad: 1 },
  },
  {
    key: "noel",
    name: "Noel Kreiss",
    title: "Cazador del Fin del Tiempo",
    rarity: 4,
    universe: "finalfantasy",
    element: "wind",
    role: "Asesino",
    color: "#0d9488",
    move: 4,
    range: 1,
    base: { hp: 1040, atk: 175, def: 88, spd: 48 },
    growth: { hp: 70, atk: 13.5, def: 6.0, spd: 1.18 },
    basic: { name: "Corte Doble Hoja", power: 1.08 },
    skill: { name: "Ruptura Javelin", desc: "Lanza su espada transformada en jabalina aturdiendo al rival.", cost: 2, cooldown: 2, range: 2, target: "enemy", power: 1.6, effect: { type: "stun", turns: 1, chance: 0.5 } },
    ultimate: { name: "Impacto Meteoro del Caos", desc: "Salto acrobático que desciende con fuerza meteórica temporal.", range: 2, target: "enemy", color: "#14b8a6", power: 2.9 },
    passive: { name: "Guardián de la Esperanza", desc: "+15% daño cuando lucha contra jefes y comandantes." },
    transform: {
      name: "Noel Cazador Cronos Despertado",
      desc: "Los recuerdos de Valhalla fortalecen su técnica marcial.",
      mult: { hp: 1.35, atk: 1.45, def: 1.25, spd: 1.35 },
      cost: { materials: { mako_crystal: 15, pergamino: 10, crystal_fragment: 5 }, gold: 8000 },
    },
    portrait: { sheet: 6, quad: 2 },
  },
  {
    key: "serah",
    name: "Serah Farron",
    title: "Vidente de las Paradojas",
    rarity: 4,
    universe: "finalfantasy",
    element: "light",
    role: "Soporte",
    color: "#fb7185",
    move: 3,
    range: 3,
    base: { hp: 960, atk: 145, def: 85, spd: 41 },
    growth: { hp: 65, atk: 10.0, def: 5.8, spd: 0.95 },
    basic: { name: "Flecha de Luz Mog", power: 0.95 },
    skill: { name: "Canto de Protección Temporal", desc: "Aumenta la defensa y regenera salud a un aliado.", cost: 2, cooldown: 2, range: 3, target: "ally", effect: { type: "regen", turns: 3 } },
    ultimate: { name: "Flecha Artemisa del Destino", desc: "Disparo místico que purga debilidades y otorga aura radiante.", range: 3, target: "ally", color: "#f43f5e", effect: { type: "atkUp", turns: 3 } },
    passive: { name: "Visión del Futuro", desc: "Permite a los aliados adyacentes cargar energía 15% más rápido." },
    transform: {
      name: "Serah Portadora del Lazo de Étro",
      desc: "Vínculo sagrado que enlaza el presente con el reino invisible.",
      mult: { hp: 1.36, atk: 1.32, def: 1.35, spd: 1.3 },
      cost: { materials: { mako_crystal: 15, crystal_fragment: 8, attire_sphere: 2 }, gold: 8000 },
    },
    portrait: { sheet: 6, quad: 3 },
  },
  {
    key: "clive",
    name: "Clive Rosfield",
    title: "Primer Escudo y Dominante de Ifrit",
    rarity: 5,
    universe: "finalfantasy",
    element: "fire",
    role: "Guerrero",
    color: "#b91c1c",
    move: 3,
    range: 1,
    base: { hp: 1320, atk: 220, def: 118, spd: 42 },
    growth: { hp: 89, atk: 16.5, def: 8.3, spd: 1.0 },
    basic: { name: "Espada de Valisthea Imbuída", power: 1.15 },
    skill: { name: "Fuego Fatuo & Ascenso Ardiente", desc: "Golpe ascendente que quema y eleva a los enemigos.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.75, effect: { type: "burn", turns: 3 } },
    ultimate: { name: "Apocalipsis de Ifrit Risen", desc: "Se manifiesta el fuego primordial del Eikon en una erupción masiva.", range: 2, target: "enemy", color: "#ea580c", power: 3.6 },
    passive: { name: "Llama de la Venganza", desc: "Cada golpe recibido aumenta su propio ATK en +4% (acumulable hasta +24%)." },
    transform: {
      name: "Clive Manifestación Ifrit Dominante",
      desc: "La carne arde con la piel volcánica del Eikon de Fuego.",
      mult: { hp: 1.5, atk: 1.62, def: 1.45, spd: 1.35 },
      cost: { materials: { mako_crystal: 30, stardust: 8, biju_fragment: 6 }, gold: 16000 },
    },
    portrait: { sheet: 7, quad: 0 },
  },
  {
    key: "zack",
    name: "Zack Fair",
    title: "El Héroe del Legado Vivo",
    rarity: 5,
    universe: "finalfantasy",
    element: "light",
    role: "Tanque",
    color: "#3b82f6",
    move: 3,
    range: 1,
    base: { hp: 1420, atk: 195, def: 140, spd: 38 },
    growth: { hp: 96, atk: 13.8, def: 11.0, spd: 0.9 },
    basic: { name: "Golpe con la Espada Mortal", power: 1.1 },
    skill: { name: "Onda de Choque & Guardia de Honor", desc: "Protege a los aliados y asesta un golpe de escudo demoledor.", cost: 2, cooldown: 2, range: 1, target: "enemy", power: 1.6, effect: { type: "defUp", turns: 3 } },
    ultimate: { name: "Ataque Aéreo OMD (Digital Mind Wave)", desc: "Los rostros de sus amigos llenan la ruleta para liberar su golpe más puro.", range: 2, target: "enemy", color: "#60a5fa", power: 3.3 },
    passive: { name: "Precio de la Libertad", desc: "Otorga +15% de defensa a todos los aliados mientras tenga más del 50% de PV." },
    transform: {
      name: "Zack Alas del Honor Inmortal",
      desc: "El ala blanca del ángel protector acoge sus sueños de héroe.",
      mult: { hp: 1.52, atk: 1.45, def: 1.55, spd: 1.25 },
      cost: { materials: { mako_crystal: 25, attire_sphere: 5, crystal_fragment: 8 }, gold: 14000 },
    },
    portrait: { sheet: 7, quad: 1 },
  },
  {
    key: "regis",
    name: "Rey Regis Lucis",
    title: "El Custodio de la Muralla Mágica",
    rarity: 4,
    universe: "finalfantasy",
    element: "light",
    role: "Soporte",
    color: "#64748b",
    move: 3,
    range: 2,
    base: { hp: 1100, atk: 140, def: 115, spd: 37 },
    growth: { hp: 75, atk: 9.0, def: 8.5, spd: 0.8 },
    basic: { name: "Estocada Real", power: 0.95 },
    skill: { name: "Vínculo de la Barrera Real", desc: "Coloca un escudo mágico defensivo en un compañero.", cost: 2, cooldown: 2, range: 3, target: "ally", effect: { type: "defUp", turns: 3 } },
    ultimate: { name: "Decreto de los Reyes de antaño", desc: "Espadas flotantes de la realeza que curan y bendicen a todo el equipo.", range: 3, target: "ally", color: "#cbd5e1", effect: { type: "regen", turns: 4 } },
    passive: { name: "Corona de Insomnia", desc: "Reduce el coste de chakra de las habilidades aliadas adyacentes en 1." },
    transform: {
      name: "Regis Majestad del Trono de Cristal",
      desc: "Canaliza la fuerza acumulada de 113 generaciones de reyes.",
      mult: { hp: 1.38, atk: 1.28, def: 1.45, spd: 1.2 },
      cost: { materials: { mako_crystal: 16, pergamino: 12, crystal_fragment: 6 }, gold: 9000 },
    },
    portrait: { sheet: 7, quad: 2 },
  },
];

CHARACTERS.forEach((c) => {
  if (!c.lore) c.lore = `${c.name}, ${c.title}. Héroe de ${UNIVERSES[c.universe].name}. Su rol en combate es ${c.role} y canaliza el elemento ${ELEMENTS[c.element].name}.`;
  if (!c.transform.reqLevel) c.transform.reqLevel = c.rarity === 5 ? 40 : c.rarity === 4 ? 30 : 20;
  if (!c.transform.boost) c.transform.boost = c.transform.mult ? ((c.transform.mult.hp + c.transform.mult.atk + c.transform.mult.def + c.transform.mult.spd) / 4) : 1.35;
  if (!c.transform.materials) c.transform.materials = c.transform.cost.materials;
});

export const CHAR_MAP: Record<string, CharDef> = Object.fromEntries(CHARACTERS.map((c) => [c.key, c]));

export function statsFor(def: CharDef, level: number, resonance = 0, transformed = false, overrideMult?: { hp: number; atk: number; def: number; spd: number }) {
  const scale = level - 1;
  const resBonus = 1 + Math.min(resonance, 5) * 0.05;
  const tMult = transformed ? def.transform.mult : { hp: 1, atk: 1, def: 1, spd: 1 };
  const oMult = overrideMult || { hp: 1, atk: 1, def: 1, spd: 1 };

  return {
    hp: Math.round((def.base.hp + def.growth.hp * scale) * resBonus * tMult.hp * oMult.hp),
    atk: Math.round((def.base.atk + def.growth.atk * scale) * resBonus * tMult.atk * oMult.atk),
    def: Math.round((def.base.def + def.growth.def * scale) * resBonus * tMult.def * oMult.def),
    spd: Math.round((def.base.spd + def.growth.spd * scale) * resBonus * tMult.spd * oMult.spd),
  };
}

export function powerOf(stats: { hp: number; atk: number; def: number; spd: number }) {
  return Math.round(stats.hp * 0.2 + stats.atk * 1.8 + stats.def * 1.2 + stats.spd * 2.5);
}

export function levelUpCost(currentLevel: number): { gold: number; esencia: number } {
  return {
    gold: Math.round(120 * Math.pow(currentLevel, 1.35)),
    esencia: Math.max(1, Math.round(currentLevel * 0.45)),
  };
}

export function skillUpCost(currentSkillLevel: number): { gold: number; pergamino: number; crystal_fragment?: number } {
  return {
    gold: Math.round(500 * Math.pow(currentSkillLevel, 1.4)),
    pergamino: Math.max(1, currentSkillLevel * 2),
    crystal_fragment: currentSkillLevel >= 3 ? Math.floor(currentSkillLevel / 2) : undefined,
  };
}

export const XP_FOR_PLAYER_LEVEL = (lvl: number) => Math.round(150 * Math.pow(lvl, 1.3));
export const maxStamina = (lvl: number) => 60 + Math.floor(lvl / 2) * 5;
export const STAMINA_REGEN_MINUTES = 4;

export const ACHIEVEMENTS = [
  { id: "win_1", name: "Primer Paso", desc: "Gana 1 combate en el Nexus.", reward: 50 },
  { id: "win_10", name: "Invocador Veterano", desc: "Gana 10 combates tácticos.", reward: 150 },
  { id: "summon_10", name: "Resonancia Astral", desc: "Realiza 10 invocaciones gacha.", reward: 200 },
  { id: "level_20", name: "Poder Emergente", desc: "Alcanza el nivel 20 de cuenta.", reward: 300 },
  { id: "transform_1", name: "Despertar Trascendente", desc: "Transforma a tu primer héroe.", reward: 250 },
  { id: "multiverse_c2", name: "Grieta Multiversal", desc: "Supera el Capítulo 2 de la convergencia.", reward: 400 },
  { id: "afk_claim_5", name: "Expediciones Prósperas", desc: "Reclama recompensas AFK 5 veces.", reward: 180 },
];
