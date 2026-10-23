// ============================================================
// LEGENDIA NEXUS — Catálogo de personajes originales
// Tres universos: Senda Shinobi (ninjas), Linaje Estelar (ki),
// Corte Arcana (magia). Todas las formas alternas son originales.
// ============================================================

export type Element = "fuego" | "agua" | "viento" | "rayo" | "luz" | "oscuridad";
export type Universe = "shinobi" | "ki" | "arcano";
export type StatusType = "burn" | "stun" | "atkUp" | "defDown" | "regen" | "defUp";

export interface SkillEffect {
  type: StatusType;
  chance: number; // 0..1
  turns: number;
  value?: number;
}

export interface SkillDef {
  name: string;
  desc: string;
  cost: number; // chakra
  cooldown: number;
  power: number; // multiplicador de ATK (0 = sólo efecto)
  range: number;
  aoe: number; // radio Manhattan (0 = objetivo único)
  target: "enemy" | "ally" | "self";
  effect?: SkillEffect;
}

export interface PassiveDef {
  name: string;
  desc: string;
  type: "atkBoost" | "defBoost" | "regen" | "critBoost" | "teamAtk" | "lifesteal" | "energyBoost";
  value: number;
}

export interface TransformDef {
  name: string;
  desc: string;
  reqLevel: number;
  materials: Record<string, number>;
  boost: number;
}

export interface CharDef {
  key: string;
  name: string;
  title: string;
  universe: Universe;
  element: Element;
  rarity: 3 | 4 | 5;
  role: string;
  portrait: { sheet: number; quad: number };
  color: string;
  base: { hp: number; atk: number; def: number; spd: number };
  move: number;
  range: number;
  basic: { name: string; power: number };
  skill: SkillDef;
  ultimate: SkillDef & { color: string };
  passive: PassiveDef;
  transform: TransformDef;
  lore: string;
}

export const ELEMENTS: Record<Element, { name: string; color: string; icon: string }> = {
  fuego: { name: "Fuego", color: "#fb7a3c", icon: "🔥" },
  agua: { name: "Agua", color: "#4cc3ff", icon: "💧" },
  viento: { name: "Viento", color: "#43e0a0", icon: "🌪️" },
  rayo: { name: "Rayo", color: "#ffd93c", icon: "⚡" },
  luz: { name: "Luz", color: "#fff3c4", icon: "✨" },
  oscuridad: { name: "Oscuridad", color: "#b18cff", icon: "🌑" },
};

export const UNIVERSES: Record<Universe, { name: string; icon: string }> = {
  shinobi: { name: "Senda Shinobi", icon: "🥷" },
  ki: { name: "Linaje Estelar", icon: "💥" },
  arcano: { name: "Corte Arcana", icon: "🔮" },
};

// ciclo: fuego > viento > rayo > agua > fuego ; luz <-> oscuridad
export const ADVANTAGE: Record<Element, Element> = {
  fuego: "viento",
  viento: "rayo",
  rayo: "agua",
  agua: "fuego",
  luz: "oscuridad",
  oscuridad: "luz",
};

export const MATERIALS: Record<string, { name: string; icon: string }> = {
  esencia: { name: "Esencia Nexus", icon: "🧪" },
  cristal: { name: "Cristal Estelar", icon: "💎" },
  pergamino: { name: "Pergamino Antiguo", icon: "📜" },
};

export const RARITY_CAP: Record<number, number> = { 3: 40, 4: 60, 5: 80 };

