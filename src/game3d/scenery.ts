// Escenarios procedurales por misión: cielo degradado, luces, niebla, atrezo instanciado y
// partículas ambientales. Todo ligero (pocas draw calls) y sustituible por escenas .glb.
import * as THREE from "three";
import { GeoBuilder, box, cone, cyl, shade, sph, tor, toonVertexMaterial } from "./toon";

type PropKind = "tree" | "pine" | "rock" | "crystal" | "pillar" | "lantern" | "island" | "torii" | "spire" | "ruin" | "palm" | "shard";
type AmbientKind = "embers" | "petals" | "snow" | "dust" | "bubbles" | "sparks" | "motes";

interface PropSpec { kind: PropKind; n: number; c: string; c2?: string; scale?: [number, number]; glow?: boolean; yMin?: number; yMax?: number }
export interface Biome {
  id: string; name: string;
  sky: [string, string, string]; fog: string; fogNear: number; fogFar: number;
  ground: string; platform: string; trim: string; tileA: string; tileB: string;
  ambient: string; hemiSky: string; hemiGround: string; sun: string; sunPos: [number, number, number]; sunI: number;
  props: PropSpec[]; ambientFx: { kind: AmbientKind; color: string; n: number };
  orb?: { color: string; pos: [number, number, number]; r: number; ring?: string };
  water?: string; stars?: boolean;
}

