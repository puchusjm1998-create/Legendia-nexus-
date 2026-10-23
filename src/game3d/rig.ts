// Generador de modelos 3D provisionales: héroes chibi de estilo anime construidos con
// primitivas, esqueleto articulado (jerarquía de articulaciones) y cel-shading.
// Interfaz CharacterRig: la misma que usa el cargador de modelos .glb definitivos.
import * as THREE from "three";
import { CHAR_VISUALS, DEFAULT_VISUAL, type CharVisual } from "./charSpecs";
import {
  GeoBuilder, box, cap, cone, cyl, glowVertexMaterial, outlineMaterial, shade, sph, toonVertexMaterial, tor,
} from "./toon";
import { CLIPS, POSE_KEYS, REST, lerpPose, samplePose, type ClipName, type Pose } from "./anim";

export interface CharacterRig {
  root: THREE.Group;
  height: number;
  hand: THREE.Object3D;
  head: THREE.Object3D;
  chest: THREE.Object3D;
  readonly clip: ClipName;
  play(clip: ClipName, blend?: number): void;
  clipTime(): number;
  clipDuration(c: ClipName): number;
  impactTime(c: ClipName): number;
  update(dt: number): void;
  setFlash(f: number): void;
  setFade(f: number): void;
  setCorrupted(on: boolean): void;
  dispose(): void;
}

export interface RigOptions { quality: "high" | "low"; transformed?: boolean; corrupted?: boolean }

