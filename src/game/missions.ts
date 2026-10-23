// ============================================================
// LEGENDIA NEXUS — Campaña, misiones y eventos
// ============================================================
import type { Element } from "./catalog";

export interface EnemyDef {
  name: string;
  charKey: string; // retrato usado (versión corrompida del personaje)
  element: Element;
  level: number;
  hpMult: number;
  atkMult: number;
  boss?: boolean;
}

export interface DialogueLine { speaker: string; text: string }

export interface MissionDef {
  id: string;
  chapter: number;
  index: number;
  name: string;
  difficulty: "normal" | "hard" | "event";
  staminaCost: number;
  recLevel: number;
  enemies: EnemyDef[];
  dialogue: DialogueLine[];
  rewards: {
    gold: number;
    xp: number;
    firstGems: number;
    gems: number;
    materials: Record<string, number>;
  };
  unlockAfter?: string; // id de misión requerida
  bossName?: string;
}

const mob = (name: string, charKey: string, element: Element, level: number, hpMult = 0.75, atkMult = 0.7): EnemyDef =>
  ({ name, charKey, element, level, hpMult, atkMult });

const boss = (name: string, charKey: string, element: Element, level: number, hpMult = 2.6, atkMult = 0.95): EnemyDef =>
  ({ name, charKey, element, level, hpMult, atkMult, boss: true });

