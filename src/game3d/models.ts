// Fábrica de personajes 3D. Por defecto usa el modelo procedural provisional (rig.ts).
// Si `public/models/models.json` declara un .glb para el personaje, se carga en segundo
// plano y sustituye al provisional cuando está listo (si falla, se queda el provisional).
//
//   { "characters": { "ayame": { "url": "/models/ayame.glb", "scale": 1, "yaw": 0 } } }
//
// Las animaciones del .glb se enlazan por nombre (idle, run, attack/melee, shoot, skill,
// ultCharge, ultRelease, hit, guard, buff, heal, defeat, victory, stun, intro).
import * as THREE from "three";
import { CLIPS, type ClipName } from "./anim";
import { createProceduralRig, type CharacterRig, type RigOptions } from "./rig";

export type { CharacterRig, RigOptions };

interface ModelEntry { url: string; scale?: number; yaw?: number; height?: number }
let manifest: Promise<Record<string, ModelEntry>> | null = null;
function loadManifest() {
  manifest ??= fetch("/models/models.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : { characters: {} }))
    .then((j) => {
      const out: Record<string, ModelEntry> = {};
      for (const [k, v] of Object.entries((j?.characters ?? {}) as Record<string, string | ModelEntry>)) out[k] = typeof v === "string" ? { url: v } : v;
      return out;
    })
    .catch(() => ({}));
  return manifest;
}

const ALIASES: Record<ClipName, string[]> = {
  idle: ["idle", "stand"], run: ["run", "walk", "move"], melee: ["melee", "attack", "attack1", "punch", "slash"],
  shoot: ["shoot", "cast", "attack2", "range"], skill: ["skill", "special", "skill1"], ultCharge: ["ultcharge", "charge", "ult_charge"],
  ultRelease: ["ultrelease", "ultimate", "ult", "ult_release"], hit: ["hit", "damage", "hurt"], guard: ["guard", "defend", "block"],
  buff: ["buff", "powerup"], heal: ["heal", "support"], defeat: ["defeat", "death", "die", "dead"],
  victory: ["victory", "win", "celebrate"], stun: ["stun", "dizzy"], intro: ["intro", "appear", "spawn", "entrance"],
};

class GltfRig implements CharacterRig {
  root = new THREE.Group();
  height: number;
  hand: THREE.Object3D; head: THREE.Object3D; chest: THREE.Object3D;
  clip: ClipName = "idle";
  private mixer: THREE.AnimationMixer;
  private actions = new Map<ClipName, THREE.AnimationAction>();
  private cur: THREE.AnimationAction | null = null;
  private mats: THREE.MeshStandardMaterial[] = [];
  constructor(scene: THREE.Object3D, anims: THREE.AnimationClip[], e: ModelEntry) {
    const inner = new THREE.Group(); inner.add(scene); this.root.add(inner);
    inner.scale.setScalar(e.scale ?? 1); inner.rotation.y = e.yaw ?? 0;
    const box = new THREE.Box3().setFromObject(inner);
    this.height = e.height ?? Math.max(1, box.max.y - box.min.y);
    let hand: THREE.Object3D | null = null, head: THREE.Object3D | null = null, chest: THREE.Object3D | null = null;
    scene.traverse((o) => {
      const n = o.name.toLowerCase();
      if (!hand && /(hand.*(r|right)|(r|right).*hand|weapon)/.test(n)) hand = o;
      if (!head && /head/.test(n)) head = o;
      if (!chest && /(chest|spine2|spine1|upperchest)/.test(n)) chest = o;
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material) {
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        for (const mm of Array.isArray(m.material) ? m.material : [m.material]) this.mats.push(mm as THREE.MeshStandardMaterial);
      }
    });
    this.hand = hand ?? this.mk(0.4, this.height * 0.5); this.head = head ?? this.mk(0, this.height * 0.95); this.chest = chest ?? this.mk(0, this.height * 0.6);
    this.mixer = new THREE.AnimationMixer(scene);
    for (const c of Object.keys(ALIASES) as ClipName[]) {
      const found = anims.find((a) => ALIASES[c].includes(a.name.toLowerCase().replace(/[^a-z0-9_]/g, "")))
        ?? anims.find((a) => ALIASES[c].some((al) => a.name.toLowerCase().includes(al)));
      if (found) {
        const act = this.mixer.clipAction(found);
        act.setLoop(CLIPS[c].loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); act.clampWhenFinished = true;
        this.actions.set(c, act);
      }
    }
  }
  private mk(x: number, y: number) { const g = new THREE.Group(); g.position.set(x, y, 0); this.root.add(g); return g; }
  private pick(c: ClipName) {
    return this.actions.get(c) ?? (c === "shoot" || c === "skill" ? this.actions.get("melee") : undefined)
      ?? (c === "ultCharge" || c === "ultRelease" || c === "buff" || c === "heal" ? this.actions.get("skill") ?? this.actions.get("melee") : undefined)
      ?? this.actions.get("idle");
  }
  play(c: ClipName, blend = 0.12) {
    this.clip = c;
    const a = this.pick(c); if (!a) return;
    a.reset().play();
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, blend, false);
    else a.fadeIn(blend);
    this.cur = a;
  }
  clipTime() { return this.cur?.time ?? 0; }
  clipDuration(c: ClipName) { return this.pick(c)?.getClip().duration ?? CLIPS[c].dur; }
  impactTime(c: ClipName) { return (CLIPS[c].impact ?? CLIPS[c].dur * 0.5) * (this.clipDuration(c) / CLIPS[c].dur); }
  update(dt: number) { this.mixer.update(dt); }
  setFlash(f: number) { for (const m of this.mats) m.emissive?.setRGB(f, f, f); }
  setFade(f: number) { for (const m of this.mats) { m.transparent = f < 1; m.opacity = f; } }
  setCorrupted(on: boolean) { for (const m of this.mats) m.color?.set(on ? 0xb7a0d6 : 0xffffff); }
  dispose() { this.mixer.stopAllAction(); for (const m of this.mats) m.dispose(); }
}

export function createRig(charKey: string, opts: RigOptions, onReal?: (rig: CharacterRig) => void): CharacterRig {
  const proc = createProceduralRig(charKey, opts);
  if (onReal) {
    loadManifest().then(async (m) => {
      const e = m[charKey]; if (!e) return;
      try {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { clone } = await import("three/examples/jsm/utils/SkeletonUtils.js");
        const gltf = await new GLTFLoader().loadAsync(e.url);
        const rig = new GltfRig(clone(gltf.scene), gltf.animations, e);
        rig.setCorrupted(!!opts.corrupted);
        onReal(rig);
      } catch (err) { console.warn(`[models] no se pudo cargar ${e.url}; se mantiene el modelo provisional`, err); }
    });
  }
  return proc;
}