const J = (parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

export class ProceduralRig implements CharacterRig {
  root = new THREE.Group();
  height = 2.1;
  hand!: THREE.Object3D;
  head!: THREE.Object3D;
  chest!: THREE.Object3D;
  clip: ClipName = "idle";

  private body!: THREE.Group; private spine!: THREE.Group;
  private armL!: THREE.Group; private elbowL!: THREE.Group;
  private armR!: THREE.Group; private elbowR!: THREE.Group;
  private legL!: THREE.Group; private kneeL!: THREE.Group;
  private legR!: THREE.Group; private kneeR!: THREE.Group;
  private mat: THREE.MeshToonMaterial;
  private geos: THREE.BufferGeometry[] = [];
  private t = 0;
  private cur: Required<Pose> = { ...REST };
  private from: Required<Pose> = { ...REST };
  private blendT = 1; private blendDur = 0.12;
  private extras: { obj: THREE.Object3D; fn: (t: number) => void }[] = [];
  private shadowMat?: THREE.MeshBasicMaterial;

  constructor(private v: CharVisual, private opts: RigOptions) {
    this.mat = toonVertexMaterial().clone();
    this.build();
    this.root.scale.setScalar((v.scale ?? 1) * (opts.transformed ? 1.07 : 1));
    this.setCorrupted(!!opts.corrupted);
  }

  private mesh(parent: THREE.Object3D, gb: GeoBuilder, glow = false): THREE.Mesh | null {
    const geo = gb.build();
    if (!geo) return null;
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, glow ? glowVertexMaterial() : this.mat);
    parent.add(m);
    if (!glow && this.opts.quality === "high") {
      const o = new THREE.Mesh(geo, outlineMaterial(0.02));
      parent.add(o);
    }
    return m;
  }

  private build() {
    const v = this.v;
    const bulk = v.bulk ?? 1;
    const body = (this.body = J(this.root));
    const hips = J(body, 0, 0.62, 0);
    const spine = (this.spine = J(hips, 0, 0.02, 0));
    this.chest = J(spine, 0, 0.3, 0);

    // ---- blob de sombra
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20),
      (this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.015;
    this.root.add(sh);
    this.geos.push(sh.geometry);

    // ---- cadera / falda
    {
      const gb = new GeoBuilder();
      gb.add(cyl(0.22 * bulk, 0.2 * bulk, 0.2, 10), { p: [0, 0.0, 0], c: v.bottom });
      if (v.extras.includes("skirt")) gb.add(cone(0.42, 0.42, 12), { p: [0, -0.2, 0], r: [Math.PI, 0, 0], c: v.outfit2 }).add(tor(0.3, 0.03), { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
      if (v.extras.includes("robe")) gb.add(cone(0.5, 0.78, 12), { p: [0, -0.33, 0], r: [Math.PI, 0, 0], c: v.outfit }).add(tor(0.46, 0.025), { p: [0, -0.7, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
      this.mesh(hips, gb);
    }
    // ---- torso
    {
      const gb = new GeoBuilder();
      gb.add(cyl(0.25 * bulk, 0.21 * bulk, 0.56, 10), { p: [0, 0.28, 0], c: v.outfit });
      gb.add(cyl(0.255 * bulk, 0.255 * bulk, 0.09, 10), { p: [0, 0.03, 0], c: v.outfit2 });          // cinturón
      gb.add(box(0.1, 0.1, 0.03), { p: [0, 0.03, 0.25 * bulk], c: v.trim });                          // hebilla
      gb.add(box(0.08, 0.5, 0.02), { p: [0, 0.3, 0.23 * bulk], c: v.outfit2 });                       // banda frontal
      gb.add(cyl(0.12, 0.14, 0.1, 8), { p: [0, 0.6, 0], c: v.skin });                                  // cuello
      if (v.extras.includes("armor")) {
        gb.add(cyl(0.27 * bulk, 0.23 * bulk, 0.38, 10), { p: [0, 0.34, 0.015], c: v.outfit2 });
        gb.add(tor(0.22 * bulk, 0.025), { p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
      }
      if (v.extras.includes("shoulders")) {
        gb.add(sph(0.16 * bulk, 10, 8), { p: [0.33 * bulk, 0.54, 0], s: [1, 0.7, 1], c: v.outfit2 });
        gb.add(sph(0.16 * bulk, 10, 8), { p: [-0.33 * bulk, 0.54, 0], s: [1, 0.7, 1], c: v.outfit2 });
      }
      if (v.extras.includes("scarf")) {
        gb.add(tor(0.17, 0.065), { p: [0, 0.58, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
        gb.add(box(0.14, 0.5, 0.035), { p: [0.1, 0.42, -0.26], r: [0.15, 0, 0.1], c: v.trim });
      }
      this.mesh(spine, gb);
    }
    // ---- cabeza
    const head = (this.head = J(spine, 0, 0.66, 0));
    {
      const gb = new GeoBuilder();
      gb.add(sph(0.42, 16, 12), { p: [0, 0.34, 0], s: [1, 0.96, 0.98], c: v.skin });
      gb.add(sph(0.045, 6, 5), { p: [0, 0.3, 0.41], s: [1, 0.8, 0.7], c: shade(v.skin, 0.9) });     // nariz
      gb.add(box(0.07, 0.015, 0.01), { p: [0, 0.16, 0.405], c: "#7a3b3b" });                          // boca
      for (const sx of [-1, 1]) {
        gb.add(sph(0.095, 10, 8), { p: [sx * 0.17, 0.33, 0.35], s: [0.95, 1.35, 0.35], c: "#ffffff" });
        gb.add(sph(0.068, 10, 8), { p: [sx * 0.17, 0.32, 0.372], s: [1, 1.3, 0.3], c: v.eye });
        gb.add(sph(0.035, 8, 6), { p: [sx * 0.17, 0.31, 0.384], s: [1, 1.3, 0.3], c: "#10131f" });
        gb.add(sph(0.018, 6, 5), { p: [sx * 0.15, 0.36, 0.392], c: "#ffffff" });
        gb.add(box(0.15, 0.025, 0.02), { p: [sx * 0.17, 0.46, 0.34], r: [0, 0, sx * -0.18], c: shade(v.hair, 0.6) }); // ceja
        gb.add(sph(0.05, 6, 5), { p: [sx * 0.3, 0.2, 0.28], s: [1, 0.6, 0.3], c: "#f4a3a3" });        // mejilla
      }
      // orejas
      gb.add(sph(0.07, 6, 5), { p: [0.41, 0.3, 0], s: [0.5, 1, 0.8], c: v.skin }).add(sph(0.07, 6, 5), { p: [-0.41, 0.3, 0], s: [0.5, 1, 0.8], c: v.skin });
      this.mesh(head, gb);
      this.buildHair(head);
    }
    // ---- brazos
    for (const side of [-1, 1] as const) {
      const shoulder = J(spine, side * 0.33 * bulk, 0.5, 0);
      const elbow = J(shoulder, 0, -0.27, 0);
      const gb = new GeoBuilder();
      gb.add(cyl(0.085 * bulk, 0.075 * bulk, 0.3, 8), { p: [0, -0.13, 0], c: v.outfit });
      gb.add(sph(0.09 * bulk, 8, 6), { p: [0, 0.0, 0], c: v.outfit2 });
      this.mesh(shoulder, gb);
      const gb2 = new GeoBuilder();
      gb2.add(cyl(0.07 * bulk, 0.065 * bulk, 0.28, 8), { p: [0, -0.12, 0], c: v.skin });
      gb2.add(cyl(0.08 * bulk, 0.08 * bulk, 0.1, 8), { p: [0, -0.07, 0], c: v.outfit2 });              // muñequera
      gb2.add(sph(0.085 * (v.weapon === "gauntlets" ? 1.7 : 1), 8, 6), { p: [0, -0.3, 0], c: v.weapon === "gauntlets" ? v.outfit2 : v.skin });
      this.mesh(elbow, gb2);
      const hand = J(elbow, 0, -0.3, 0);
      if (side === 1) { this.armL = shoulder; this.elbowL = elbow; } else { this.armR = shoulder; this.elbowR = elbow; this.hand = hand; }
      if (side === -1) this.buildWeapon(hand);
      if (side === 1 && v.extras.includes("shield")) this.buildShield(hand);
    }
    // ---- piernas
    for (const side of [-1, 1] as const) {
      const leg = J(hips, side * 0.13 * bulk, -0.02, 0);
      const knee = J(leg, 0, -0.3, 0);
      const gb = new GeoBuilder();
      gb.add(cyl(0.1 * bulk, 0.085 * bulk, 0.32, 8), { p: [0, -0.14, 0], c: v.bottom });
      this.mesh(leg, gb);
      const gb2 = new GeoBuilder();
      gb2.add(cyl(0.085 * bulk, 0.075 * bulk, 0.3, 8), { p: [0, -0.14, 0], c: v.bottom });
      gb2.add(cyl(0.1 * bulk, 0.09 * bulk, 0.16, 8), { p: [0, -0.2, 0], c: v.boots });
      gb2.add(box(0.15 * bulk, 0.09, 0.26), { p: [0, -0.285, 0.04], c: v.boots });
      this.mesh(knee, gb2);
      if (side === 1) { this.legL = leg; this.kneeL = knee; } else { this.legR = leg; this.kneeR = knee; }
    }
    // ---- extras de espalda / cabeza
    this.buildBack(spine, head);
    this.height = 2.1 * (v.scale ?? 1);
  }

  private buildHair(head: THREE.Object3D) {
    const v = this.v, hc = v.hair, hd = shade(v.hair, 0.78);
    const gb = new GeoBuilder();
    const capGeo = () => new THREE.SphereGeometry(0.46, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const fringe = (n = 5, h = 0.22) => {
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.5;
        gb.add(cone(0.075, h, 5), { p: [Math.sin(a) * 0.36, 0.62 - Math.abs(a) * 0.12, Math.cos(a) * 0.36], r: [Math.PI * 0.85, 0, -a * 0.6], c: hc });
      }
    };
    const st = v.hairStyle;
    if (st !== "bald" && st !== "hood" && st !== "hat" && st !== "mohawk") gb.add(capGeo(), { p: [0, 0.34, -0.015], s: [1, 0.98, 1], c: hc });
    switch (st) {
      case "spiky": {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          gb.add(cone(0.14, 0.5 + (i % 3) * 0.1, 6), { p: [Math.sin(a) * 0.26, 0.74, Math.cos(a) * 0.26 - 0.04], r: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], c: i % 2 ? hc : hd });
        }
        gb.add(cone(0.15, 0.62, 6), { p: [0, 0.9, 0], c: hc });
        fringe(5, 0.3);
        break;
      }
      case "wild": {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          gb.add(cone(0.12, 0.45, 5), { p: [Math.sin(a) * 0.3, 0.64, Math.cos(a) * 0.3 - 0.08], r: [Math.cos(a) * 0.9 + 0.2, 0, -Math.sin(a) * 0.9], c: i % 2 ? hc : hd });
        }
        fringe(5, 0.28);
        break;
      }
      case "short": fringe(5, 0.2); break;
      case "long": {
        fringe(5, 0.24);
        gb.add(cyl(0.34, 0.2, 0.95, 10), { p: [0, -0.15, -0.17], c: hc });
        gb.add(cyl(0.07, 0.04, 0.6, 6), { p: [0.4, 0.05, 0.1], c: hc }).add(cyl(0.07, 0.04, 0.6, 6), { p: [-0.4, 0.05, 0.1], c: hc });
        break;
      }
      case "ponytail": {
        fringe(5, 0.22);
        gb.add(sph(0.08, 6, 5), { p: [0, 0.6, -0.4], c: v.trim });
        gb.add(cone(0.14, 0.9, 7), { p: [0, 0.2, -0.55], r: [-2.7, 0, 0], c: hc });
        break;
      }
      case "twin": {
        fringe(5, 0.22);
        for (const s of [-1, 1]) gb.add(cone(0.14, 0.85, 7), { p: [s * 0.46, 0.08, -0.1], r: [0, 0, s * 0.2 + Math.PI], c: hc });
        break;
      }
      case "mohawk": {
        for (let i = 0; i < 5; i++) gb.add(cone(0.12, 0.42, 6), { p: [0, 0.78 - Math.abs(i - 2) * 0.05, -0.2 + i * 0.1], c: hc });
        gb.add(capGeo(), { p: [0, 0.34, -0.02], s: [1, 0.97, 1], c: shade(hc, 0.9) });
        break;
      }
      case "hat": {
        gb.add(cyl(0.62, 0.62, 0.05, 14), { p: [0, 0.62, 0], c: v.outfit });
        gb.add(cone(0.4, 0.8, 10), { p: [0, 1.05, -0.04], r: [-0.1, 0, 0], c: v.outfit });
        gb.add(tor(0.4, 0.04), { p: [0, 0.68, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
        gb.add(capGeo(), { p: [0, 0.3, -0.03], c: hc });
        fringe(4, 0.18);
        break;
      }
      case "hood": gb.add(sph(0.5, 12, 8), { p: [0, 0.36, -0.06], c: v.outfit }); break;
      case "bald": break;
    }
    const ex = v.extras;
    if (ex.includes("headband")) gb.add(tor(0.42, 0.035), { p: [0, 0.52, 0.0], r: [Math.PI / 2 + 0.12, 0, 0], c: "#2e3a59" }).add(box(0.2, 0.12, 0.03), { p: [0, 0.52, 0.43], r: [-0.12, 0, 0], c: "#cbd5e1" });
    if (ex.includes("mask")) gb.add(box(0.42, 0.17, 0.05), { p: [0, 0.14, 0.38], r: [0.1, 0, 0], c: v.outfit });
    if (ex.includes("tiara")) {
      gb.add(tor(0.4, 0.025), { p: [0, 0.56, 0.02], r: [Math.PI / 2 + 0.2, 0, 0], c: v.trim });
      gb.add(cone(0.05, 0.16, 4), { p: [0, 0.74, 0.37], c: v.trim });
    }
    if (ex.includes("horns")) for (const s of [-1, 1]) gb.add(cone(0.1, 0.55, 6), { p: [s * 0.3, 0.8, 0.05], r: [0.3, 0, -s * 0.6], c: "#f1e3c8" });
    this.mesh(head, gb);
    if (ex.includes("halo")) {
      const g = new GeoBuilder().add(tor(0.46, 0.035, 20), { p: [0, 0.98, -0.1], r: [Math.PI / 2 - 0.2, 0, 0], c: "#fff3a0" });
      const m = this.mesh(head, g, true);
      if (m) this.extras.push({ obj: m, fn: (t) => { m.rotation.y = t * 0.8; m.position.y = Math.sin(t * 2) * 0.02; } });
    }
  }

  private buildWeapon(hand: THREE.Object3D) {
    const v = this.v, wc = v.weaponColor ?? "#dbe4ef";
    const gb = new GeoBuilder(); const gl = new GeoBuilder();
    const hilt = (len = 0.24) => gb.add(cyl(0.032, 0.032, len, 6), { p: [0, 0, 0], c: "#3b2a1f" });
    switch (v.weapon) {
      case "sword":
        hilt(); gb.add(box(0.3, 0.05, 0.06), { p: [0, 0.14, 0], c: v.trim }).add(box(0.1, 1.0, 0.03), { p: [0, 0.68, 0], c: wc }).add(cone(0.05, 0.14, 4), { p: [0, 1.25, 0], c: wc });
        gl.add(box(0.025, 0.98, 0.035), { p: [0, 0.68, 0], c: "#ffffff" });
        break;
      case "katana":
        hilt(0.3); gb.add(cyl(0.08, 0.08, 0.025, 8), { p: [0, 0.17, 0], c: v.trim }).add(box(0.05, 1.15, 0.02), { p: [0, 0.78, 0], r: [0, 0, 0.03], c: "#e5ecf5" }).add(cone(0.03, 0.1, 4), { p: [0.04, 1.4, 0], r: [0, 0, -0.1], c: "#e5ecf5" });
        gl.add(box(0.012, 1.15, 0.025), { p: [0.0, 0.78, 0], c: wc });
        break;
      case "staff":
        gb.add(cyl(0.032, 0.036, 1.7, 6), { p: [0, 0.45, 0], c: "#5b3d27" }).add(tor(0.1, 0.025), { p: [0, 1.38, 0], r: [Math.PI / 2, 0, 0], c: v.trim });
        gl.add(sph(0.11, 10, 8), { p: [0, 1.46, 0], c: wc });
        break;
      case "spear":
        gb.add(cyl(0.03, 0.03, 1.9, 6), { p: [0, 0.5, 0], c: "#7a5a2f" }).add(cone(0.08, 0.42, 6), { p: [0, 1.66, 0], c: "#f4f1e6" }).add(sph(0.06, 6, 5), { p: [0, 1.45, 0], c: v.trim });
        gl.add(cone(0.045, 0.34, 6), { p: [0, 1.66, 0], c: wc });
        break;
      case "tome":
        gb.add(box(0.34, 0.44, 0.07), { p: [0, 0.05, 0.12], r: [-0.4, 0, 0], c: "#2b1a45" }).add(box(0.3, 0.4, 0.04), { p: [0, 0.05, 0.12], r: [-0.4, 0, 0], c: "#e8e0cf" });
        gl.add(sph(0.06, 8, 6), { p: [0, 0.06, 0.23], c: wc });
        break;
      case "gauntlets": break; // los puños ya son grandes
      case "dagger":
        hilt(0.18); gb.add(box(0.14, 0.04, 0.05), { p: [0, 0.1, 0], c: v.trim }).add(box(0.06, 0.48, 0.02), { p: [0, 0.36, 0], c: wc }).add(cone(0.035, 0.1, 4), { p: [0, 0.65, 0], c: wc });
        break;
      case "hammer":
        gb.add(cyl(0.04, 0.04, 1.3, 6), { p: [0, 0.35, 0], c: "#6b4a2b" }).add(box(0.55, 0.38, 0.38), { p: [0, 1.05, 0], c: "#9aa3b2" }).add(box(0.58, 0.1, 0.4), { p: [0, 1.05, 0], c: v.trim });
        break;
      case "fan":
        gb.add(cone(0.42, 0.06, 7), { p: [0, 0.3, 0.1], r: [0, 0, 0], s: [1, 1, 1], c: v.outfit2 }).add(cyl(0.025, 0.025, 0.4, 5), { p: [0, 0.0, 0], c: "#e8d9b8" });
        break;
      case "claws":
        for (const o of [-0.07, 0, 0.07]) gb.add(cone(0.03, 0.4, 5), { p: [o, -0.12, 0.12], r: [-2.2, 0, 0], c: "#f1e3c8" });
        break;
      case "orb": gl.add(sph(0.16, 10, 8), { p: [0, 0.1, 0.12], c: wc }); break;
      case "none": break;
    }
    const m = this.mesh(hand, gb);
    if (m) m.rotation.x = -1.1;           // el arma apunta hacia delante-arriba
    if (!gl.empty) {
      const g = this.mesh(hand, gl, true);
      if (g) g.rotation.x = -1.1;
    }
  }

  private buildShield(hand: THREE.Object3D) {
    const v = this.v;
    const gb = new GeoBuilder().add(cyl(0.36, 0.36, 0.05, 8), { p: [0, 0, 0.1], r: [Math.PI / 2, 0, 0], c: v.outfit2 })
      .add(cyl(0.2, 0.2, 0.06, 8), { p: [0, 0, 0.13], r: [Math.PI / 2, 0, 0], c: v.trim });
    this.mesh(hand, gb);
  }

  private buildBack(spine: THREE.Object3D, head: THREE.Object3D) {
    void head;
    const v = this.v, ex = v.extras;
    const back = J(spine, 0, 0.4, -0.22);
    if (ex.includes("cape")) {
      const gb = new GeoBuilder().add(box(0.58, 0.95, 0.04), { p: [0, -0.4, -0.04], c: v.outfit2 }).add(box(0.6, 0.06, 0.05), { p: [0, 0.07, -0.03], c: v.trim });
      const m = this.mesh(back, gb);
      if (m) { m.rotation.x = 0.12; this.extras.push({ obj: m, fn: (t) => { m.rotation.x = 0.16 + Math.sin(t * 2.2) * 0.07; } }); }
    }
    if (ex.includes("wings")) {
      for (const s of [-1, 1]) {
        const gl = new GeoBuilder();
        for (let i = 0; i < 4; i++) gl.add(cone(0.12, 1.1 - i * 0.18, 5), { p: [s * (0.35 + i * 0.22), 0.45 - i * 0.18, -0.1], r: [0, 0, -s * (1.1 + i * 0.1)], c: i % 2 ? "#fff6c9" : "#ffe27a" });
        const m = this.mesh(back, gl, true);
        if (m) this.extras.push({ obj: m, fn: (t) => { m.rotation.y = s * (0.1 + Math.sin(t * 2) * 0.06); } });
      }
    }
    if (ex.includes("tail")) {
      const gb = new GeoBuilder().add(cone(0.07, 0.8, 6), { p: [0, -0.3, -0.35], r: [-1.9, 0, 0], c: v.hair });
      const m = this.mesh(back, gb);
      if (m) this.extras.push({ obj: m, fn: (t) => { m.rotation.z = Math.sin(t * 4) * 0.35; } });
    }
    if (ex.includes("crystals")) {
      const gl = new GeoBuilder();
      for (let i = 0; i < 3; i++) gl.add(cone(0.07, 0.34, 5), { p: [(i - 1) * 0.22, 0.2 + (i === 1 ? 0.12 : 0), -0.12], r: [0, 0, (i - 1) * -0.3], c: v.outfit2 });
      const m = this.mesh(back, gl, true);
      if (m) this.extras.push({ obj: m, fn: (t) => { m.position.y = Math.sin(t * 2.5) * 0.04; } });
    }
  }

  // ---------- animación ----------
  get duration() { return CLIPS[this.clip].dur; }
  clipTime() { return this.t; }
  clipDuration(c: ClipName) { return CLIPS[c].dur; }
  impactTime(c: ClipName) { return CLIPS[c].impact ?? CLIPS[c].dur * 0.5; }

  play(clip: ClipName, blend = 0.12) {
    this.from = { ...this.cur };
    this.clip = clip;
    this.t = 0;
    this.blendT = 0;
    this.blendDur = Math.max(0.001, blend);
  }

  update(dt: number) {
    this.t += dt;
    const def = CLIPS[this.clip];
    const target = samplePose(def, def.loop ? this.t : Math.min(this.t, def.dur));
    this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
    const p = this.blendT < 1 ? lerpPose(this.from, target, this.blendT) : target;
    this.cur = p;
    this.body.position.set(p.bodyX, p.bodyY, p.bodyZ);
    this.body.rotation.set(p.bodyRX, p.bodyRY, p.bodyRZ);
    this.spine.rotation.set(p.spineX, p.spineY, p.spineZ);
    this.head.rotation.set(p.headX, p.headY, p.headZ);
    this.armL.rotation.set(p.aLx, p.aLy, p.aLz); this.elbowL.rotation.x = p.eL;
    this.armR.rotation.set(p.aRx, p.aRy, p.aRz); this.elbowR.rotation.x = p.eR;
    this.legL.rotation.set(p.lLx, 0, p.lLz); this.kneeL.rotation.x = p.kL;
    this.legR.rotation.set(p.lRx, 0, p.lRz); this.kneeR.rotation.x = p.kR;
    for (const e of this.extras) e.fn(performance.now() / 1000);
  }

  setFlash(f: number) { this.mat.emissive.setRGB(f, f, f); }
  setFade(f: number) {
    this.mat.transparent = f < 1; this.mat.opacity = f;
    if (this.shadowMat) this.shadowMat.opacity = 0.32 * f;
    this.root.traverse((o) => { if ((o as THREE.Mesh).material instanceof THREE.ShaderMaterial) o.visible = f > 0.98; });
  }
  setCorrupted(on: boolean) {
    // versión "corrompida" de enemigos: tinte violáceo desaturado
    this.mat.color.set(on ? 0xb7a0d6 : 0xffffff);
  }
  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mat.dispose();
    this.shadowMat?.dispose();
  }
}

export function createProceduralRig(charKey: string, opts: RigOptions): CharacterRig {
  return new ProceduralRig(CHAR_VISUALS[charKey] ?? DEFAULT_VISUAL, opts);
}
export { POSE_KEYS };