const BIOMES: Record<string, Biome> = {
  forest: { id: "forest", name: "Bosque Susurrante", sky: ["#2b6f8f", "#79c6a8", "#d9f2c4"], fog: "#9fd6b4", fogNear: 20, fogFar: 62,
    ground: "#2f6b3f", platform: "#4a5d3a", trim: "#9be28a", tileA: "#4f9a58", tileB: "#448a50", ambient: "#9fc8b0", hemiSky: "#cfeeff", hemiGround: "#35553a", sun: "#fff2c2", sunPos: [-8, 14, 8], sunI: 2.1,
    props: [{ kind: "tree", n: 34, c: "#2f8f4a", c2: "#6b4a2b", scale: [1.2, 2.4] }, { kind: "rock", n: 12, c: "#7b8a78" }, { kind: "crystal", n: 6, c: "#6ff2c0", glow: true, scale: [0.6, 1.1] }],
    ambientFx: { kind: "motes", color: "#d8ffb0", n: 46 }, orb: { color: "#fff7c2", pos: [-30, 26, -60], r: 7 } },
  temple: { id: "temple", name: "Templo en Cenizas", sky: ["#2a0f1a", "#8b2f22", "#ff9a4a"], fog: "#6b2a1c", fogNear: 18, fogFar: 56,
    ground: "#3a2018", platform: "#4b2d25", trim: "#ff9a4a", tileA: "#7a3d2a", tileB: "#6a3324", ambient: "#d79a7a", hemiSky: "#ffb27a", hemiGround: "#3a1a14", sun: "#ffc27a", sunPos: [10, 10, 8], sunI: 1.9,
    props: [{ kind: "torii", n: 5, c: "#d6401c", c2: "#2b1a14", scale: [1.3, 2] }, { kind: "pillar", n: 12, c: "#8a6a5a" }, { kind: "rock", n: 14, c: "#4a3028" }, { kind: "pine", n: 12, c: "#3a2a24", c2: "#2b1a14" }],
    ambientFx: { kind: "embers", color: "#ff9a4a", n: 60 }, orb: { color: "#ffb36a", pos: [20, 16, -58], r: 9 } },
  sea: { id: "sea", name: "Mar Suspendido", sky: ["#0b4d86", "#3ab1e8", "#c9f1ff"], fog: "#9fdcf5", fogNear: 22, fogFar: 70,
    ground: "#1f7fb8", platform: "#c8b98a", trim: "#7fe0ff", tileA: "#d9ca98", tileB: "#cbbb88", ambient: "#b4dcf2", hemiSky: "#d8f4ff", hemiGround: "#2a6f8f", sun: "#fff6d6", sunPos: [6, 16, 10], sunI: 2.2,
    props: [{ kind: "island", n: 9, c: "#5fa86a", c2: "#8a7a5a", scale: [1.5, 3], yMin: 1, yMax: 9 }, { kind: "palm", n: 8, c: "#3aa860", c2: "#8a6a3a" }, { kind: "rock", n: 8, c: "#9fb0b8" }],
    ambientFx: { kind: "bubbles", color: "#d8f6ff", n: 40 }, orb: { color: "#fff6d6", pos: [26, 24, -62], r: 6 }, water: "#2a9fd8" },
  arena: { id: "arena", name: "Arena Rúnica", sky: ["#0d1030", "#3a3a8a", "#8a7ae0"], fog: "#3a3a7a", fogNear: 16, fogFar: 54,
    ground: "#2a2a4a", platform: "#3a3a5c", trim: "#ffd93c", tileA: "#5a5a8a", tileB: "#4f4f7e", ambient: "#9a9ad0", hemiSky: "#aab0ff", hemiGround: "#22223a", sun: "#cfd4ff", sunPos: [-6, 14, 6], sunI: 1.7,
    props: [{ kind: "spire", n: 16, c: "#6a6aa8", c2: "#ffd93c" }, { kind: "pillar", n: 12, c: "#7a7ab0" }, { kind: "crystal", n: 10, c: "#ffd93c", glow: true, scale: [0.7, 1.4] }],
    ambientFx: { kind: "sparks", color: "#ffe97a", n: 50 }, orb: { color: "#dfe3ff", pos: [-24, 22, -60], r: 5 }, stars: true },
  void1: { id: "void1", name: "Eco del Devorador", sky: ["#07020f", "#2a0f4a", "#5a1f7a"], fog: "#2a0f4a", fogNear: 14, fogFar: 48,
    ground: "#1a0a2a", platform: "#2a1540", trim: "#b18cff", tileA: "#4a2a70", tileB: "#3f2262", ambient: "#8a6ac0", hemiSky: "#a070ff", hemiGround: "#150a22", sun: "#c8a0ff", sunPos: [0, 12, 8], sunI: 1.6,
    props: [{ kind: "spire", n: 18, c: "#3a2060", c2: "#b18cff" }, { kind: "crystal", n: 12, c: "#b18cff", glow: true, scale: [0.8, 1.6] }, { kind: "island", n: 6, c: "#3a2a5a", c2: "#2a1a44", scale: [1.5, 3], yMin: 1, yMax: 10 }],
    ambientFx: { kind: "motes", color: "#c8a0ff", n: 56 }, orb: { color: "#3a0f5a", pos: [0, 22, -62], r: 10, ring: "#b18cff" }, stars: true },
  gravity: { id: "gravity", name: "Gravedad Cien", sky: ["#101a4a", "#2f58c8", "#8fb8ff"], fog: "#4f6fc8", fogNear: 18, fogFar: 62,
    ground: "#223570", platform: "#38508a", trim: "#8fe0ff", tileA: "#5a78b8", tileB: "#4e6aa8", ambient: "#a0b8f0", hemiSky: "#bfd4ff", hemiGround: "#1c2a58", sun: "#dfeaff", sunPos: [8, 14, 6], sunI: 1.9,
    props: [{ kind: "island", n: 14, c: "#6a82b8", c2: "#3a4a78", scale: [1.2, 3.2], yMin: -2, yMax: 12 }, { kind: "rock", n: 14, c: "#7a8ab8" }],
    ambientFx: { kind: "dust", color: "#bfe0ff", n: 50 }, orb: { color: "#dfeaff", pos: [-20, 22, -60], r: 6 }, stars: true },
  mirrors: { id: "mirrors", name: "Corte de los Espejos", sky: ["#2a0f3a", "#b04aa0", "#ffc0e8"], fog: "#9a4a98", fogNear: 16, fogFar: 54,
    ground: "#4a1f4a", platform: "#6a3a6a", trim: "#ffc0f0", tileA: "#9a5a98", tileB: "#8a4e8a", ambient: "#e0a8d8", hemiSky: "#ffd0f0", hemiGround: "#3a1a3a", sun: "#fff0fa", sunPos: [0, 14, 8], sunI: 1.9,
    props: [{ kind: "shard", n: 26, c: "#ffd0f4", c2: "#c870c0", glow: true, scale: [1, 2.6] }, { kind: "pillar", n: 8, c: "#c8a0c8" }],
    ambientFx: { kind: "petals", color: "#ffd0f4", n: 44 }, orb: { color: "#fff0fa", pos: [14, 20, -60], r: 5 } },
  bridge: { id: "bridge", name: "Puente de los Tres Mundos", sky: ["#050a28", "#1a3a8a", "#6ab0ff"], fog: "#2a4a9a", fogNear: 20, fogFar: 66,
    ground: "#1a2a5a", platform: "#8a96b8", trim: "#7fe8ff", tileA: "#aab4d0", tileB: "#9aa6c4", ambient: "#a8c0f0", hemiSky: "#c0d8ff", hemiGround: "#1a2a52", sun: "#ffffff", sunPos: [10, 14, 8], sunI: 2,
    props: [{ kind: "pillar", n: 10, c: "#c8d4f0" }, { kind: "island", n: 10, c: "#8a9ac8", c2: "#4a5a8a", scale: [1.3, 3], yMin: -4, yMax: 10 }, { kind: "crystal", n: 10, c: "#7fe8ff", glow: true }],
    ambientFx: { kind: "motes", color: "#bfe8ff", n: 54 }, orb: { color: "#ffffff", pos: [0, 24, -64], r: 7, ring: "#7fe8ff" }, stars: true },
  eclipse: { id: "eclipse", name: "Antesala del Eclipse", sky: ["#020208", "#2a0a1a", "#7a1a2a"], fog: "#3a0a1a", fogNear: 14, fogFar: 50,
    ground: "#1a0a10", platform: "#2a1218", trim: "#ff5a3a", tileA: "#4a2228", tileB: "#3f1c22", ambient: "#a05a5a", hemiSky: "#ff7a5a", hemiGround: "#180a0e", sun: "#ff9a7a", sunPos: [0, 10, 8], sunI: 1.5,
    props: [{ kind: "spire", n: 18, c: "#2a1018", c2: "#ff5a3a" }, { kind: "ruin", n: 14, c: "#3a2028" }, { kind: "rock", n: 10, c: "#2a1a20" }],
    ambientFx: { kind: "embers", color: "#ff5a3a", n: 48 }, orb: { color: "#050505", pos: [0, 24, -62], r: 9, ring: "#ff7a4a" }, stars: true },
  festival: { id: "festival", name: "Festival de Faroles", sky: ["#0a1030", "#3a2a70", "#ffb36a"], fog: "#5a3a78", fogNear: 18, fogFar: 58,
    ground: "#2a2050", platform: "#5a4630", trim: "#ffd27a", tileA: "#8a6a48", tileB: "#7a5c3e", ambient: "#d0b0c8", hemiSky: "#ffd0a0", hemiGround: "#2a1a38", sun: "#ffd8a0", sunPos: [8, 12, 8], sunI: 1.8,
    props: [{ kind: "lantern", n: 36, c: "#ff7a4a", c2: "#ffd27a", glow: true, yMin: 1.5, yMax: 7 }, { kind: "torii", n: 4, c: "#d6401c", c2: "#2b1a14" }, { kind: "pine", n: 12, c: "#2a3a50", c2: "#1a2230" }],
    ambientFx: { kind: "petals", color: "#ffd27a", n: 48 }, orb: { color: "#ffe9b0", pos: [-18, 20, -58], r: 6 }, stars: true },
};

