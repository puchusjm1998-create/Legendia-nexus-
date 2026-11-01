// ============================================================
// LEGENDIA NEXUS — Capítulos, Misiones, Diálogos y Encuentros
// Arco Narrativo: Despertar del Nexus & Convergencia Multiversal
// ============================================================
import type { EnemyDef } from "./combat";

export interface DialogLine {
  speaker: string;
  text: string;
  avatarKey?: string;
}

export interface MissionDef {
  id: string;
  chapter: number;
  chapterTitle: string;
  name: string;
  desc: string;
  staminaCost: number;
  enemies: EnemyDef[];
  dialogBefore?: DialogLine[];
  dialogAfter?: DialogLine[];
  rewardGems: number;
  rewardGold: number;
  rewardExp: number;
  rewardMaterials: Record<string, number>;
  difficulty?: "normal" | "hard" | "nightmare" | "event";
  recLevel?: number;
  index?: number;
  dialogue?: DialogLine[];
  rewards?: { gems: number; gold: number; exp: number; xp?: number; firstGems?: number; materials: Record<string, number> };
}

export const CHAPTERS = [
  { id: 1, title: "Capítulo 1: El Despertar del Nexus", name: "El Despertar del Nexus", desc: "El santuario ancestral despierta ante la inestabilidad de las líneas de energía." },
  { id: 2, title: "Capítulo 2: Fractura Dimensional — Cielos de Mako y Chakra", name: "Fractura Dimensional", desc: "Guerreros de mundos lejanos cruzan las grietas. Naruto y Lightning se encuentran en el campo de batalla." },
  { id: 3, title: "Capítulo 3: El Eclipse del Diez Colas y el Mako Oscuro", name: "El Eclipse del Diez Colas", desc: "Sephiroth y Madara buscan fusionar el Mako corrupto con el chakra del Diez Colas." },
];

