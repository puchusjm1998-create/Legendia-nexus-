// Efectos visuales ligeros: partículas aditivas en un único Points (pooled) y unos pocos
// meshes temporales (anillos, tajos, rayos, proyectiles). Presupuesto fijo → seguro en móviles.
import * as THREE from "three";

export interface EmitOpts {
  vel?: THREE.Vector3 | [number, number, number];
  spread?: number;      // velocidad aleatoria esférica
  life?: number; size?: number; grow?: number; drag?: number; gravity?: number;
  jitter?: number;      // dispersión de posición inicial
}

const V = new THREE.Vector3();
const COL = new THREE.Color();

class Particles {
  readonly points: THREE.Points;
  private n: number; private head = 0;
  private pos: Float32Array; private col: Float32Array; private size: Float32Array; private alpha: Float32Array;
  private vel: Float32Array; private life: Float32Array; private max: Float32Array;
  private s0: Float32Array; private grow: Float32Array; private drag: Float32Array; private grav: Float32Array;
  private mat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  constructor(n: number) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n).fill(1);
    this.s0 = new Float32Array(n); this.grow = new Float32Array(n); this.drag = new Float32Array(n); this.grav = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float uScale;
        void main(){ vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(0.0, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; varying vec3 vC;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float a = (1.0 - r); a = a * a * 1.4; gl_FragColor = vec4(vC * a * vA, a * vA); }`,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }
  setScale(s: number) { this.mat.uniforms.uScale.value = s; }
  emit(p: THREE.Vector3, color: string | THREE.Color, o: EmitOpts = {}) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    COL.set(color as THREE.ColorRepresentation);
    const j = o.jitter ?? 0, sp = o.spread ?? 0;
    this.pos[i * 3] = p.x + (Math.random() - 0.5) * j; this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * j; this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * j;
    let vx = 0, vy = 0, vz = 0;
    if (o.vel) { if (Array.isArray(o.vel)) [vx, vy, vz] = o.vel; else { vx = o.vel.x; vy = o.vel.y; vz = o.vel.z; } }
    if (sp) {
      V.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp * (0.4 + Math.random() * 0.6));
      vx += V.x; vy += V.y; vz += V.z;
    }
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = COL.r; this.col[i * 3 + 1] = COL.g; this.col[i * 3 + 2] = COL.b;
    const life = (o.life ?? 0.6) * (0.75 + Math.random() * 0.5);
    this.life[i] = life; this.max[i] = life;
    this.s0[i] = (o.size ?? 0.2) * (0.7 + Math.random() * 0.6);
    this.grow[i] = o.grow ?? 0; this.drag[i] = o.drag ?? 1.5; this.grav[i] = o.gravity ?? 0;
    this.size[i] = this.s0[i]; this.alpha[i] = 1;
  }
  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.max[i]);
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= dr; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt; this.vel[i * 3 + 2] *= dr;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = k; this.size[i] = Math.max(0, this.s0[i] * (1 + this.grow[i] * (1 - k)) * (0.4 + 0.6 * k));
    }
    for (const a of ["position", "color", "size", "alpha"]) (this.geo.getAttribute(a) as THREE.BufferAttribute).needsUpdate = true;
  }
  clear() { this.life.fill(0); this.update(0); }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

interface Effect { obj?: THREE.Object3D; update: (dt: number, t: number) => boolean; dispose?: () => void; t: number }

export class Vfx {
  readonly group = new THREE.Group();
  private parts: Particles;
  private effects: Effect[] = [];
  private ringGeo = new THREE.RingGeometry(0.82, 1, 40);
  private discGeo = new THREE.CircleGeometry(1, 28);
  private slashGeo: THREE.BufferGeometry;
  private cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  private sphGeo = new THREE.SphereGeometry(1, 10, 8);
  private maxEffects: number;
  constructor(public quality: "high" | "low") {
    this.parts = new Particles(quality === "high" ? 900 : 380);
    this.group.add(this.parts.points);
    this.maxEffects = quality === "high" ? 40 : 22;
    // media luna: sector de anillo
    const sh = new THREE.Shape();
    const a0 = -1.0, a1 = 1.0;
    sh.absarc(0, 0, 1, a0, a1, false);
    sh.absarc(0.14, 0, 0.82, a1, a0, true);
    this.slashGeo = new THREE.ShapeGeometry(sh, 16);
  }
  setScale(px: number) { this.parts.setScale(px); }
  private add(e: Effect) {
    if (this.effects.length >= this.maxEffects) this.remove(this.effects[0]);
    if (e.obj) this.group.add(e.obj);
    this.effects.push(e);
  }
  private remove(e: Effect) {
    if (e.obj) this.group.remove(e.obj);
    e.dispose?.();
    const i = this.effects.indexOf(e); if (i >= 0) this.effects.splice(i, 1);
  }
  private addMat(color: string, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  }
  update(dt: number) {
    this.parts.update(dt);
    for (const e of [...this.effects]) { e.t += dt; if (!e.update(dt, e.t)) this.remove(e); }
  }
  clear() { [...this.effects].forEach((e) => this.remove(e)); this.parts.clear(); }
  dispose() {
    this.clear(); this.parts.dispose();
    [this.ringGeo, this.discGeo, this.slashGeo, this.cylGeo, this.sphGeo].forEach((g) => g.dispose());
  }

  /** Partícula suelta (para emisores personalizados). */
  emit(p: THREE.Vector3, color: string, o?: EmitOpts) { this.parts.emit(p, color, o); }

  burst(p: THREE.Vector3, color: string, n = 18, speed = 4, o: EmitOpts = {}) {
    const k = this.quality === "high" ? 1 : 0.55;
    for (let i = 0; i < Math.round(n * k); i++) this.parts.emit(p, color, { spread: speed, life: 0.55, size: 0.22, drag: 2.5, gravity: 2, ...o });
  }
  /** Chispas direccionales (impacto). */
  sparks(p: THREE.Vector3, dir: THREE.Vector3, color: string, n = 14) {
    const k = this.quality === "high" ? 1 : 0.55;
    for (let i = 0; i < Math.round(n * k); i++)
      this.parts.emit(p, color, { vel: dir.clone().multiplyScalar(4), spread: 5, life: 0.45, size: 0.16, drag: 3, gravity: 6 });
  }
  rise(p: THREE.Vector3, color: string, n = 16, radius = 0.6) {
    const k = this.quality === "high" ? 1 : 0.55;
    for (let i = 0; i < Math.round(n * k); i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      this.parts.emit(V.set(p.x + Math.cos(a) * r, p.y + Math.random() * 0.3, p.z + Math.sin(a) * r), color,
        { vel: [0, 1.6 + Math.random() * 1.5, 0], life: 0.9, size: 0.17, drag: 0.4 });
    }
  }
  ring(p: THREE.Vector3, color: string, radius = 2, dur = 0.55, flat = true, thick = 1) {
    const m = new THREE.Mesh(this.ringGeo, this.addMat(color));
    m.position.copy(p); if (flat) m.rotation.x = -Math.PI / 2;
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: m, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur); const e = 1 - (1 - k) * (1 - k);
      m.scale.setScalar(Math.max(0.01, radius * e)); mat.opacity = (1 - k) * thick; return k < 1;
    } });
  }
  disc(p: THREE.Vector3, color: string, radius = 1.5, dur = 0.6, opacity = 0.5) {
    const m = new THREE.Mesh(this.discGeo, this.addMat(color, opacity));
    m.position.copy(p); m.rotation.x = -Math.PI / 2;
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: m, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur); m.scale.setScalar(radius * (0.3 + 0.7 * k)); mat.opacity = opacity * (1 - k); return k < 1;
    } });
  }
  /** Tajo en forma de media luna orientado hacia `yaw`. */
  slash(p: THREE.Vector3, yaw: number, color: string, size = 1.4, tilt = 0.4, dur = 0.28) {
    const m = new THREE.Mesh(this.slashGeo, this.addMat(color));
    const g = new THREE.Group(); g.position.copy(p); g.rotation.y = yaw; g.add(m);
    m.rotation.order = "YXZ";
    m.rotation.set(0, Math.PI / 2, tilt); // el plano del arco contiene el eje de avance
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: g, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur); m.scale.setScalar(size * (0.6 + 0.6 * k)); mat.opacity = 1 - k * k; return k < 1;
    } });
  }
  /** Haz entre dos puntos. */
  beam(a: THREE.Vector3, b: THREE.Vector3, color: string, width = 0.25, dur = 0.5) {
    const m = new THREE.Mesh(this.cylGeo, this.addMat(color));
    const len = a.distanceTo(b);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: m, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur); const w = width * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8);
      m.scale.set(Math.max(0.001, w), len, Math.max(0.001, w)); mat.opacity = 0.9 * (1 - k * 0.5); return k < 1;
    } });
    for (let i = 0; i < 8; i++) this.parts.emit(V.copy(a).lerp(b, Math.random()), color, { spread: 1.2, life: 0.4, size: 0.18 });
  }
  /** Columna vertical (pilar de luz/fuego). */
  pillar(p: THREE.Vector3, color: string, radius = 0.8, height = 8, dur = 0.7) {
    const m = new THREE.Mesh(this.cylGeo, this.addMat(color));
    m.position.set(p.x, p.y + height / 2, p.z);
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: m, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur); const w = radius * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) * 0.75);
      m.scale.set(Math.max(0.001, w), height, Math.max(0.001, w)); mat.opacity = 0.8 * (1 - k); return k < 1;
    } });
  }
  /** Proyectil luminoso con estela (la llegada la sincroniza el escenario con `dur`). */
  projectile(from: THREE.Vector3, to: THREE.Vector3, color: string, dur = 0.35, size = 0.28, arc = 0.5) {
    const m = new THREE.Mesh(this.sphGeo, this.addMat(color));
    m.scale.setScalar(size);
    const pos = new THREE.Vector3(), tmp = new THREE.Vector3();
    const mat = m.material as THREE.MeshBasicMaterial;
    this.add({ obj: m, t: 0, dispose: () => mat.dispose(), update: (_d, t) => {
      const k = Math.min(1, t / dur);
      pos.copy(from).lerp(to, k); pos.y += Math.sin(k * Math.PI) * arc;
      m.position.copy(pos);
      this.parts.emit(tmp.copy(pos), color, { spread: 0.5, life: 0.3, size: size * 0.8, drag: 2 });
      return k < 1;
    } });
  }
  /** Rayo ramificado entre dos puntos. */
  lightning(a: THREE.Vector3, b: THREE.Vector3, color: string, dur = 0.3, segs = 9) {
    const mk = () => {
      const pts: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const k = i / segs; const j = i === 0 || i === segs ? 0 : 0.5;
        pts.push(a.x + (b.x - a.x) * k + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * k + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * k + (Math.random() - 0.5) * j);
      }
      return pts;
    };
    const arr1 = new Float32Array((segs + 1) * 3);
    const geo1 = new THREE.BufferGeometry(); geo1.setAttribute("position", new THREE.BufferAttribute(arr1, 3));
    const line = new THREE.Line(geo1, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false }));
    line.frustumCulled = false;
    const mat = line.material as THREE.LineBasicMaterial;
    let acc = 0;
    this.add({ obj: line, t: 0, dispose: () => { geo1.dispose(); mat.dispose(); }, update: (d, t) => {
      acc += d;
      if (acc > 0.04 || t === d) { acc = 0; arr1.set(mk()); geo1.getAttribute("position").needsUpdate = true; }
      const k = Math.min(1, t / dur); mat.opacity = 1 - k * k; return k < 1;
    } });
    for (let i = 0; i < 6; i++) this.parts.emit(b, color, { spread: 4, life: 0.35, size: 0.16, gravity: 5 });
  }
  /** Partículas que convergen hacia un punto móvil (carga de energía). */
  charge(target: () => THREE.Vector3, color: string, dur = 1, radius = 2.4, rate = 40) {
    let acc = 0; const tmp = new THREE.Vector3();
    this.add({ t: 0, update: (d, t) => {
      acc += d * rate * (this.quality === "high" ? 1 : 0.5);
      const tp = target();
      while (acc >= 1) {
        acc -= 1;
        const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * 1.4, r = radius * (0.6 + Math.random() * 0.5);
        tmp.set(tp.x + Math.cos(a) * r, tp.y + Math.sin(el) * r, tp.z + Math.sin(a) * r);
        const v = tp.clone().sub(tmp).multiplyScalar(1 / 0.5);
        this.parts.emit(tmp, color, { vel: v, life: 0.5, size: 0.2, drag: 0 });
      }
      return t < dur;
    } });
  }
  /** Emisor genérico controlado por el escenario/ultimates. */
  emitter(fn: (dt: number, t: number) => boolean) { this.add({ t: 0, update: fn }); }
}
