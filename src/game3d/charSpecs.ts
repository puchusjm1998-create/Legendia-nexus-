// Especificación visual de cada héroe para el generador de modelos 3D provisionales.
// Sustituir por modelos definitivos: ver src/game3d/models.ts (carga .glb por personaje).
export type HairStyle = "spiky" | "short" | "long" | "ponytail" | "twin" | "bald" | "hood" | "hat" | "wild" | "mohawk";
export type Weapon = "none" | "sword" | "katana" | "staff" | "spear" | "tome" | "gauntlets" | "dagger" | "hammer" | "fan" | "claws" | "orb";
export type Extra = "scarf" | "cape" | "wings" | "halo" | "horns" | "tiara" | "headband" | "mask" | "shoulders" | "skirt" | "robe" | "tail" | "shield" | "armor" | "crystals";

export interface CharVisual {
  skin: string; hair: string; hairStyle: HairStyle; eye: string;
  outfit: string; outfit2: string; trim: string; bottom: string; boots: string;
  weapon: Weapon; extras: Extra[];
  scale?: number; bulk?: number; // bulk: ensanchamiento del torso/extremidades
  weaponColor?: string;
}

export const CHAR_VISUALS: Record<string, CharVisual> = {
  kagero: { skin: "#f1c9a5", hair: "#2a1f3f", hairStyle: "spiky", eye: "#c4a1ff", outfit: "#2b2150", outfit2: "#6d45c9", trim: "#b18cff", bottom: "#1d1638", boots: "#120d26", weapon: "dagger", extras: ["scarf", "mask", "headband"], weaponColor: "#cbd5e1" },
  ryuen: { skin: "#f0bf98", hair: "#e4501f", hairStyle: "spiky", eye: "#ffb454", outfit: "#d6401c", outfit2: "#2b1a14", trim: "#ffd27a", bottom: "#3a2218", boots: "#2b1a14", weapon: "gauntlets", extras: ["headband", "shoulders"] },
  ayame: { skin: "#f5d3b5", hair: "#2fbf8a", hairStyle: "ponytail", eye: "#7dffc9", outfit: "#e8fff4", outfit2: "#2fbf8a", trim: "#a7f3d0", bottom: "#1f7a5c", boots: "#145c44", weapon: "fan", extras: ["headband", "skirt"] },
  raiko: { skin: "#efc7a2", hair: "#f4f1d8", hairStyle: "spiky", eye: "#fff06a", outfit: "#26304f", outfit2: "#ffd93c", trim: "#fff7a8", bottom: "#1a2036", boots: "#10151f", weapon: "katana", extras: ["scarf", "headband"], weaponColor: "#fff7a8" },
  mizuha: { skin: "#f6d6bd", hair: "#3b9de0", hairStyle: "long", eye: "#8fe3ff", outfit: "#e9f6ff", outfit2: "#4cc3ff", trim: "#a5e4ff", bottom: "#2a6fa8", boots: "#1b4d78", weapon: "staff", extras: ["robe", "tiara"], weaponColor: "#7dd3fc" },
  jin: { skin: "#e8bf9a", hair: "#16756a", hairStyle: "ponytail", eye: "#5ef2d6", outfit: "#2dd4bf", outfit2: "#134e4a", trim: "#ccfbf1", bottom: "#134e4a", boots: "#0b2e2b", weapon: "katana", extras: ["cape", "headband"], weaponColor: "#e0fff9" },
  kaion: { skin: "#f0c09a", hair: "#ffc83a", hairStyle: "spiky", eye: "#7ef5ff", outfit: "#ff8a1f", outfit2: "#1f3a8a", trim: "#fff1a8", bottom: "#ff8a1f", boots: "#1f3a8a", weapon: "gauntlets", extras: ["shoulders"], scale: 1.05 },
  sunna: { skin: "#f6d3b2", hair: "#ffe08a", hairStyle: "long", eye: "#ffd36a", outfit: "#fff3c4", outfit2: "#e9a93a", trim: "#ffffff", bottom: "#c98d27", boots: "#8a5d14", weapon: "spear", extras: ["shoulders", "skirt", "tiara"], weaponColor: "#fff3c4" },
  brodd: { skin: "#d8a47c", hair: "#2d2410", hairStyle: "mohawk", eye: "#ffe45a", outfit: "#6b5a1a", outfit2: "#eab308", trim: "#fde047", bottom: "#4b3f12", boots: "#2d2410", weapon: "hammer", extras: ["armor", "shoulders"], scale: 1.12, bulk: 1.3 },
  vex: { skin: "#eebd96", hair: "#c42a2a", hairStyle: "wild", eye: "#ffb0a0", outfit: "#f87171", outfit2: "#3b1010", trim: "#fecaca", bottom: "#3b1010", boots: "#240909", weapon: "gauntlets", extras: ["headband", "tail"], scale: 0.95 },
  kenji: { skin: "#f3cfae", hair: "#d9c27a", hairStyle: "bald", eye: "#fff3a8", outfit: "#fff3d6", outfit2: "#f59e0b", trim: "#fde68a", bottom: "#d97706", boots: "#92400e", weapon: "staff", extras: ["halo", "robe"], weaponColor: "#fde68a", scale: 0.92 },
  lyra: { skin: "#f8dcc6", hair: "#35c9e6", hairStyle: "long", eye: "#baf3ff", outfit: "#0f4c75", outfit2: "#67e8f9", trim: "#e0fbff", bottom: "#0b3552", boots: "#082a41", weapon: "staff", extras: ["tiara", "robe", "crystals"], weaponColor: "#67e8f9" },
  aurelia: { skin: "#f6d9c0", hair: "#ffe9a0", hairStyle: "long", eye: "#ffe27a", outfit: "#f7f3e3", outfit2: "#e0a92a", trim: "#fff6c9", bottom: "#c7922a", boots: "#a66f12", weapon: "sword", extras: ["wings", "halo", "armor", "shield"], weaponColor: "#fff6c9" },
  nocturne: { skin: "#d9cfe6", hair: "#6d4fb5", hairStyle: "hat", eye: "#d6b8ff", outfit: "#2b1d52", outfit2: "#7c3aed", trim: "#c4b5fd", bottom: "#1d1338", boots: "#120b25", weapon: "tome", extras: ["cape", "robe"], weaponColor: "#a78bfa" },
  ignar: { skin: "#c1503a", hair: "#2a0f0a", hairStyle: "wild", eye: "#ffd24a", outfit: "#3a1410", outfit2: "#ff6b35", trim: "#ffb27a", bottom: "#2a0f0a", boots: "#1b0907", weapon: "claws", extras: ["horns", "shoulders"], scale: 1.15, bulk: 1.25 },
  eira: { skin: "#f4e1e1", hair: "#9be8f2", hairStyle: "long", eye: "#c9f7ff", outfit: "#e6fbff", outfit2: "#7dd3fc", trim: "#ffffff", bottom: "#4aa8c9", boots: "#2d7a99", weapon: "staff", extras: ["tiara", "robe", "crystals"], weaponColor: "#cffafe", scale: 0.95 },
};

export const DEFAULT_VISUAL: CharVisual = {
  skin: "#f1c9a5", hair: "#444444", hairStyle: "short", eye: "#88ccff", outfit: "#556677", outfit2: "#99aabb",
  trim: "#ffffff", bottom: "#334455", boots: "#222233", weapon: "sword", extras: [],
};