export const ALL_MISSIONS: MissionDef[] = [
  // ==================== CAPÍTULO 1 ====================
  {
    id: "c1-1",
    chapter: 1,
    chapterTitle: "El Despertar del Nexus",
    name: "Sendas del Velo Astral",
    desc: "Primer contacto con las criaturas etéreas en las fronteras del Santuario.",
    staminaCost: 5,
    enemies: [
      { key: "umbra", name: "Sombra del Velo", level: 2 },
      { key: "ignis", name: "Espíritu Igneo Menor", level: 2 },
    ],
    dialogBefore: [
      { speaker: "Ryuen", text: "Invocador, la barrera del Santuario tiembla. Toma tu espada, debemos asegurar el perímetro.", avatarKey: "ryuen" },
      { speaker: "Ayame", text: "Percibo corrientes erráticas en el viento... esto no es una perturbación ordinaria.", avatarKey: "ayame" },
    ],
    dialogAfter: [
      { speaker: "Ryuen", text: "Bien peleado. Estas sombras sólo eran exploradores. Algo más grande se aproxima.", avatarKey: "ryuen" },
    ],
    rewardGems: 100,
    rewardGold: 1000,
    rewardExp: 80,
    rewardMaterials: { esencia: 5, pergamino: 2 },
  },
  {
    id: "c1-2",
    chapter: 1,
    chapterTitle: "El Despertar del Nexus",
    name: "Emboscada en el Bosque de Rocío",
    desc: "Una patrulla de sombras intenta cortar el suministro de agua sagrada.",
    staminaCost: 6,
    enemies: [
      { key: "aqua", name: "Elemental Corrupto", level: 4 },
      { key: "volt", name: "Chispa Rebelde", level: 4 },
      { key: "umbra", name: "Sombra Acechante", level: 5 },
    ],
    dialogBefore: [
      { speaker: "Mizuha", text: "¡Las fuentes astrales están perdiendo su pureza! El agua fluye con un tinte oscuro...", avatarKey: "mizuha" },
      { speaker: "Raiko", text: "Déjamelos a mí. Mis truenos limpiarán este bosque en un parpadeo.", avatarKey: "raiko" },
    ],
    rewardGems: 120,
    rewardGold: 1500,
    rewardExp: 100,
    rewardMaterials: { esencia: 8, cristal: 2 },
  },
  {
    id: "c1-3",
    chapter: 1,
    chapterTitle: "El Despertar del Nexus",
    name: "Prueba del Baluarte",
    desc: "El guardián Jin evalúa la resolución del invocador antes de avanzar a las profundidades.",
    staminaCost: 8,
    enemies: [
      { key: "terra", name: "Gólem de Granito", level: 7 },
      { key: "jin", name: "Jin (Prueba de Fuerza)", level: 8, boss: true },
    ],
    dialogBefore: [
      { speaker: "Jin", text: "Nadie pasa hacia la Cámara del Cristal sin demostrar que su defensa es inquebrantable.", avatarKey: "jin" },
    ],
    dialogAfter: [
      { speaker: "Jin", text: "Vuestro temple es sólido como la roca madre. Tenéis mi lealtad en esta contienda.", avatarKey: "jin" },
    ],
    rewardGems: 150,
    rewardGold: 2200,
    rewardExp: 140,
    rewardMaterials: { cristal: 4, pergamino: 5, stardust: 2 },
  },
  {
    id: "c1-4",
    chapter: 1,
    chapterTitle: "El Despertar del Nexus",
    name: "La Sombra del Vacío",
    desc: "El segador Kaion emerge del eclipse para reclamar la energía del Nexus.",
    staminaCost: 10,
    enemies: [
      { key: "umbra", name: "Segador Menor", level: 10 },
      { key: "kaion", name: "Kaion el Segador", level: 12, boss: true },
    ],
    dialogBefore: [
      { speaker: "Kagero", text: "¡Cuidado! Kaion se alimenta de la desesperación. No dudéis ni un instante.", avatarKey: "kagero" },
      { speaker: "Kaion", text: "Este mundo pronto dormirá en una noche sin estrellas...", avatarKey: "kaion" },
    ],
    dialogAfter: [
      { speaker: "Kaion", text: "Interesante... pero mirad al cielo: la fractura dimensional ya ha comenzado.", avatarKey: "kaion" },
    ],
    rewardGems: 200,
    rewardGold: 3000,
    rewardExp: 200,
    rewardMaterials: { cristal: 6, mako_crystal: 3, residual_chakra: 5 },
  },

  // ==================== CAPÍTULO 2 ====================
  {
    id: "c2-1",
    chapter: 2,
    chapterTitle: "Fractura Dimensional: Cielos de Mako y Chakra",
    name: "Cielos Rasgados",
    desc: "Una distorsión espacio-temporal abre vórtices de energía verde esmeralda y chakra dorado.",
    staminaCost: 10,
    enemies: [
      { key: "umbra", name: "Aberración Dimensional", level: 14 },
      { key: "mecha_naruto", name: "Prototipo Mecha-Naruto", level: 15, boss: true },
    ],
    dialogBefore: [
      { speaker: "Ryuen", text: "¿Qué es esta energía? No es maná astral... ¡se siente viva, ardiente y a la vez tecnológica!", avatarKey: "ryuen" },
      { speaker: "Mecha-Naruto", text: "¡ALERTA! DETECTADA INTERFERENCIA DE DIMENSIÓN DESCONOCIDA. OBJETIVO: ABSORBER CHAKRA.", avatarKey: "mecha_naruto" },
    ],
    dialogAfter: [
      { speaker: "Mecha-Naruto", text: "SISTEMA SOBRECALENTADO... INVOCADOR IDENTIFICADO COMO ALIADO POTENCIAL.", avatarKey: "mecha_naruto" },
    ],
    rewardGems: 180,
    rewardGold: 3500,
    rewardExp: 220,
    rewardMaterials: { residual_chakra: 10, mako_crystal: 5, attire_sphere: 1 },
  },
  {
    id: "c2-2",
    chapter: 2,
    chapterTitle: "Fractura Dimensional: Cielos de Mako y Chakra",
    name: "Encuentro de Dos Mundos",
    desc: "Naruto y Lightning aparecen en el Nexus tras ser arrastrados por una anomalía cósmica.",
    staminaCost: 12,
    enemies: [
      { key: "shino_dr", name: "Shinō (Sombra del Cielo)", level: 17, boss: true },
      { key: "volt", name: "Centella Resonante", level: 16 },
    ],
    dialogBefore: [
      { speaker: "Naruto", text: "¡¿Dónde demonios estoy?! Estaba en medio del entrenamiento en Konoha y de repente... ¡todo el cielo se volvió cristal!", avatarKey: "naruto" },
      { speaker: "Lightning", text: "Tranquilízate, chico del chándal. Esto parece una convergencia de planos. Mi sable pistola reacciona a una corriente similar al Mako.", avatarKey: "lightning" },
      { speaker: "Naruto", text: "¿Chico? ¡Soy Naruto Uzumaki, el próximo Hokage! Aunque... esa espada tuya mola un montón.", avatarKey: "naruto" },
      { speaker: "Lightning", text: "Guarda la charla. Vienen enemigos hacia nosotros. Luchemos juntos y luego buscaremos respuestas.", avatarKey: "lightning" },
    ],
    dialogAfter: [
      { speaker: "Lightning", text: "Te mueves bien, Naruto. Tu energía... no es magia, pero tiene una potencia descomunal.", avatarKey: "lightning" },
      { speaker: "Naruto", text: "¡Jejeje, es el poder de la Voluntad de Fuego! Oye, Invocador, ¡cuenta con nosotros para proteger este Nexus!", avatarKey: "naruto" },
    ],
    rewardGems: 250,
    rewardGold: 4500,
    rewardExp: 280,
    rewardMaterials: { mako_crystal: 8, residual_chakra: 12, crystal_fragment: 4 },
  },
  {
    id: "c2-3",
    chapter: 2,
    chapterTitle: "Fractura Dimensional: Cielos de Mako y Chakra",
    name: "La Sombra de Masamune",
    desc: "Sasuke investiga un sendero de árboles calcinados por fuego oscuro y energía celestial.",
    staminaCost: 14,
    enemies: [
      { key: "noel", name: "Noel (Poseído por la Grieta)", level: 19 },
      { key: "sasuke", name: "Sasuke Uchiha (Reflejo del Rinnegan)", level: 21, boss: true },
    ],
    dialogBefore: [
      { speaker: "Sasuke", text: "Ese rastro de plumas negras... no pertenece a Itachi. Hay alguien más manipulando la oscuridad en este reino.", avatarKey: "sasuke" },
      { speaker: "Kagero", text: "Te reconozco, Sasuke. Tu mirada tiene la frialdad de quien ha visto el abismo.", avatarKey: "kagero" },
      { speaker: "Sasuke", text: "Si os interponéis, os cortaré. Debo encontrar al portador de la espada larga.", avatarKey: "sasuke" },
    ],
    dialogAfter: [
      { speaker: "Sasuke", text: "Entiendo... estáis luchando por la estabilidad del Cristal. Aceptaré vuestra tregua.", avatarKey: "sasuke" },
    ],
    rewardGems: 300,
    rewardGold: 5000,
    rewardExp: 320,
    rewardMaterials: { residual_chakra: 15, stardust: 4, attire_sphere: 2 },
  },
  {
    id: "c2-4",
    chapter: 2,
    chapterTitle: "Fractura Dimensional: Cielos de Mako y Chakra",
    name: "Estrategia de Valhalla y Konoha",
    desc: "Kakashi y Lightning establecen un perímetro defensivo contra una oleada de sombras híbridas.",
    staminaCost: 14,
    enemies: [
      { key: "mecha_naruto", name: "Guardia Bijuu Mecánica", level: 20 },
      { key: "kakashi", name: "Kakashi Hatake (Simulación Táctica)", level: 22, boss: true },
    ],
    dialogBefore: [
      { speaker: "Kakashi", text: "Vaya, parece que nos hemos metido en un buen lío. Lightning, tus tácticas militares recuerdan a los escuadrones ANBU.", avatarKey: "kakashi" },
      { speaker: "Lightning", text: "Fui sargento en el Cuerpo de la Guardia. Concentrémonos: si combinamos tu elemento rayo con mi sobremarcha, cerraremos la brecha.", avatarKey: "lightning" },
    ],
    dialogAfter: [
      { speaker: "Kakashi", text: "Excelente coordinación. El Diez Colas y el Mako corrupto están resonando en el corazón del santuario.", avatarKey: "kakashi" },
    ],
    rewardGems: 320,
    rewardGold: 5500,
    rewardExp: 350,
    rewardMaterials: { mako_crystal: 10, residual_chakra: 15, biju_fragment: 3 },
  },

  // ==================== CAPÍTULO 3 ====================
  {
    id: "c3-1",
    chapter: 3,
    chapterTitle: "El Eclipse del Diez Colas y el Mako Oscuro",
    name: "El Espejo de las Sombras",
    desc: "Menma Oscuro desata el poder del Kurama Negro junto al vórtice del Mako.",
    staminaCost: 16,
    enemies: [
      { key: "shino_dr", name: "Shinō Reibi", level: 23 },
      { key: "menma", name: "Menma Oscuro", level: 25, boss: true },
    ],
    dialogBefore: [
      { speaker: "Menma", text: "¿Crees que tu mundo de ilusiones puede detener el Dai Rasenringu? El Nexus renacerá bajo mi voluntad.", avatarKey: "menma" },
      { speaker: "Naruto", text: "¡Eres idéntico a mí, pero tu corazón está vacío! ¡No permitiré que destruyas este hogar!", avatarKey: "naruto" },
    ],
    dialogAfter: [
      { speaker: "Menma", text: "Agh... la luz de ese Cristal... quema mis sombras...", avatarKey: "menma" },
    ],
    rewardGems: 350,
    rewardGold: 6000,
    rewardExp: 400,
    rewardMaterials: { biju_fragment: 5, mako_crystal: 12, nexus_coins: 100 },
  },
  {
    id: "c3-2",
    chapter: 3,
    chapterTitle: "El Eclipse del Diez Colas y el Mako Oscuro",
    name: "El Despertar del Ángel",
    desc: "Sephiroth desciende en el centro del vórtice, empuñando la Masamune impregnada de chakra corrupto.",
    staminaCost: 18,
    enemies: [
      { key: "cloud", name: "Cloud (Sombra del Pasado)", level: 26 },
      { key: "sephiroth", name: "Sephiroth (El Ángel de una Sola Ala)", level: 28, boss: true },
    ],
    dialogBefore: [
      { speaker: "Cloud", text: "¡Sephiroth! ¡Aléjate del Cristal del Nexus!", avatarKey: "cloud" },
      { speaker: "Sephiroth", text: "Los recuerdos nunca mueren, Cloud. Este cristal no sólo alimenta este mundo... alimentará el navío de Jenova por toda la eternidad.", avatarKey: "sephiroth" },
      { speaker: "Sasuke", text: "Tu arrogancia me recuerda a Madara. Deja que el Amaterasu consuma tu ala.", avatarKey: "sasuke" },
    ],
    dialogAfter: [
      { speaker: "Sephiroth", text: "Habéis luchado con valentía. Pero el Diez Colas ya ha absorbido el Mako Primordial...", avatarKey: "sephiroth" },
    ],
    rewardGems: 450,
    rewardGold: 8000,
    rewardExp: 500,
    rewardMaterials: { mako_crystal: 15, stardust: 8, biju_fragment: 5, nexus_coins: 150 },
  },
  {
    id: "c3-3",
    chapter: 3,
    chapterTitle: "El Eclipse del Diez Colas y el Mako Oscuro",
    name: "Convergencia Final: El Núcleo de los Mundos",
    desc: "Madara Rikudou y la quimera del Diez Colas amenazan con colapsar los tres universos en el vacío.",
    staminaCost: 20,
    enemies: [
      { key: "madara", name: "Madara Uchiha (Seis Caminos)", level: 30, boss: true },
      { key: "clive", name: "Manifestación Ifrit Corrupto", level: 29 },
    ],
    dialogBefore: [
      { speaker: "Madara", text: "Bailad para mí, héroes de todos los mundos. El Tsukuyomi Infinito abarcará cada estrella del Nexus.", avatarKey: "madara" },
      { speaker: "Lightning", text: "Los dioses ya intentaron gobernarnos una vez, Madara. No nos inclinaremos ante nadie.", avatarKey: "lightning" },
      { speaker: "Naruto", text: "¡Modo Barion listo! ¡Lightning, Cloud, Sasuke, Invocador... ataquemos con todo lo que tenemos!", avatarKey: "naruto" },
    ],
    dialogAfter: [
      { speaker: "Naruto", text: "¡Lo conseguimos! La grieta está sanando. Los tres universos siguen conectados, pero en armonía.", avatarKey: "naruto" },
      { speaker: "Lightning", text: "Siempre que el Nexus nos necesite, responderemos a tu llamada, Invocador.", avatarKey: "lightning" },
      { speaker: "Ryuen", text: "Nuestra leyenda no ha hecho más que empezar. ¡Larga vida a la convergencia del Nexus!", avatarKey: "ryuen" },
    ],
    rewardGems: 600,
    rewardGold: 12000,
    rewardExp: 750,
    rewardMaterials: { stardust: 15, mako_crystal: 20, biju_fragment: 10, attire_sphere: 5, nexus_coins: 300 },
  },

  // ==================== EVENTOS ESPECIALES ====================
  {
    id: "ev-1",
    chapter: 99,
    chapterTitle: "Eventos Especiales",
    name: "Festival del Eclipse y el Eidolón",
    desc: "Supera la prueba del Eidolón Prime para ganar recompensas festivas y polvo de estrellas.",
    staminaCost: 10,
    enemies: [
      { key: "aurelia", name: "Valquiria de la Prueba", level: 15 },
      { key: "lyra", name: "Eidolón Prime", level: 18, boss: true },
    ],
    rewardGems: 250,
    rewardGold: 5000,
    rewardExp: 300,
    rewardMaterials: { stardust: 8, crystal_fragment: 6, nexus_coins: 100 },
  },
  {
    id: "ev-2",
    chapter: 99,
    chapterTitle: "Eventos Especiales",
    name: "Expedición a las Ruinas de Mako Shinobi",
    desc: "Enfrentamiento contra sombras mecánicas y saqueo de cristales de Mako de alta pureza.",
    staminaCost: 12,
    enemies: [
      { key: "mecha_naruto", name: "Centinela Mako", level: 22 },
      { key: "noel", name: "Guardián Cronos", level: 24, boss: true },
    ],
    rewardGems: 300,
    rewardGold: 6000,
    rewardExp: 350,
    rewardMaterials: { mako_crystal: 12, residual_chakra: 12, attire_sphere: 3 },
  },
];

ALL_MISSIONS.forEach((m, idx) => {
  m.index = m.index ?? (idx + 1);
  m.recLevel = m.recLevel ?? Math.max(1, Math.min(...m.enemies.map((e) => e.level)));
  m.difficulty = m.difficulty ?? (m.id.startsWith("ev-") ? "event" : m.chapter === 1 ? "normal" : m.chapter === 2 ? "hard" : "nightmare");
  m.dialogue = m.dialogue ?? (m.dialogBefore || []);
  m.rewards = m.rewards ?? {
    gems: m.rewardGems,
    gold: m.rewardGold,
    exp: m.rewardExp,
    xp: m.rewardExp,
    firstGems: m.rewardGems * 2,
    materials: m.rewardMaterials || {},
  };
  m.enemies.forEach((e) => {
    if (!e.charKey) e.charKey = e.key;
  });
});

export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(
  ALL_MISSIONS.map((m) => [m.id, m])
);