export function biomeForMission(missionId: string, chapter: number): Biome {
  const id = missionId.replace(/^h/, "");
  const map: Record<string, string> = {
    "c1-1": "forest", "c1-2": "temple", "c1-3": "sea", "c1-4": "arena", "c1-5": "void1",
    "c2-1": "gravity", "c2-2": "mirrors", "c2-3": "bridge", "c2-4": "eclipse", "c2-5": "void1", "ev-1": "festival",
  };
  return BIOMES[map[id] ?? (chapter === 2 ? "bridge" : chapter === 3 ? "festival" : "forest")];
}

function propGeo(spec: PropSpec): THREE.BufferGeometry {
  const gb = new GeoBuilder(); const c = spec.c, c2 = spec.c2 ?? shade(c, 0.6);
  switch (spec.kind) {
    case "tree": gb.add(cyl(0.18, 0.28, 1.6, 6), { p: [0, 0.8, 0], c: c2 }).add(sph(1, 7, 5), { p: [0, 2.2, 0], s: [1.1, 0.9, 1.1], c }).add(sph(0.7, 7, 5), { p: [0.4, 3.0, 0.1], c: shade(c, 1.15) }); break;
    case "pine": gb.add(cyl(0.14, 0.2, 1, 6), { p: [0, 0.5, 0], c: c2 }).add(cone(1, 1.6, 7), { p: [0, 1.6, 0], c }).add(cone(0.75, 1.4, 7), { p: [0, 2.6, 0], c: shade(c, 1.1) }).add(cone(0.5, 1.2, 7), { p: [0, 3.5, 0], c: shade(c, 1.2) }); break;
    case "palm": gb.add(cyl(0.12, 0.2, 2.6, 6), { p: [0, 1.3, 0], r: [0, 0, 0.12], c: c2 }); for (let i = 0; i < 6; i++) gb.add(cone(0.22, 1.5, 4), { p: [Math.cos(i) * 0.6 + 0.3, 2.7, Math.sin(i) * 0.6], r: [Math.sin(i) * 1.1, 0, -Math.cos(i) * 1.1 - 0.3], s: [1, 1, 0.3], c }); break;
    case "rock": gb.add(sph(1, 6, 4), { p: [0, 0.4, 0], s: [1.1, 0.7, 0.9], c }).add(sph(0.6, 6, 4), { p: [0.8, 0.2, 0.3], c: shade(c, 0.85) }); break;
    case "crystal": gb.add(cone(0.35, 1.8, 5), { p: [0, 0.9, 0], c }).add(cone(0.25, 1.2, 5), { p: [0.4, 0.5, 0.1], r: [0, 0, -0.4], c: shade(c, 0.85) }).add(cone(0.22, 1, 5), { p: [-0.35, 0.4, -0.1], r: [0, 0, 0.5], c: shade(c, 1.1) }); break;
    case "pillar": gb.add(cyl(0.45, 0.55, 3.6, 8), { p: [0, 1.8, 0], c }).add(box(1.2, 0.3, 1.2), { p: [0, 3.7, 0], c: shade(c, 0.85) }).add(box(1.3, 0.3, 1.3), { p: [0, 0.15, 0], c: shade(c, 0.8) }); break;
    case "lantern": gb.add(sph(0.35, 8, 6), { p: [0, 0, 0], s: [1, 1.25, 1], c }).add(cyl(0.2, 0.2, 0.08, 6), { p: [0, 0.48, 0], c: c2 }).add(cyl(0.2, 0.2, 0.08, 6), { p: [0, -0.48, 0], c: c2 }); break;
    case "island": gb.add(cone(1.3, 1.8, 7), { p: [0, -0.9, 0], r: [Math.PI, 0, 0], c: c2 }).add(cyl(1.4, 1.3, 0.35, 8), { p: [0, 0.05, 0], c }).add(sph(0.5, 6, 4), { p: [0.3, 0.5, 0.2], s: [1, 0.8, 1], c: shade(c, 0.85) }); break;
    case "torii": gb.add(cyl(0.18, 0.2, 3.2, 6), { p: [-1.2, 1.6, 0], c }).add(cyl(0.18, 0.2, 3.2, 6), { p: [1.2, 1.6, 0], c }).add(box(3.4, 0.28, 0.35), { p: [0, 3.25, 0], c }).add(box(2.6, 0.18, 0.25), { p: [0, 2.7, 0], c: c2 }); break;
    case "spire": gb.add(cone(0.55, 5, 5), { p: [0, 2.5, 0], c }).add(cone(0.3, 3, 5), { p: [0.8, 1.5, 0.3], c: shade(c, 0.85) }).add(tor(0.4, 0.05), { p: [0, 3.5, 0], r: [Math.PI / 2, 0, 0], c: c2 }); break;
    case "ruin": gb.add(box(1.4, 2.2, 0.5), { p: [0, 1.1, 0], c }).add(box(0.6, 1.2, 0.5), { p: [1.1, 0.6, 0.3], r: [0, 0.4, 0.1], c: shade(c, 0.85) }).add(box(1, 0.4, 0.5), { p: [-0.9, 0.2, 0.4], c: shade(c, 0.75) }); break;
    case "shard": gb.add(box(0.15, 2.4, 0.9), { p: [0, 1.2, 0], c }).add(cone(0.5, 0.7, 4), { p: [0, 2.7, 0], s: [0.3, 1, 1.2], c: c2 }); break;
  }
  return gb.build()!;
}