export const CHARACTERS: CharDef[] = [
  {
    key: "kagero", name: "Kagero", title: "Sombra del Clan Umbral", universe: "shinobi",
    element: "oscuridad", rarity: 5, role: "Asesino", portrait: { sheet: 1, quad: 0 }, color: "#b18cff",
    base: { hp: 980, atk: 210, def: 88, spd: 34 }, move: 4, range: 1,
    basic: { name: "Colmillo Umbrío", power: 1.0 },
    skill: { name: "Paso de las Mil Sombras", desc: "Teletransporte ofensivo que reduce la defensa del objetivo.", cost: 3, cooldown: 2, power: 1.6, range: 3, aoe: 0, target: "enemy", effect: { type: "defDown", chance: 0.9, turns: 2, value: 0.3 } },
    ultimate: { name: "Réquiem del Eclipse Negro", desc: "Sumerge el campo en oscuridad absoluta y desgarra a todos los enemigos cercanos.", cost: 0, cooldown: 0, power: 3.4, range: 3, aoe: 1, target: "enemy", color: "#8b5cf6", effect: { type: "stun", chance: 0.5, turns: 1 } },
    passive: { name: "Sed de Sombra", desc: "Roba un 15% del daño como vida.", type: "lifesteal", value: 0.15 },
    transform: { name: "Kagero — Velo del Vacío", desc: "Forma original no canónica: su sombra se fusiona con el vacío entre mundos, su cabello se vuelve estelar y sus ojos arden en violeta.", reqLevel: 45, materials: { cristal: 8, esencia: 40 }, boost: 1.3 },
    lore: "Último heredero del Clan Umbral, cuya aldea fue devorada por una grieta del Nexus. Selló la grieta con su propia sombra y ahora la lleva como arma y como maldición.",
  },
  {
    key: "ryuen", name: "Ryuen", title: "Puño de la Llama Carmesí", universe: "shinobi",
    element: "fuego", rarity: 4, role: "Atacante", portrait: { sheet: 1, quad: 1 }, color: "#fb7a3c",
    base: { hp: 900, atk: 178, def: 82, spd: 28 }, move: 3, range: 1,
    basic: { name: "Garra Ígnea", power: 1.0 },
    skill: { name: "Sello del Dragón Ardiente", desc: "Escupe una serpiente de fuego que quema al objetivo.", cost: 3, cooldown: 2, power: 1.7, range: 2, aoe: 0, target: "enemy", effect: { type: "burn", chance: 0.85, turns: 3, value: 0.06 } },
    ultimate: { name: "Kirin de Ceniza: Ascua Final", desc: "Un dragón de ceniza incandescente atraviesa el campo de batalla.", cost: 0, cooldown: 0, power: 3.0, range: 3, aoe: 1, target: "enemy", color: "#ff5a2a", effect: { type: "burn", chance: 1, turns: 2, value: 0.06 } },
    passive: { name: "Sangre Caliente", desc: "+12% de ataque propio.", type: "atkBoost", value: 0.12 },
    transform: { name: "Ryuen — Fénix de Obsidiana", desc: "Transformación original: llamas negras de obsidiana líquida recubren su cuerpo y alas de fuego brotan de su espalda.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "Huérfano adoptado por el Templo de la Llama, aprendió que el fuego no destruye: revela lo que ya estaba roto. Busca al invasor que quemó su hogar.",
  },
  {
    key: "ayame", name: "Ayame", title: "Danza del Viento Verde", universe: "shinobi",
    element: "viento", rarity: 3, role: "Apoyo", portrait: { sheet: 1, quad: 2 }, color: "#43e0a0",
    base: { hp: 780, atk: 132, def: 74, spd: 30 }, move: 4, range: 2,
    basic: { name: "Kunai Vendaval", power: 0.95 },
    skill: { name: "Corriente Vital", desc: "Cura a un aliado con una brisa sanadora.", cost: 3, cooldown: 2, power: 1.4, range: 3, aoe: 0, target: "ally" },
    ultimate: { name: "Vals de las Mil Hojas", desc: "Un ciclón de hojas cortantes golpea a los enemigos y acelera el ánimo aliado.", cost: 0, cooldown: 0, power: 2.4, range: 3, aoe: 1, target: "enemy", color: "#34d399", effect: { type: "defDown", chance: 0.8, turns: 2, value: 0.2 } },
    passive: { name: "Brisa Constante", desc: "Regenera 3% de vida cada turno.", type: "regen", value: 0.03 },
    transform: { name: "Ayame — Emperatriz del Céfiro", desc: "Forma original: su cabello se vuelve luz verde y controla corrientes que cortan el acero.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "Kunoichi del Bosque Susurrante. Su clan desapareció en una noche sin viento; desde entonces escucha cada brisa buscando sus voces.",
  },
  {
    key: "raiko", name: "Raiko", title: "Filo del Trueno Blanco", universe: "shinobi",
    element: "rayo", rarity: 4, role: "Atacante", portrait: { sheet: 1, quad: 3 }, color: "#ffd93c",
    base: { hp: 860, atk: 182, def: 76, spd: 33 }, move: 4, range: 1,
    basic: { name: "Tajo Relámpago", power: 1.0 },
    skill: { name: "Sello del Cielo Rugiente", desc: "Descarga eléctrica que puede paralizar.", cost: 4, cooldown: 3, power: 1.8, range: 2, aoe: 0, target: "enemy", effect: { type: "stun", chance: 0.45, turns: 1 } },
    ultimate: { name: "Juicio de las Nueve Tormentas", desc: "Nueve columnas de rayo caen sobre la posición enemiga.", cost: 0, cooldown: 0, power: 3.1, range: 4, aoe: 1, target: "enemy", color: "#facc15", effect: { type: "stun", chance: 0.6, turns: 1 } },
    passive: { name: "Impulso Estático", desc: "+20% de generación de energía.", type: "energyBoost", value: 0.2 },
    transform: { name: "Raiko — Avatar del Kami del Rayo", desc: "Transformación original: armadura de plasma blanco y un tambor de tormenta flota a su espalda.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "El prodigio del Clan Tormenta. Su velocidad es tan grande que los ancianos dicen que llegó al mundo antes que el rayo que lo anunció.",
  },
  {
    key: "mizuha", name: "Mizuha", title: "Espejo de la Marea", universe: "shinobi",
    element: "agua", rarity: 3, role: "Sanadora", portrait: { sheet: 2, quad: 0 }, color: "#4cc3ff",
    base: { hp: 820, atk: 118, def: 80, spd: 26 }, move: 3, range: 2,
    basic: { name: "Aguja de Rocío", power: 0.9 },
    skill: { name: "Velo de la Marea", desc: "Cura a un aliado y le otorga regeneración.", cost: 3, cooldown: 2, power: 1.5, range: 3, aoe: 0, target: "ally", effect: { type: "regen", chance: 1, turns: 2, value: 0.05 } },
    ultimate: { name: "Océano Interior: Sanación Lunar", desc: "Una ola de luz lunar cura a todo el equipo.", cost: 0, cooldown: 0, power: 2.2, range: 99, aoe: 99, target: "ally", color: "#38bdf8", effect: { type: "regen", chance: 1, turns: 2, value: 0.05 } },
    passive: { name: "Corazón de Marea", desc: "Regenera 4% de vida cada turno.", type: "regen", value: 0.04 },
    transform: { name: "Mizuha — Deidad del Mar Sereno", desc: "Forma original: manto de agua viviente y un halo de perlas orbitando su cabeza.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "Sacerdotisa ninja de la Isla Espejo. Cuando el Nexus tembló, su templo se hundió; ella sostiene el mar sobre sus hombros para que no olvide su forma.",
  },
  {
    key: "jin", name: "Jin", title: "Espada del Viento Errante", universe: "shinobi",
    element: "viento", rarity: 4, role: "Duelista", portrait: { sheet: 2, quad: 1 }, color: "#2dd4bf",
    base: { hp: 870, atk: 175, def: 84, spd: 31 }, move: 4, range: 1,
    basic: { name: "Doble Colmillo", power: 1.05 },
    skill: { name: "Corte del Horizonte", desc: "Tajo de vacío que alcanza a distancia y debilita la defensa.", cost: 3, cooldown: 2, power: 1.6, range: 3, aoe: 0, target: "enemy", effect: { type: "defDown", chance: 0.8, turns: 2, value: 0.25 } },
    ultimate: { name: "Cien Estilos: Vendaval Carmesí", desc: "Cien cortes simultáneos en el área objetivo.", cost: 0, cooldown: 0, power: 3.2, range: 3, aoe: 1, target: "enemy", color: "#2dd4bf" },
    passive: { name: "Mente Serena", desc: "+15% de defensa propia.", type: "defBoost", value: 0.15 },
    transform: { name: "Jin — Santo de la Espada Hueca", desc: "Transformación original: sus dos espadas se funden en una hoja de viento sólido transparente.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "Ronin sin clan que juró cortar sólo lo que no puede perdonarse. Su técnica nace del silencio entre dos latidos.",
  },
  {
    key: "kaion", name: "Kaion", title: "Heredero del Sol Estelar", universe: "ki",
    element: "fuego", rarity: 5, role: "Destructor", portrait: { sheet: 2, quad: 2 }, color: "#ffb020",
    base: { hp: 1050, atk: 215, def: 92, spd: 29 }, move: 3, range: 1,
    basic: { name: "Puño Meteoro", power: 1.05 },
    skill: { name: "Onda Solar Concentrada", desc: "Ráfaga de ki dorado en línea.", cost: 4, cooldown: 2, power: 1.9, range: 4, aoe: 0, target: "enemy", effect: { type: "burn", chance: 0.6, turns: 2, value: 0.05 } },
    ultimate: { name: "Génesis Kaion: Supernova", desc: "Concentra el ki de todo el campo en una esfera que estalla como un sol naciente.", cost: 0, cooldown: 0, power: 3.6, range: 4, aoe: 1, target: "enemy", color: "#ffb020" },
    passive: { name: "Zenkai del Alba", desc: "+15% de ataque propio.", type: "atkBoost", value: 0.15 },
    transform: { name: "Kaion — Ascensión Nova Carmesí", desc: "Transformación original no canónica: cabello rojo plasma, aura con anillos orbitales y grietas de luz en la piel.", reqLevel: 45, materials: { cristal: 8, esencia: 40 }, boost: 1.3 },
    lore: "Último hijo de una estirpe de guerreros estelares cuyo planeta fue consumido por el Eclipse. Entrena bajo gravedad x100 para que ningún mundo más caiga.",
  },
  {
    key: "sunna", name: "Sunna", title: "Lanza del Amanecer", universe: "ki",
    element: "luz", rarity: 4, role: "Guerrera", portrait: { sheet: 2, quad: 3 }, color: "#ffe08a",
    base: { hp: 920, atk: 170, def: 95, spd: 27 }, move: 3, range: 1,
    basic: { name: "Estocada Radiante", power: 1.0 },
    skill: { name: "Égida del Alba", desc: "Aumenta el ataque de un aliado con luz estelar.", cost: 3, cooldown: 3, power: 0, range: 3, aoe: 0, target: "ally", effect: { type: "atkUp", chance: 1, turns: 3, value: 0.35 } },
    ultimate: { name: "Juicio Solar: Columna del Alba", desc: "Una columna de luz purifica el área enemiga.", cost: 0, cooldown: 0, power: 2.9, range: 3, aoe: 1, target: "enemy", color: "#ffe08a", effect: { type: "defDown", chance: 0.8, turns: 2, value: 0.2 } },
    passive: { name: "Estandarte Dorado", desc: "+8% de ataque a todo el equipo.", type: "teamAtk", value: 0.08 },
    transform: { name: "Sunna — Valkiria del Primer Sol", desc: "Forma original: alas de luz sólida y armadura de aurora que canta al moverse.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "Comandante de la Guardia del Alba. Su lanza fue forjada con el primer rayo de sol que tocó el Nexus tras la Gran Grieta.",
  },
  {
    key: "brodd", name: "Brodd", title: "Muralla del Trueno", universe: "ki",
    element: "rayo", rarity: 3, role: "Tanque", portrait: { sheet: 3, quad: 0 }, color: "#eab308",
    base: { hp: 1150, atk: 120, def: 110, spd: 20 }, move: 2, range: 1,
    basic: { name: "Martillo Sísmico", power: 0.95 },
    skill: { name: "Piel de Tormenta", desc: "Endurece su cuerpo con placas de plasma.", cost: 3, cooldown: 3, power: 0, range: 0, aoe: 0, target: "self", effect: { type: "defUp", chance: 1, turns: 3, value: 0.5 } },
    ultimate: { name: "Coloso del Cielo Partido", desc: "Golpea el suelo y una onda sísmica eléctrica arrasa el frente.", cost: 0, cooldown: 0, power: 2.6, range: 2, aoe: 1, target: "enemy", color: "#eab308", effect: { type: "stun", chance: 0.5, turns: 1 } },
    passive: { name: "Roca Viviente", desc: "+20% de defensa propia.", type: "defBoost", value: 0.2 },
    transform: { name: "Brodd — Titán de Ferro-Tormenta", desc: "Forma original: su piel se vuelve aleación viviente surcada de relámpagos azules.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "Gladiador liberado que juró no volver a pelear por oro. Pelea por los que no pueden: cada cicatriz es un nombre que protegió.",
  },
  {
    key: "vex", name: "Vex", title: "Chispa Indomable", universe: "ki",
    element: "fuego", rarity: 3, role: "Luchador", portrait: { sheet: 3, quad: 1 }, color: "#f87171",
    base: { hp: 800, atk: 145, def: 70, spd: 32 }, move: 4, range: 1,
    basic: { name: "Combo Cometa", power: 1.0 },
    skill: { name: "Ráfaga de Meteoritos", desc: "Lluvia de puñetazos ardientes.", cost: 3, cooldown: 2, power: 1.7, range: 1, aoe: 0, target: "enemy", effect: { type: "burn", chance: 0.5, turns: 2, value: 0.05 } },
    ultimate: { name: "Impacto Final: Cometa Rojo", desc: "Se lanza como un cometa contra el objetivo.", cost: 0, cooldown: 0, power: 2.9, range: 4, aoe: 0, target: "enemy", color: "#ef4444" },
    passive: { name: "Espíritu Ardiente", desc: "+10% de probabilidad de golpe crítico.", type: "critBoost", value: 0.1 },
    transform: { name: "Vex — Modo Cometa Carmesí", desc: "Forma original: su bufanda se vuelve una estela de fuego y sus puños arden como soles gemelos.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "El discípulo más joven de Kaion. Lo que le falta en técnica lo compensa con un corazón que se niega a apagarse.",
  },
  {
    key: "kenji", name: "Kenji", title: "Novicio de la Luz Serena", universe: "ki",
    element: "luz", rarity: 3, role: "Sanador", portrait: { sheet: 3, quad: 2 }, color: "#fde68a",
    base: { hp: 790, atk: 115, def: 78, spd: 27 }, move: 3, range: 2,
    basic: { name: "Palma Luminosa", power: 0.9 },
    skill: { name: "Plegaria del Alba", desc: "Cura a un aliado con energía serena.", cost: 3, cooldown: 2, power: 1.6, range: 3, aoe: 0, target: "ally" },
    ultimate: { name: "Mandala de las Mil Luces", desc: "Un mandala gigante sana y fortalece a todo el equipo.", cost: 0, cooldown: 0, power: 1.9, range: 99, aoe: 99, target: "ally", color: "#fde68a", effect: { type: "atkUp", chance: 1, turns: 2, value: 0.2 } },
    passive: { name: "Fe Inquebrantable", desc: "Regenera 3% de vida cada turno.", type: "regen", value: 0.03 },
    transform: { name: "Kenji — Iluminado del Noveno Cielo", desc: "Forma original: nueve halos concéntricos giran tras él mientras sus ojos brillan en blanco.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "Encontrado en la puerta del monasterio dentro de una esfera de luz. Los monjes dicen que el Nexus lo envió; él sólo quiere ser útil.",
  },
  {
    key: "lyra", name: "Lyra", title: "Voz de los Eidolones", universe: "arcano",
    element: "agua", rarity: 5, role: "Invocadora", portrait: { sheet: 3, quad: 3 }, color: "#67e8f9",
    base: { hp: 940, atk: 195, def: 90, spd: 28 }, move: 3, range: 3,
    basic: { name: "Fragmento de Marea", power: 0.95 },
    skill: { name: "Plegaria del Leviatán", desc: "Invoca una lanza de mar profundo.", cost: 4, cooldown: 2, power: 1.8, range: 4, aoe: 0, target: "enemy", effect: { type: "defDown", chance: 0.7, turns: 2, value: 0.25 } },
    ultimate: { name: "Eidolón Leviatán: Marea del Fin", desc: "El Leviatán ancestral emerge y ahoga el campo enemigo en un océano suspendido.", cost: 0, cooldown: 0, power: 3.3, range: 4, aoe: 2, target: "enemy", color: "#22d3ee", effect: { type: "stun", chance: 0.4, turns: 1 } },
    passive: { name: "Canto Ancestral", desc: "Regenera 4% de vida cada turno.", type: "regen", value: 0.04 },
    transform: { name: "Lyra — Reina Abisal de los Eidolones", desc: "Forma original: corona de coral estelar y un manto de océano nocturno con constelaciones nadando en él.", reqLevel: 45, materials: { cristal: 8, esencia: 40 }, boost: 1.3 },
    lore: "La última invocadora de la Corte Arcana. Escucha a los eidolones como otros escuchan el viento, y teme el día en que todos callen a la vez.",
  },
  {
    key: "aurelia", name: "Aurelia", title: "Ala del Juicio Dorado", universe: "arcano",
    element: "luz", rarity: 5, role: "Paladín", portrait: { sheet: 4, quad: 0 }, color: "#fcd34d",
    base: { hp: 1080, atk: 190, def: 105, spd: 26 }, move: 3, range: 1,
    basic: { name: "Espada Sacra", power: 1.0 },
    skill: { name: "Bendición del Bastión", desc: "Cura a un aliado y refuerza su defensa.", cost: 3, cooldown: 2, power: 1.3, range: 2, aoe: 0, target: "ally", effect: { type: "defUp", chance: 1, turns: 2, value: 0.35 } },
    ultimate: { name: "Sentencia Final: Alas del Juicio", desc: "Seis alas de luz descienden como espadas sobre el área enemiga.", cost: 0, cooldown: 0, power: 3.2, range: 3, aoe: 1, target: "enemy", color: "#fcd34d", effect: { type: "atkUp", chance: 0, turns: 0 } },
    passive: { name: "Aura Sagrada", desc: "+10% de defensa a todo el equipo... y a sí misma.", type: "defBoost", value: 0.15 },
    transform: { name: "Aurelia — Serafín del Trono Roto", desc: "Forma original: doce alas de luz fracturada y una corona que arde sin consumirse.", reqLevel: 45, materials: { cristal: 8, esencia: 40 }, boost: 1.3 },
    lore: "Paladín de la Corte Arcana. Cuando los dioses abandonaron el Nexus, ella se quedó: alguien debía sostener la puerta.",
  },
  {
    key: "nocturne", name: "Nocturne", title: "Archimago del Velo", universe: "arcano",
    element: "oscuridad", rarity: 4, role: "Mago", portrait: { sheet: 4, quad: 1 }, color: "#a78bfa",
    base: { hp: 830, atk: 190, def: 72, spd: 27 }, move: 3, range: 3,
    basic: { name: "Dardo del Velo", power: 0.95 },
    skill: { name: "Maldición del Crepúsculo", desc: "Runas oscuras drenan la voluntad del objetivo.", cost: 4, cooldown: 3, power: 1.7, range: 4, aoe: 0, target: "enemy", effect: { type: "stun", chance: 0.4, turns: 1 } },
    ultimate: { name: "Grimorio Prohibido: Noche Eterna", desc: "Abre su grimorio y una noche sin estrellas devora el área.", cost: 0, cooldown: 0, power: 3.1, range: 4, aoe: 1, target: "enemy", color: "#7c3aed", effect: { type: "defDown", chance: 0.9, turns: 2, value: 0.3 } },
    passive: { name: "Pacto Sombrío", desc: "Roba un 10% del daño como vida.", type: "lifesteal", value: 0.1 },
    transform: { name: "Nocturne — Rey del Interludio", desc: "Forma original: su cuerpo se vuelve una silueta de constelaciones muertas con un tercer ojo rúnico.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "Estudió el grimorio que nadie debía leer para entender qué devora los mundos. Ahora el grimorio lo lee a él.",
  },
  {
    key: "ignar", name: "Ignar", title: "Cuerno de Magma", universe: "arcano",
    element: "fuego", rarity: 4, role: "Berserker", portrait: { sheet: 4, quad: 2 }, color: "#ff6b35",
    base: { hp: 950, atk: 188, def: 78, spd: 25 }, move: 3, range: 1,
    basic: { name: "Zarpa Volcánica", power: 1.05 },
    skill: { name: "Erupción Encadenada", desc: "Grietas de magma estallan bajo el objetivo.", cost: 4, cooldown: 2, power: 1.9, range: 2, aoe: 1, target: "enemy", effect: { type: "burn", chance: 0.7, turns: 2, value: 0.06 } },
    ultimate: { name: "Ifrit Original: Corazón del Volcán", desc: "Canaliza a la bestia primigenia del magma y hace erupción sobre el campo.", cost: 0, cooldown: 0, power: 3.2, range: 3, aoe: 1, target: "enemy", color: "#ff6b35", effect: { type: "burn", chance: 1, turns: 3, value: 0.06 } },
    passive: { name: "Furia Térmica", desc: "+12% de ataque propio.", type: "atkBoost", value: 0.12 },
    transform: { name: "Ignar — Señor Piroclástico", desc: "Forma original: cuernos de obsidiana en llamas y un núcleo de magma visible en el pecho.", reqLevel: 35, materials: { cristal: 5, esencia: 25 }, boost: 1.25 },
    lore: "Mitad guerrero, mitad eidolón del fuego. La Corte lo considera un arma; Lyra lo considera un amigo.",
  },
  {
    key: "eira", name: "Eira", title: "Susurro del Invierno", universe: "arcano",
    element: "agua", rarity: 3, role: "Hechicera", portrait: { sheet: 4, quad: 3 }, color: "#a5f3fc",
    base: { hp: 770, atk: 140, def: 72, spd: 29 }, move: 3, range: 3,
    basic: { name: "Esquirla de Hielo", power: 0.95 },
    skill: { name: "Prisión de Escarcha", desc: "Cristales de hielo que pueden congelar al objetivo.", cost: 3, cooldown: 3, power: 1.5, range: 4, aoe: 0, target: "enemy", effect: { type: "stun", chance: 0.45, turns: 1 } },
    ultimate: { name: "Invierno Absoluto: Cero Eterno", desc: "El tiempo se congela en el área enemiga.", cost: 0, cooldown: 0, power: 2.8, range: 4, aoe: 1, target: "enemy", color: "#a5f3fc", effect: { type: "stun", chance: 0.7, turns: 1 } },
    passive: { name: "Piel de Invierno", desc: "+15% de defensa propia.", type: "defBoost", value: 0.15 },
    transform: { name: "Eira — Reina del Cero Absoluto", desc: "Forma original: cabello de aurora boreal y un cetro de hielo que nunca se derrite.", reqLevel: 25, materials: { cristal: 3, esencia: 15 }, boost: 1.22 },
    lore: "Nació durante la Nevada de Cien Años. El invierno la reconoce como suya, y ella aún decide si eso es un regalo.",
  },
];

export const CHAR_MAP: Record<string, CharDef> = Object.fromEntries(
  CHARACTERS.map((c) => [c.key, c])
);

export const STARTER_TEAM = ["ryuen", "ayame", "vex", "eira"];

export interface StatBlock { hp: number; atk: number; def: number; spd: number }

export function statsFor(
  def: CharDef,
  level: number,
  resonance = 0,
  transformed = false,
  mult?: { hp: number; atk: number; def: number; spd: number }
): StatBlock {
  const m = mult || { hp: 1, atk: 1, def: 1, spd: 1 };
  const res = 1 + 0.05 * Math.min(resonance, 5);
  const tr = transformed ? def.transform.boost : 1;
  return {
    hp: Math.round(def.base.hp * (1 + 0.09 * (level - 1)) * res * tr * m.hp),
    atk: Math.round(def.base.atk * (1 + 0.08 * (level - 1)) * res * tr * m.atk),
    def: Math.round(def.base.def * (1 + 0.07 * (level - 1)) * res * tr * m.def),
    spd: Math.round((def.base.spd + Math.floor(level / 10)) * m.spd),
  };
}

export function powerOf(s: StatBlock): number {
  return Math.round(s.hp / 4 + s.atk * 2 + s.def * 1.5 + s.spd * 3);
}

export function levelUpCost(level: number): { gold: number; esencia: number } {
  return { gold: 120 + level * 55, esencia: 1 + Math.floor(level / 8) };
}

export function skillUpCost(skillLevel: number): { gold: number; pergamino: number } {
  return { gold: 400 * skillLevel, pergamino: 2 * skillLevel };
}

export const XP_FOR_PLAYER_LEVEL = (lvl: number) => 100 + lvl * 80;

export function maxStamina(playerLevel: number) {
  return 60 + playerLevel * 2;
}

export const STAMINA_REGEN_MINUTES = 4;

export interface AchievementDef {
  key: string;
  name: string;
  desc: string;
  reward: { gems?: number; gold?: number; stardust?: number };
  check: (p: { wins: number; summonCount: number; level: number; charCount: number }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_win", name: "Primer Sangrado", desc: "Gana tu primera batalla.", reward: { gems: 50 }, check: (p) => p.wins >= 1 },
  { key: "wins_10", name: "Veterano del Nexus", desc: "Gana 10 batallas.", reward: { gems: 150, gold: 3000 }, check: (p) => p.wins >= 10 },
  { key: "wins_30", name: "Leyenda de Guerra", desc: "Gana 30 batallas.", reward: { gems: 300, stardust: 20 }, check: (p) => p.wins >= 30 },
  { key: "first_summon", name: "El Nexus Responde", desc: "Realiza tu primera invocación.", reward: { gems: 50 }, check: (p) => p.summonCount >= 1 },
  { key: "summon_30", name: "Coleccionista Voraz", desc: "Realiza 30 invocaciones.", reward: { gems: 200, stardust: 15 }, check: (p) => p.summonCount >= 30 },
  { key: "level_5", name: "Comandante Novato", desc: "Alcanza nivel de cuenta 5.", reward: { gems: 100, gold: 2000 }, check: (p) => p.level >= 5 },
  { key: "level_10", name: "Comandante Estelar", desc: "Alcanza nivel de cuenta 10.", reward: { gems: 250 }, check: (p) => p.level >= 10 },
  { key: "chars_8", name: "Escuadrón Completo", desc: "Colecciona 8 personajes distintos.", reward: { gems: 150 }, check: (p) => p.charCount >= 8 },
  { key: "chars_16", name: "Nexus Completo", desc: "Colecciona los 16 personajes.", reward: { gems: 500, stardust: 50 }, check: (p) => p.charCount >= 16 },
];