export const MISSIONS: MissionDef[] = [
  {
    id: "c1-1", chapter: 1, index: 1, name: "Grieta en el Bosque Susurrante", difficulty: "normal",
    staminaCost: 5, recLevel: 3,
    enemies: [mob("Eco Corrupto", "ayame", "viento", 3), mob("Eco Corrupto", "vex", "fuego", 3)],
    dialogue: [
      { speaker: "Ayame", text: "El bosque ya no susurra... grita. Algo está drenando el viento de este lugar." },
      { speaker: "Ryuen", text: "Ecos corruptos. El Nexus está escupiendo sombras de nosotros mismos." },
      { speaker: "Ayame", text: "Entonces devolvámoslas al silencio. ¡Formación de combate!" },
    ],
    rewards: { gold: 500, xp: 60, firstGems: 30, gems: 5, materials: { esencia: 3 } },
  },
  {
    id: "c1-2", chapter: 1, index: 2, name: "Cenizas del Templo", difficulty: "normal",
    staminaCost: 6, recLevel: 5, unlockAfter: "c1-1",
    enemies: [mob("Sombra Ígnea", "ryuen", "fuego", 5), mob("Sombra Ígnea", "ignar", "fuego", 5), mob("Acólito del Velo", "nocturne", "oscuridad", 4)],
    dialogue: [
      { speaker: "Ryuen", text: "Mi templo... todavía arde después de tres años. Este fuego no es natural." },
      { speaker: "Nocturne (eco)", text: "El Velo recuerda tu nombre, pequeño dragón..." },
      { speaker: "Ryuen", text: "¡Pues que aprenda a temerlo!" },
    ],
    rewards: { gold: 650, xp: 80, firstGems: 30, gems: 5, materials: { esencia: 4, pergamino: 1 } },
  },
  {
    id: "c1-3", chapter: 1, index: 3, name: "El Mar que Olvidó su Forma", difficulty: "normal",
    staminaCost: 7, recLevel: 7, unlockAfter: "c1-2",
    enemies: [mob("Marea Viviente", "mizuha", "agua", 7), mob("Marea Viviente", "eira", "agua", 7), mob("Fragmento Abisal", "lyra", "agua", 8, 1.0, 0.8)],
    dialogue: [
      { speaker: "Mizuha", text: "El mar flota en el cielo... la gravedad del Nexus se está invirtiendo." },
      { speaker: "Lyra (eco)", text: "Los eidolones lloran. ¿No los oyes?" },
      { speaker: "Mizuha", text: "Los oigo. Y por eso voy a calmarlos, aunque tenga que luchar contra su reflejo." },
    ],
    rewards: { gold: 800, xp: 100, firstGems: 30, gems: 5, materials: { esencia: 5, cristal: 1 } },
  },
  {
    id: "c1-4", chapter: 1, index: 4, name: "Tormenta sobre la Arena Rúnica", difficulty: "normal",
    staminaCost: 8, recLevel: 9, unlockAfter: "c1-3",
    enemies: [mob("Coloso Menor", "brodd", "rayo", 9, 1.1, 0.75), mob("Chispa Hostil", "raiko", "rayo", 9), mob("Chispa Hostil", "jin", "viento", 9)],
    dialogue: [
      { speaker: "Raiko", text: "Esta arena... aquí luchaban los antiguos comandantes del Nexus." },
      { speaker: "Brodd (eco)", text: "Demuestra que mereces caminar sobre sus losas." },
      { speaker: "Raiko", text: "Con gusto. ¡Que ruja el cielo!" },
    ],
    rewards: { gold: 950, xp: 120, firstGems: 30, gems: 5, materials: { esencia: 6, pergamino: 2 } },
  },
  {
    id: "c1-5", chapter: 1, index: 5, name: "Vharzun, Eco del Devorador", difficulty: "normal",
    staminaCost: 10, recLevel: 12, unlockAfter: "c1-4", bossName: "Vharzun (Eco)",
    enemies: [boss("Vharzun, Eco del Devorador", "kagero", "oscuridad", 13), mob("Garra del Velo", "nocturne", "oscuridad", 10), mob("Garra del Velo", "ignar", "fuego", 10)],
    dialogue: [
      { speaker: "Vharzun", text: "Tres mundos rotos... un solo apetito. Yo soy la boca del Eclipse." },
      { speaker: "Kagero", text: "Tu eco devoró mi aldea. Hoy mi sombra te devuelve el favor." },
      { speaker: "Vharzun", text: "Las sombras no muerden a la oscuridad, niño Umbral." },
      { speaker: "Kagero", text: "La mía sí." },
    ],
    rewards: { gold: 1500, xp: 200, firstGems: 100, gems: 10, materials: { esencia: 10, cristal: 3 } },
  },
  {
    id: "c2-1", chapter: 2, index: 1, name: "Gravedad Cien", difficulty: "normal",
    staminaCost: 8, recLevel: 14, unlockAfter: "c1-5",
    enemies: [mob("Guerrero Estelar Caído", "kaion", "fuego", 14, 1.0, 0.85), mob("Centinela del Alba", "sunna", "luz", 14), mob("Novicio Sombrío", "kenji", "luz", 13)],
    dialogue: [
      { speaker: "Kaion", text: "Mi nave de entrenamiento. La gravedad x100 sigue activa... junto con mis fantasmas." },
      { speaker: "Sunna (eco)", text: "El Linaje Estelar cayó una vez. ¿Caerás tú también?" },
      { speaker: "Kaion", text: "Los que caen aprenden a levantarse más fuertes. ¡Zenkai!" },
    ],
    rewards: { gold: 1200, xp: 160, firstGems: 40, gems: 6, materials: { esencia: 7, pergamino: 2 } },
  },
  {
    id: "c2-2", chapter: 2, index: 2, name: "La Corte de los Espejos Rotos", difficulty: "normal",
    staminaCost: 9, recLevel: 16, unlockAfter: "c2-1",
    enemies: [mob("Reflejo Arcano", "aurelia", "luz", 16, 1.0, 0.85), mob("Reflejo Arcano", "lyra", "agua", 16), mob("Reflejo Arcano", "eira", "agua", 15)],
    dialogue: [
      { speaker: "Lyra", text: "La Corte Arcana... cada espejo muestra una versión nuestra que se rindió." },
      { speaker: "Aurelia (eco)", text: "Rendirse también es una forma de paz." },
      { speaker: "Lyra", text: "La paz que ofrece el Eclipse es la paz de los cementerios. ¡Rompamos los espejos!" },
    ],
    rewards: { gold: 1400, xp: 190, firstGems: 40, gems: 6, materials: { esencia: 8, cristal: 2 } },
  },
  {
    id: "c2-3", chapter: 2, index: 3, name: "El Puente de los Tres Mundos", difficulty: "normal",
    staminaCost: 10, recLevel: 18, unlockAfter: "c2-2",
    enemies: [mob("Guardián Shinobi", "jin", "viento", 18, 1.0, 0.85), mob("Guardián Estelar", "brodd", "rayo", 18, 1.2, 0.8), mob("Guardián Arcano", "nocturne", "oscuridad", 18)],
    dialogue: [
      { speaker: "Jin (eco)", text: "Este puente une los tres mundos. Nadie cruza sin dejar algo atrás." },
      { speaker: "Ayame", text: "Dejaremos atrás el miedo. Es lo único que el Eclipse puede comer." },
      { speaker: "Jin (eco)", text: "Entonces crucen... si sus espadas están a la altura de sus palabras." },
    ],
    rewards: { gold: 1600, xp: 220, firstGems: 40, gems: 6, materials: { esencia: 9, pergamino: 3 } },
  },
  {
    id: "c2-4", chapter: 2, index: 4, name: "Antesala del Eclipse", difficulty: "normal",
    staminaCost: 11, recLevel: 20, unlockAfter: "c2-3",
    enemies: [mob("Heraldo Negro", "kagero", "oscuridad", 20, 1.1, 0.9), mob("Heraldo Negro", "nocturne", "oscuridad", 20), mob("Heraldo Ardiente", "ignar", "fuego", 20, 1.0, 0.9)],
    dialogue: [
      { speaker: "Nocturne", text: "El grimorio tiembla. Estamos cerca del corazón del Eclipse." },
      { speaker: "Vharzun", text: "Mis heraldos ya saborearon vuestro ki, vuestro chakra, vuestra magia... saben a derrota." },
      { speaker: "Kaion", text: "Pues prepárate a probar el plato principal." },
    ],
    rewards: { gold: 1800, xp: 250, firstGems: 40, gems: 6, materials: { esencia: 10, cristal: 3 } },
  },
  {
    id: "c2-5", chapter: 2, index: 5, name: "Vharzun, Devorador de Nexos", difficulty: "normal",
    staminaCost: 12, recLevel: 23, unlockAfter: "c2-4", bossName: "Vharzun",
    enemies: [boss("Vharzun, Devorador de Nexos", "kagero", "oscuridad", 24, 3.2, 1.05), mob("Colmillo del Eclipse", "ignar", "fuego", 21, 1.0, 0.9), mob("Colmillo del Eclipse", "lyra", "agua", 21, 1.0, 0.9)],
    dialogue: [
      { speaker: "Vharzun", text: "He devorado mil nexos. El vuestro será el postre." },
      { speaker: "Kagero", text: "Mi clan selló una grieta con su vida. Yo sellaré tu boca con mi sombra." },
      { speaker: "Lyra", text: "¡Eidolones, responded a mi voz! ¡Hoy el Nexus contraataca!" },
      { speaker: "Vharzun", text: "¡ENTONCES VENID, MOTES DE POLVO!" },
    ],
    rewards: { gold: 3000, xp: 400, firstGems: 200, gems: 15, materials: { esencia: 15, cristal: 5, pergamino: 5 } },
  },
  {
    id: "ev-1", chapter: 3, index: 1, name: "Eidolón Desbocado: Prueba del Festival", difficulty: "event",
    staminaCost: 12, recLevel: 18, bossName: "Eidolón Prime",
    enemies: [boss("Eidolón Prime", "lyra", "agua", 20, 3.0, 1.0), mob("Fragmento de Eidolón", "eira", "agua", 17), mob("Fragmento de Eidolón", "aurelia", "luz", 17)],
    dialogue: [
      { speaker: "Lyra", text: "Durante el Festival del Eclipse, los eidolones se desbordan. Es mi deber contenerlos." },
      { speaker: "Eidolón Prime", text: "◈ CANTO... DETECTADO... CONTENCIÓN... IMPOSIBLE ◈" },
      { speaker: "Lyra", text: "Nunca le digas imposible a una invocadora." },
    ],
    rewards: { gold: 2500, xp: 300, firstGems: 150, gems: 12, materials: { cristal: 4, esencia: 12 } },
  },
];