export interface Scenery {
  group: THREE.Group;
  biome: Biome;
  update(t: number, dt: number): void;
  dispose(): void;
}

export function buildScenery(biome: Biome, quality: "high" | "low", rnd = mulberry(1234)): Scenery {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

  // cielo
  const skyGeo = track(new THREE.SphereGeometry(95, 20, 12));
  const pos = skyGeo.getAttribute("position"); const cols = new Float32Array(pos.count * 3);
  const [c0, c1, c2] = biome.sky.map((h) => new THREE.Color(h)); const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 95;
    if (y > 0.25) tmp.copy(c1).lerp(c0, Math.min(1, (y - 0.25) / 0.75)); else tmp.copy(c1).lerp(c2, Math.min(1, (0.25 - y) / 0.5));
    cols.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  skyGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(skyGeo, track(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  sky.renderOrder = -10; group.add(sky);

  if (biome.stars) {
    const n = quality === "high" ? 220 : 90; const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.2, r = 90; arr.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
    const g = track(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    group.add(new THREE.Points(g, track(new THREE.PointsMaterial({ color: "#ffffff", size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }))));
  }
  if (biome.orb) {
    const o = biome.orb;
    const m = new THREE.Mesh(track(new THREE.SphereGeometry(o.r, 20, 14)), track(new THREE.MeshBasicMaterial({ color: o.color, fog: false, toneMapped: false })));
    m.position.set(...o.pos); group.add(m);
    if (o.ring) { const r = new THREE.Mesh(track(new THREE.TorusGeometry(o.r * 1.15, o.r * 0.06, 6, 40)), track(new THREE.MeshBasicMaterial({ color: o.ring, fog: false, toneMapped: false }))); r.position.copy(m.position); group.add(r); }
  }

  // suelo / agua
  const gGeo = track(new THREE.CircleGeometry(70, 32));
  const ground = new THREE.Mesh(gGeo, track(new THREE.MeshToonMaterial({ color: biome.water ?? biome.ground })));
  ground.rotation.x = -Math.PI / 2; ground.position.y = biome.water ? -1.4 : -0.05; group.add(ground);

  // atrezo instanciado
  const toon = toonVertexMaterial();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const mult = quality === "high" ? 1 : 0.55;
  const flicker: THREE.MeshBasicMaterial[] = [];
  for (const spec of biome.props) {
    const geo = track(propGeo(spec));
    const n = Math.max(2, Math.round(spec.n * mult));
    const mat = spec.glow ? track(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })) : toon;
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0;
      for (let k = 0; k < 20; k++) {
        x = (rnd() - 0.5) * 56; z = -4 - rnd() * 34 + (rnd() < 0.3 ? 22 : 0);
        if (!(Math.abs(x) < 8.5 && z > -7.5 && z < 8)) break;
      }
      const sc = (spec.scale?.[0] ?? 0.9) + rnd() * ((spec.scale?.[1] ?? 1.6) - (spec.scale?.[0] ?? 0.9));
      const y = spec.yMin !== undefined ? spec.yMin + rnd() * ((spec.yMax ?? 6) - spec.yMin) : 0;
      p.set(x, y, z); e.set(0, rnd() * Math.PI * 2, 0); q.setFromEuler(e); s.setScalar(sc);
      inst.setMatrixAt(i, m4.compose(p, q, s));
      inst.setColorAt(i, col.setScalar(0.85 + rnd() * 0.3));
    }
    inst.frustumCulled = false; group.add(inst);
    disposables.push({ dispose: () => inst.dispose() });
  }
  void flicker;

  // partículas ambientales
  const fx = biome.ambientFx; const fn = Math.round(fx.n * mult);
  const fa = new Float32Array(fn * 3), fv = new Float32Array(fn * 3);
  for (let i = 0; i < fn; i++) {
    fa.set([(rnd() - 0.5) * 30, rnd() * 9, -8 + rnd() * 20], i * 3);
    const up = fx.kind === "embers" || fx.kind === "bubbles" || fx.kind === "sparks" || fx.kind === "motes";
    fv.set([(rnd() - 0.5) * 0.6, (up ? 0.3 + rnd() * 0.7 : -(0.3 + rnd() * 0.6)), (rnd() - 0.5) * 0.4], i * 3);
  }
  const fg = track(new THREE.BufferGeometry()); fg.setAttribute("position", new THREE.BufferAttribute(fa, 3));
  const fm = track(new THREE.PointsMaterial({ color: fx.color, size: fx.kind === "petals" ? 0.22 : 0.16, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const pts = new THREE.Points(fg, fm); pts.frustumCulled = false; group.add(pts);

  return {
    group, biome,
    update(t, dt) {
      for (let i = 0; i < fn; i++) {
        fa[i * 3] += (fv[i * 3] + Math.sin(t * 0.7 + i) * 0.15) * dt;
        fa[i * 3 + 1] += fv[i * 3 + 1] * dt;
        fa[i * 3 + 2] += fv[i * 3 + 2] * dt;
        if (fa[i * 3 + 1] > 9) fa[i * 3 + 1] = 0; else if (fa[i * 3 + 1] < 0) fa[i * 3 + 1] = 9;
      }
      fg.getAttribute("position").needsUpdate = true;
    },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