// Versiones difíciles generadas a partir de las normales
const HARD: MissionDef[] = MISSIONS.filter((m) => m.difficulty === "normal").map((m) => ({
  ...m,
  id: "h" + m.id,
  name: m.name + " [Difícil]",
  difficulty: "hard" as const,
  staminaCost: m.staminaCost + 4,
  recLevel: m.recLevel + 12,
  unlockAfter: m.id,
  enemies: m.enemies.map((e) => ({
    ...e,
    level: e.level + 14,
    hpMult: e.hpMult * 1.5,
    atkMult: e.atkMult * 1.25,
  })),
  dialogue: [
    { speaker: "Nexus", text: "Eco intensificado detectado. Los enemigos recuerdan vuestra victoria... y están furiosos." },
    ...m.dialogue.slice(-1),
  ],
  rewards: {
    gold: m.rewards.gold * 2,
    xp: m.rewards.xp * 2,
    firstGems: m.rewards.firstGems * 2,
    gems: m.rewards.gems * 2,
    materials: Object.fromEntries(Object.entries(m.rewards.materials).map(([k, v]) => [k, v * 2])),
  },
}));

export const ALL_MISSIONS: MissionDef[] = [...MISSIONS, ...HARD];
export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(
  ALL_MISSIONS.map((m) => [m.id, m])
);

export const CHAPTERS = [
  { id: 1, name: "El Nexus Despierto", desc: "Una grieta devora los tres mundos. Reúne a los primeros guardianes." },
  { id: 2, name: "Eclipse de los Tres Mundos", desc: "El Devorador muestra su verdadera forma. La alianza debe cruzar el puente." },
];