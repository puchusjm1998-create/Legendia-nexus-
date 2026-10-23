// Escenario de combate 3D (Three.js). Controla render, cámara, unidades, HUD DOM, picking y
// la reproducción de los beats derivados de los frames reales del servidor.
import * as THREE from "three";
import { ELEMENTS } from "@/game/catalog";
import type { BattleFrame, BattleSnapshot } from "@/game/battle-engine";
import { GRID_H, GRID_W, type Unit } from "@/game/combat";
import type { SfxName } from "@/game/audio";
import { CameraRig, fitDistance } from "./camera";
import { biomeForMission, buildScenery, type Biome, type Scenery } from "./scenery";
import { buildBeats, type Beat, type Hit } from "./script";
import { Vfx } from "./vfx";
import { createRig, type CharacterRig } from "./models";
import { CLIPS, type ClipName } from "./anim";
import { castFx, impactFx, playUltimate } from "./ultimates";

export type Quality = "high" | "low";
export interface PickEvent { kind: "tile"; x: number; y: number } 
export type StagePick = PickEvent | { kind: "unit"; uid: number };
export interface StageHooks {
  onSnapshot(s: BattleSnapshot): void;
  sfx(n: SfxName): void;
  banner(text: string, ms?: number): void;
  pick(p: StagePick): void;
  onContextLost?(): void;
}
export interface Interaction {
  moveTiles: { x: number; y: number }[];
  targets: { uid: number; kind: "enemy" | "ally" }[];
  currentUid: number | null;
}
export interface StageOptions {
  host: HTMLElement; quality: Quality; mission: { id: string; chapter: number };
  snapshot: BattleSnapshot; hooks: StageHooks; animSpeed: number; skipUlt: boolean;
}

const STATUS_ICON: Record<string, string> = { burn: "🔥", stun: "💫", atkUp: "⚔️", defUp: "🛡️", defDown: "💔", regen: "💚" };

export interface UnitView {
  uid: number; side: "ally" | "enemy"; data: Unit; rig: CharacterRig;
  gx: number; gy: number;
  pos: THREE.Vector3; offset: THREE.Vector3; yaw: number; targetYaw: number;
  base: ClipName; alive: boolean; deadT: number; flash: number;
  marker: THREE.Mesh; markerMat: THREE.MeshBasicMaterial; aura?: THREE.Mesh;
  proxy: THREE.Mesh;
  hud: { root: HTMLDivElement; hp: HTMLDivElement; en: HTMLDivElement; st: HTMLDivElement; arrow: HTMLDivElement; x: number; y: number };
  baseScale: number; spawn: number;
}

interface Tween { t: number; dur: number; fn: (k: number) => void; res: () => void }
type View = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };

export class BattleStage {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly cam: CameraRig;
  readonly vfx: Vfx;
  readonly views = new Map<number, UnitView>();
  readonly hooks: StageHooks;
  quality: Quality;
  layout: "h" | "v" = "h";
  rush = false;
  timeScale = 1;
  skipUlt: boolean;
  hitstop = 0;
  displayed: BattleSnapshot;

  private host: HTMLElement;
  private hudLayer: HTMLDivElement; private overlay: HTMLDivElement;
  private dimEl: HTMLDivElement; private titleEl: HTMLDivElement; private flashEl: HTMLDivElement;
  private scenery: Scenery; private biome: Biome;
  private tiles: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; base: THREE.Color; x: number; y: number }[] = [];
  private tileGroup = new THREE.Group();
  private tweens: Tween[] = [];
  private raf = 0; private last = 0; private t = 0; private disposed = false;
  private ro?: ResizeObserver;
  private w = 1; private h = 1;
  interaction: Interaction = { moveTiles: [], targets: [], currentUid: null };
  private baseView: View = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 38 };
  private overviewMode = true;
  private ray = new THREE.Raycaster(); private ndc = new THREE.Vector2();
  private frameTimes: number[] = [];
  private pointerDown: { x: number; y: number } | null = null;
  private lights: THREE.Light[] = [];
  private sun!: THREE.DirectionalLight;
  private playing = false;

  constructor(private o: StageOptions) {
    this.host = o.host; this.hooks = o.hooks; this.quality = o.quality; this.skipUlt = o.skipUlt;
    this.timeScale = o.animSpeed; this.displayed = o.snapshot;

    this.renderer = new THREE.WebGLRenderer({ antialias: o.quality === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.quality === "high" ? 2 : 1.25));
    const cv = this.renderer.domElement;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation;";
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.hooks.onContextLost?.(); });
    this.host.appendChild(cv);

    this.hudLayer = document.createElement("div");
    this.hudLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    this.dimEl = document.createElement("div");
    this.dimEl.style.cssText = "position:absolute;inset:0;background:radial-gradient(circle at 50% 55%,rgba(0,0,0,.35),rgba(0,0,0,.88));opacity:0;transition:opacity .25s;";
    this.titleEl = document.createElement("div");
    this.titleEl.style.cssText = "position:absolute;left:0;right:0;bottom:14%;text-align:center;opacity:0;transform:translateX(-30px) skewX(-12deg);transition:opacity .25s,transform .35s;background:linear-gradient(90deg,transparent,rgba(0,0,0,.85),transparent);padding:10px 0;";
    this.flashEl = document.createElement("div");
    this.flashEl.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;";
    this.overlay.append(this.dimEl, this.titleEl, this.flashEl);
    this.host.append(this.hudLayer, this.overlay);

    this.cam = new CameraRig(1);
    this.biome = biomeForMission(o.mission.id, o.mission.chapter);
    this.scenery = buildScenery(this.biome, o.quality);
    this.scene.add(this.scenery.group);
    this.scene.background = new THREE.Color(this.biome.sky[1]);
    this.scene.fog = new THREE.Fog(this.biome.fog, this.biome.fogNear, this.biome.fogFar);
    const hemi = new THREE.HemisphereLight(this.biome.hemiSky, this.biome.hemiGround, 1.25);
    const amb = new THREE.AmbientLight(this.biome.ambient, 0.55);
    this.sun = new THREE.DirectionalLight(this.biome.sun, this.biome.sunI);
    this.sun.position.set(...this.biome.sunPos);
    const rim = new THREE.DirectionalLight(this.biome.trim, 0.55); rim.position.set(0, 6, -10);
    this.lights = [hemi, amb, this.sun, rim];
    this.scene.add(...this.lights);
    this.vfx = new Vfx(o.quality);
    this.scene.add(this.vfx.group);
    this.scene.add(this.tileGroup);

    this.measure();
    this.layout = this.w / this.h < 0.9 ? "v" : "h";
    this.buildTiles();
    for (const u of o.snapshot.units) this.addUnit(u);
    this.relayoutUnits();
    this.computeOverview(); this.cam.setView(this.baseView.pos, this.baseView.look, this.baseView.fov, 4); this.cam.snap();

    cv.addEventListener("pointerdown", this.onDown);
    cv.addEventListener("pointerup", this.onUp);
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.host);
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------- tiempo / tweens ----------------
  setSpeed(s: number) { this.timeScale = s; }
  tween(dur: number, fn: (k: number) => void): Promise<void> {
    if (this.rush || this.disposed) { fn(1); return Promise.resolve(); }
    return new Promise((res) => this.tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, res }));
  }
  wait(dur: number) { return this.tween(dur, () => {}); }
  /** Salta/aborta: resuelve ya todas las esperas y deja el resto de beats en modo instantáneo. */
  forceRush() {
    this.rush = true;
    const ts = this.tweens; this.tweens = [];
    for (const tw of ts) { try { tw.fn(1); } catch { /* */ } tw.res(); }
  }
  skip() { this.forceRush(); }
  get isPlaying() { return this.playing; }

  // ---------------- layout ----------------
  private measure() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
  }
  private tileSize() { return this.layout === "h" ? { w: 1.9, d: 1.5 } : { w: 1.5, d: 1.7 }; }
  worldPos(gx: number, gy: number, out = new THREE.Vector3()) {
    if (this.layout === "h") return out.set((gx - 3) * 1.9, 0, (gy - 2) * 1.5);
    return out.set((gy - 2) * 1.5, 0, (3 - gx) * 1.7);
  }
  homeYaw(side: "ally" | "enemy") {
    if (this.layout === "h") return side === "ally" ? Math.PI / 2 : -Math.PI / 2;
    return side === "ally" ? Math.PI : 0;
  }
  private onResize() {
    if (this.disposed) return;
    this.measure();
    this.renderer.setSize(this.w, this.h, false);
    this.cam.setAspect(this.w / this.h);
    const nl = this.w / this.h < 0.9 ? "v" : "h";
    if (nl !== this.layout) { this.layout = nl; this.buildTiles(); this.relayoutUnits(); }
    this.computeOverview();
    if (this.overviewMode) { this.cam.setView(this.baseView.pos, this.baseView.look, this.baseView.fov, 6); }
  }
  private buildTiles() {
    for (const t of this.tiles) { this.tileGroup.remove(t.mesh); t.mesh.geometry.dispose(); t.mat.dispose(); }
    this.tiles = [];
    while (this.tileGroup.children.length) {
      const c = this.tileGroup.children[0] as THREE.Mesh; this.tileGroup.remove(c); c.geometry?.dispose();
      (c.material as THREE.Material | undefined)?.dispose();
    }
    const { w, d } = this.tileSize();
    const geo = new THREE.PlaneGeometry(w * 0.93, d * 0.93); geo.rotateX(-Math.PI / 2);
    const pf = new THREE.Mesh(new THREE.BoxGeometry(GRID_W * w + 0.5, 0.5, GRID_H * d + 0.5), new THREE.MeshToonMaterial({ color: this.biome.platform }));
    pf.position.y = -0.27; this.tileGroup.add(pf);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(GRID_W * w + 0.35, 0.08, GRID_H * d + 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(this.biome.trim).multiplyScalar(0.6), toneMapped: false }));
    trim.position.y = -0.03; this.tileGroup.add(trim);
    for (let gy = 0; gy < GRID_H; gy++) for (let gx = 0; gx < GRID_W; gx++) {
      const base = new THREE.Color((gx + gy) % 2 ? this.biome.tileA : this.biome.tileB).multiplyScalar(0.8);
      const mat = new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat);
      this.worldPos(gx, gy, mesh.position); mesh.position.y = 0.02;
      mesh.userData = { gx, gy };
      this.tileGroup.add(mesh);
      this.tiles.push({ mesh, mat, base, x: gx, y: gy });
    }
  }
  private relayoutUnits() {
    for (const v of this.views.values()) {
      this.worldPos(v.data.x, v.data.y, v.pos); v.gx = v.data.x; v.gy = v.data.y;
      v.targetYaw = v.yaw = this.homeYaw(v.side);
    }
  }
  private computeOverview() {
    const { w, d } = this.tileSize();
    const hx = (GRID_W * w) / 2 + 0.3, hz = (GRID_H * d) / 2 + 0.3;
    const pts: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, 3.1]) pts.push(new THREE.Vector3(sx * hx, y, sz * hz));
    const center = new THREE.Vector3(0, 0.7, this.layout === "v" ? 0.4 : 0);
    const dir = this.layout === "h" ? new THREE.Vector3(0.1, 0.52, 1) : new THREE.Vector3(0.03, 0.8, 1);
    const fov = 36; const aspect = this.w / this.h;
    const dist = fitDistance(dir, center, pts, fov, aspect, 0.96, 0.94) + 0.2;
    this.baseView = { pos: center.clone().add(dir.normalize().multiplyScalar(dist)), look: center.clone(), fov };
  }
  /** Encuadra un grupo de puntos (acción en curso). */
  focus(points: THREE.Vector3[], opts: { elev?: number; side?: number; pad?: number; rate?: number; minDist?: number } = {}) {
    if (this.rush) return;
    this.overviewMode = false;
    const pad = opts.pad ?? 1.4;
    const pts: THREE.Vector3[] = [];
    const c = new THREE.Vector3();
    for (const p of points) { c.add(p); }
    c.multiplyScalar(1 / Math.max(1, points.length));
    for (const p of points) for (const y of [0, 2.5]) for (const s of [-1, 1]) pts.push(new THREE.Vector3(p.x + s * pad, y, p.z + s * pad * 0.6));
    const look = new THREE.Vector3(c.x, 1.1, c.z);
    const dir = this.layout === "h"
      ? new THREE.Vector3((opts.side ?? 0.35), opts.elev ?? 0.34, 1)
      : new THREE.Vector3((opts.side ?? 0.25), (opts.elev ?? 0.34) + 0.15, 1);
    const dist = Math.max(opts.minDist ?? 6.5, fitDistance(dir, look, pts, 36, this.w / this.h, 0.9, 0.88));
    const maxDist = this.baseView.pos.distanceTo(this.baseView.look);
    this.cam.setView(look.clone().add(dir.normalize().multiplyScalar(Math.min(dist, maxDist))), look, 36, opts.rate ?? 3.4);
  }
  overview(rate = 3) {
    this.overviewMode = true;
    this.cam.setView(this.baseView.pos, this.baseView.look, this.baseView.fov, rate);
    if (this.rush) this.cam.snap();
  }
  setCameraView(pos: THREE.Vector3, look: THREE.Vector3, fov: number, rate: number) {
    this.overviewMode = false;
    this.cam.setView(pos, look, fov, rate);
  }
  getOverview() { return this.baseView; }

  // ---------------- unidades ----------------
  private addUnit(u: Unit) {
    const rig = createRig(u.key, { quality: this.quality, transformed: u.transformed, corrupted: u.side === "enemy" && !u.boss }, (real) => this.swapRig(u.uid, real));
    const baseScale = u.boss ? 1.4 : 1;
    rig.root.scale.multiplyScalar(baseScale);
    this.scene.add(rig.root);
    const markerMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 28), markerMat);
    marker.rotation.x = -Math.PI / 2; marker.position.y = 0.06; this.scene.add(marker);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * baseScale, 0.75 * baseScale, 2.3 * baseScale, 8));
    proxy.position.y = 1.15 * baseScale; proxy.visible = false; this.scene.add(proxy);
    let aura: THREE.Mesh | undefined;
    if (u.boss || u.transformed) {
      aura = new THREE.Mesh(new THREE.TorusGeometry(0.95 * baseScale, 0.05, 6, 30),
        new THREE.MeshBasicMaterial({ color: u.boss ? "#b18cff" : "#fbbf24", transparent: true, opacity: 0.85, toneMapped: false }));
      aura.rotation.x = Math.PI / 2; aura.position.y = 0.1; this.scene.add(aura);
    }
    const hud = this.makeHud(u);
    const v: UnitView = {
      uid: u.uid, side: u.side, data: u, rig, gx: u.x, gy: u.y, pos: new THREE.Vector3(), offset: new THREE.Vector3(),
      yaw: 0, targetYaw: 0, base: "idle", alive: u.alive, deadT: u.alive ? 0 : 99, flash: 0,
      marker, markerMat, aura, proxy, hud, baseScale, spawn: 1,
    };
    this.views.set(u.uid, v);
    this.worldPos(u.x, u.y, v.pos);
    v.targetYaw = v.yaw = this.homeYaw(u.side);
    rig.play(u.alive ? "idle" : "defeat", 0.01);
    rig.update(Math.random() * 2);
    this.refreshHud(v);
  }
  private swapRig(uid: number, real: CharacterRig) {
    const v = this.views.get(uid);
    if (!v || this.disposed) return;
    this.scene.remove(v.rig.root); v.rig.dispose();
    real.root.scale.multiplyScalar(v.baseScale);
    this.scene.add(real.root); v.rig = real; real.play(v.base, 0.01);
  }
  private makeHud(u: Unit) {
    const root = document.createElement("div");
    root.style.cssText = "position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;will-change:transform;transition:opacity .25s;";
    const arrow = document.createElement("div");
    arrow.textContent = "▼"; arrow.style.cssText = "font-size:13px;line-height:11px;color:#fbbf24;text-shadow:0 0 6px #fbbf24;opacity:0;margin-bottom:1px;";
    const st = document.createElement("div"); st.style.cssText = "display:flex;gap:1px;font-size:11px;line-height:12px;min-height:12px;text-shadow:0 1px 2px #000;";
    const bars = document.createElement("div");
    const bw = this.w < 520 ? 46 : 58;
    bars.style.cssText = `width:${bw}px;padding:1px;border-radius:3px;background:rgba(0,0,0,.72);border:1px solid ${u.side === "ally" ? "rgba(34,211,238,.7)" : "rgba(244,63,94,.7)"};`;
    const hpW = document.createElement("div"); hpW.style.cssText = "height:6px;background:#111827;border-radius:2px;overflow:hidden;";
    const hp = document.createElement("div"); hp.style.cssText = `height:100%;width:100%;background:${u.side === "ally" ? "#4ade80" : "#f87171"};transition:width .3s;`;
    hpW.appendChild(hp);
    const enW = document.createElement("div"); enW.style.cssText = "height:3px;margin-top:1px;background:#111827;border-radius:2px;overflow:hidden;";
    const en = document.createElement("div"); en.style.cssText = "height:100%;width:0;background:#38bdf8;transition:width .3s;";
    enW.appendChild(en);
    bars.append(hpW, enW);
    root.append(arrow, st, bars);
    this.hudLayer.appendChild(root);
    return { root, hp, en, st, arrow, x: -999, y: -999 };
  }
  private refreshHud(v: UnitView) {
    const u = v.data;
    v.hud.hp.style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
    v.hud.en.style.width = `${Math.min(100, u.energy)}%`;
    v.hud.en.style.background = u.energy >= 100 ? "#f0abfc" : "#38bdf8";
    v.hud.st.textContent = (u.boss ? "👑" : "") + u.statuses.map((s) => STATUS_ICON[s.type] ?? "").join("");
    v.hud.root.style.opacity = u.alive ? "1" : "0";
  }

  /** Sincroniza el estado mostrado con un snapshot (sin animar). */
  applyState(s: BattleSnapshot, o: { teleport?: boolean; silent?: boolean } = {}) {
    this.displayed = s;
    for (const u of s.units) {
      const v = this.views.get(u.uid); if (!v) continue;
      const wasAlive = v.alive;
      const moved = u.x !== v.gx || u.y !== v.gy;
      v.data = u;
      if (o.teleport && moved) { this.worldPos(u.x, u.y, v.pos); v.gx = u.x; v.gy = u.y; }
      v.alive = u.alive;
      const stunned = u.alive && u.statuses.some((x) => x.type === "stun");
      const over = s.phase === "victory" && u.side === "ally" && u.alive ? "victory" : s.phase === "defeat" && u.side === "enemy" && u.alive ? "victory" : null;
      this.setBase(v, !u.alive ? "defeat" : over ?? (stunned ? "stun" : "idle"), wasAlive && !u.alive && o.teleport ? 0.01 : 0.15);
      if (wasAlive && !u.alive && o.teleport) v.deadT = 99;
      this.refreshHud(v);
    }
    if (!o.silent) this.hooks.onSnapshot(s);
  }
  private setBase(v: UnitView, clip: ClipName, blend = 0.15) {
    if (v.base === clip) return;
    v.base = clip;
    v.rig.play(clip, blend);
  }
  /** Sólo actualiza los datos de un impacto concreto (los demás ya están en el snapshot). */
  setCurrent(uid: number | null) { this.interaction.currentUid = uid; }
  setInteraction(i: Interaction) { this.interaction = i; }
  clipDur(v: UnitView, c: ClipName) { return v.rig.clipDuration(c); }
  face(v: UnitView, toward: THREE.Vector3) {
    const dx = toward.x - v.pos.x, dz = toward.z - v.pos.z;
    if (dx * dx + dz * dz > 0.001) v.targetYaw = Math.atan2(dx, dz);
  }
  chest(v: UnitView, out = new THREE.Vector3()) { return out.copy(v.pos).add(v.offset).setY(1.2 * v.baseScale); }
  head(v: UnitView, out = new THREE.Vector3()) { return out.copy(v.pos).add(v.offset).setY(2.2 * v.baseScale); }
  handPos(v: UnitView, out = new THREE.Vector3()) {
    v.rig.root.updateMatrixWorld(true);
    return v.rig.hand.getWorldPosition(out);
  }
  playClip(v: UnitView, clip: ClipName, blend = 0.1) { v.rig.play(clip, blend); }

  // ---------------- efectos de texto / pantalla ----------------
  floatText(p: THREE.Vector3, text: string, color: string, big = false, dx = 0) {
    if (this.rush) return;
    const s = this.project(p); if (!s) return;
    const outer = document.createElement("div");
    outer.style.cssText = `position:absolute;left:${s.x + dx}px;top:${s.y}px;transform:translate(-50%,-50%);`;
    const inner = document.createElement("div");
    inner.className = "anim-dmg font-display";
    inner.style.cssText = `font-weight:800;white-space:nowrap;font-size:${big ? 24 : 15}px;color:${color};text-shadow:0 1px 3px #000,0 0 8px #000;`;
    inner.textContent = text; outer.appendChild(inner); this.hudLayer.appendChild(outer);
    setTimeout(() => outer.remove(), 1050);
  }
  private project(p: THREE.Vector3): { x: number; y: number } | null {
    const v = p.clone().project(this.cam.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h };
  }
  flash(dur = 0.35, opacity = 0.9) {
    if (this.rush) return;
    this.flashEl.style.transition = "none"; this.flashEl.style.opacity = String(opacity);
    requestAnimationFrame(() => { this.flashEl.style.transition = `opacity ${dur}s ease-out`; this.flashEl.style.opacity = "0"; });
  }
  dim(on: boolean) { this.dimEl.style.opacity = on ? "1" : "0"; this.hudLayer.style.opacity = on ? "0.15" : "1"; this.hudLayer.style.transition = "opacity .25s"; }
  title(kind: string, name: string, color: string | null) {
    if (!color) { this.titleEl.style.opacity = "0"; this.titleEl.style.transform = "translateX(-30px) skewX(-12deg)"; return; }
    this.titleEl.innerHTML = `<div style="font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#94a3b8">${kind}</div><div class="font-display" style="font-size:26px;font-weight:800;color:${color};text-shadow:0 0 18px ${color}">${name.replace(/</g, "&lt;")}</div>`;
    this.titleEl.style.opacity = "1"; this.titleEl.style.transform = "translateX(0) skewX(-12deg)";
  }

  // ---------------- reproducción ----------------
  async playFrames(frames: BattleFrame[], final: BattleSnapshot): Promise<void> {
    if (this.disposed) return;
    const beats = buildBeats(frames);
    this.rush = false; this.playing = true;
    try {
      for (const b of beats) {
        if (this.disposed) return;
        if (this.rush) { this.applyState(b.state, { teleport: true }); continue; }
        const wd = setTimeout(() => this.forceRush(), 12000 / Math.min(1, this.timeScale));
        try { await this.runBeat(b); } catch (e) { console.warn("[stage] beat", e); }
        clearTimeout(wd);
        this.applyState(b.state, { teleport: true });
      }
    } finally {
      this.playing = false;
      this.dim(false); this.title("", "", null);
      this.applyState(final, { teleport: true });
      this.rush = false;
      for (const v of this.views.values()) { v.offset.set(0, 0, 0); v.targetYaw = v.yaw = this.homeYaw(v.side); this.worldPos(v.data.x, v.data.y, v.pos); v.gx = v.data.x; v.gy = v.data.y; }
      this.overview(4);
    }
  }
  /** Fuerza el estado del servidor (recuperación de errores / reanudar partida). */
  sync(s: BattleSnapshot) { this.forceRush(); this.applyState(s, { teleport: true }); this.rush = false; }

  async intro() {
    this.rush = false;
    const bv = this.baseView;
    const start = bv.pos.clone().add(new THREE.Vector3(this.layout === "h" ? -9 : 4, 6, 7));
    this.cam.setView(start, bv.look, bv.fov + 6, 4); this.cam.snap();
    this.cam.setView(bv.pos, bv.look, bv.fov, 1.6);
    const list = [...this.views.values()].filter((v) => v.alive);
    for (const v of list) { v.spawn = 0; v.rig.root.visible = false; }
    let i = 0;
    for (const v of list) {
      const delay = (i++) * 0.13;
      setTimeout(() => {
        if (this.disposed) return;
        v.spawn = 1; v.rig.root.visible = true; v.rig.play("intro", 0.01); this.setBaseAfterIntro(v);
        this.vfx.ring(v.pos, v.side === "ally" ? "#38bdf8" : "#f43f5e", 1.5, 0.6);
        this.vfx.burst(this.chest(v), v.side === "ally" ? "#7dd3fc" : "#fb7185", 14, 3);
        this.hooks.sfx("whoosh");
      }, (delay * 1000) / this.timeScale);
    }
    await this.wait(0.2 + list.length * 0.13 + 0.7);
    for (const v of list) { v.spawn = 1; v.rig.root.visible = true; }
  }
  private setBaseAfterIntro(v: UnitView) { v.base = "idle"; }

  async playEnd(state: BattleSnapshot) {
    this.applyState(state, { teleport: true });
    const winners = [...this.views.values()].filter((v) => v.alive && v.data.side === (state.phase === "victory" ? "ally" : "enemy"));
    if (winners.length) this.focus(winners.map((v) => v.pos), { minDist: 6, rate: 2.2 });
    await this.wait(1.2);
  }

  private async runBeat(b: Beat) {
    switch (b.t) {
      case "turn": {
        this.interaction.currentUid = b.uid;
        await this.wait(this.views.get(b.uid)?.side === "enemy" ? 0.22 : 0.1);
        return;
      }
      case "round": this.hooks.banner(b.label, 600); await this.wait(0.5); return;
      case "move": return this.runMove(b);
      case "wait": {
        const v = this.views.get(b.uid); if (!v) return;
        if (b.guard) {
          this.applyState(b.state);
          this.hooks.sfx("guard");
          v.rig.play("guard", 0.08);
          this.vfx.ring(v.pos.clone().setY(0.1), "#7dd3fc", 1.3, 0.5);
          this.vfx.rise(this.chest(v), "#7dd3fc", 12, 0.6);
          this.floatText(this.head(v), "DEFENSA 🛡️", "#7dd3fc");
          await this.wait(0.6);
          v.rig.play(v.base, 0.15);
        } else {
          await this.wait(0.25);
        }
        return;
      }
      case "stun": {
        const v = this.views.get(b.uid); if (!v) return;
        this.floatText(this.head(v), "ATURDIDO 💫", "#fde047");
        v.rig.play("stun", 0.08);
        await this.wait(0.55);
        return;
      }
      case "tick": {
        const v = this.views.get(b.uid); if (!v) return;
        this.applyState(b.state);
        if (b.kind === "damage") {
          this.hooks.sfx("hit"); v.flash = 1;
          this.floatText(this.head(v), `-${b.amount} 🔥`, "#fb923c");
          this.vfx.burst(this.chest(v), "#fb923c", 10, 2.5);
          if (v.alive) v.rig.play("hit", 0.05); else this.hooks.sfx("ko");
        } else {
          this.hooks.sfx("heal");
          this.floatText(this.head(v), `+${b.amount}`, "#4ade80");
          this.vfx.rise(this.chest(v), "#4ade80", 10, 0.5);
        }
        await this.wait(0.4);
        return;
      }
      case "bossPhase": {
        const v = this.views.get(b.uid);
        this.applyState(b.state);
        this.hooks.banner(`⚠️ ${b.label} · Su ataque aumenta`, 1200);
        this.hooks.sfx("boom");
        if (v) {
          this.focus([v.pos], { minDist: 6 });
          this.cam.shake(0.6, 0.6); this.flash(0.4, 0.5);
          this.vfx.ring(v.pos.clone().setY(0.1), "#b18cff", 3.5, 0.8);
          this.vfx.burst(this.chest(v), "#b18cff", 30, 6);
          v.rig.play("ultRelease", 0.08);
        }
        await this.wait(1.2);
        this.overview();
        return;
      }
      case "end": {
        this.applyState(b.state, { teleport: true });
        await this.playEnd(b.state);
        return;
      }
      case "action": return this.runAction(b);
    }
  }

  private async runMove(b: Extract<Beat, { t: "move" }>) {
    const v = this.views.get(b.uid); if (!v) return;
    const u = b.state.units.find((x) => x.uid === b.uid); if (!u) return;
    const from = v.pos.clone(), to = this.worldPos(u.x, u.y);
    this.hooks.sfx("move");
    this.face(v, to);
    v.rig.play("run", 0.08);
    const dur = Math.max(0.3, from.distanceTo(to) / 6.5);
    this.focus([from, to], { minDist: 8, rate: 2.5 });
    await this.tween(dur, (k) => { v.pos.lerpVectors(from, to, k); });
    v.gx = u.x; v.gy = u.y;
    v.targetYaw = this.homeYaw(v.side);
    v.rig.play(v.base, 0.12);
    this.overview();
  }

  /** Aplica el resultado real de un impacto (HP, estados, textos, efectos). */
  applyHit(hit: Hit, attacker: UnitView | undefined, color: string, power = 1) {
    const v = this.views.get(hit.targetUid); if (!v) return;
    this.applyState(hit.state);
    const head = this.head(v);
    if (hit.kind === "damage") {
      v.flash = 1;
      if (attacker) {
        const dir = v.pos.clone().sub(attacker.pos).setY(0).normalize();
        v.offset.copy(dir).multiplyScalar(0.35 * power);
        this.vfx.sparks(this.chest(v), dir.setY(0.4), hit.crit ? "#fde047" : color, hit.crit ? 20 : 12);
      }
      if (!hit.killed) v.rig.play("hit", 0.04);
      this.hooks.sfx(hit.crit ? "crit" : hit.advantage > 1 ? "weak" : "hit");
      this.floatText(head, `-${hit.amount}`, hit.crit ? "#fbbf24" : "#ffffff", hit.crit || power > 1);
      if (hit.crit) this.floatText(head.clone().setY(head.y + 0.5), "¡CRÍTICO!", "#fbbf24", false, 0);
      if (hit.advantage > 1) this.floatText(head.clone().setY(head.y + 0.9), "¡VENTAJA!", "#4ade80");
      else if (hit.advantage < 1) this.floatText(head.clone().setY(head.y + 0.9), "RESISTE", "#94a3b8");
      if (hit.combo) this.floatText(head.clone().setY(head.y + 1.3), `¡COMBO ×${hit.combo + 1}!`, "#38bdf8");
      this.cam.shake((hit.crit ? 0.45 : 0.25) * power, 0.3);
      if (hit.crit) { this.cam.punch(3); this.hitstop = 0.08; }
      if (hit.killed) {
        this.hooks.sfx("ko");
        this.vfx.burst(this.chest(v), color, 22, 5);
      }
    } else if (hit.kind === "heal") {
      this.hooks.sfx("heal");
      if (hit.amount) this.floatText(head, `+${hit.amount}`, "#4ade80", power > 1);
      this.vfx.rise(this.chest(v), "#86efac", 18, 0.6); this.vfx.ring(v.pos.clone().setY(0.1), "#4ade80", 1.4, 0.6);
    } else {
      this.hooks.sfx("buff");
      this.vfx.rise(this.chest(v), color, 12, 0.6);
    }
    hit.statuses.forEach((l, i) => this.floatText(head.clone().setY(head.y - 0.35 - i * 0.35), l, "#c4b5fd"));
  }

  private async runAction(b: Extract<Beat, { t: "action" }>) {
    const A = this.views.get(b.uid); if (!A) return;
    const att = b.state.units.find((u) => u.uid === b.uid) ?? A.data;
    const def = b.action === "attack" ? null : b.action === "skill" ? att.skill : att.ultimate;
    const support = !!def && def.target !== "enemy";
    const color = b.action === "ultimate" ? att.ultimate.color : ELEMENTS[att.element].color;
    const targets = b.hits.map((h) => this.views.get(h.targetUid)).filter((x): x is UnitView => !!x);
    const primary = targets[0] ?? A;
    const range = def?.range ?? att.range;
    const aoe = def?.aoe ?? 0;
    const origin = A.pos.clone();
    this.interaction.currentUid = b.uid;
    this.face(A, primary.pos);

    if (b.action === "ultimate") {
      await playUltimate(this, b, A, targets, color, support);
      await this.finishAction(A, origin, false);
      return;
    }
    const melee = !support && range <= 1;
    this.focus([A.pos, ...targets.map((t) => t.pos)], { rate: 3 });
    const clip: ClipName = support ? (def && def.power > 0 ? "heal" : "buff") : b.action === "skill" ? "skill" : melee ? "melee" : "shoot";
    const impactT = A.rig.impactTime(clip), dur = A.rig.clipDuration(clip);
    const fireIn = (hitIdx: number) => this.wait(0.05 + hitIdx * (aoe ? 0.07 : 0.1));

    if (melee) {
      const dir = primary.pos.clone().sub(A.pos).setY(0); const len = dir.length(); dir.normalize();
      const stop = A.pos.clone().add(dir.clone().multiplyScalar(Math.max(0, len - 1.5)));
      this.hooks.sfx("whoosh"); A.rig.play("run", 0.06);
      const from = A.pos.clone();
      await this.tween(Math.max(0.15, from.distanceTo(stop) / 11), (k) => A.pos.lerpVectors(from, stop, k));
    } else if (!support) this.hooks.sfx(b.action === "skill" ? "cast" : "swing");
    else this.hooks.sfx("buff");

    A.rig.play(clip, 0.06);
    if (b.action === "skill" && !support) this.vfx.charge(() => this.handPos(A), color, impactT, 1.2, 30);
    await this.wait(impactT * 0.85);
    // proyectil / tajo
    if (!support) {
      if (melee) { this.hooks.sfx("swing"); }
      else {
        castFx(this, A, primary, color, b.action === "skill" ? 1.4 : 0.8);
        await this.wait(0.3);
      }
    } else {
      this.vfx.ring(A.pos.clone().setY(0.1), color, 1.3, 0.5);
    }
    // impactos
    for (let i = 0; i < b.hits.length; i++) {
      const h = b.hits[i], tv = this.views.get(h.targetUid);
      if (tv && h.kind !== "status" && !support) {
        impactFx(this, A.data.element, tv, color, b.action === "skill" ? 1.3 : 1, melee, A);
      }
      this.applyHit(h, A, color, b.action === "skill" ? 1.2 : 1);
      if (i < b.hits.length - 1) await fireIn(i);
    }
    await this.wait(Math.max(0.15, (dur - impactT) * 0.7));
    await this.finishAction(A, origin, melee);
  }

  async finishAction(A: UnitView, origin: THREE.Vector3, ranBack: boolean) {
    this.applyState(this.displayed);
    if (ranBack || A.pos.distanceToSquared(origin) > 0.01) {
      const from = A.pos.clone();
      this.face(A, origin);
      A.rig.play("run", 0.06);
      await this.tween(Math.max(0.12, from.distanceTo(origin) / 11), (k) => A.pos.lerpVectors(from, origin, k));
    }
    A.targetYaw = this.homeYaw(A.side);
    A.rig.play(A.alive ? A.base : "defeat", 0.12);
    this.overview(2.6);
    await this.wait(0.12);
  }

  // ---------------- interacción ----------------
  private onDown = (e: PointerEvent) => { this.pointerDown = { x: e.clientX, y: e.clientY }; };
  private onUp = (e: PointerEvent) => {
    const d = this.pointerDown; this.pointerDown = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.cam.camera);
    // unidades (proxies invisibles, raycast directo)
    let best: { uid: number; dist: number } | null = null;
    const th0 = this.ray.intersectObjects(this.tiles.map((t) => t.mesh), false)[0];
    if (th0 && !this.interaction.targets.length) {
      const { gx, gy } = th0.object.userData;
      // Las casillas azules de movimiento tienen prioridad sobre las unidades que se solapan en pantalla.
      if (this.interaction.moveTiles.some((m) => m.x === gx && m.y === gy)) { this.hooks.pick({ kind: "tile", x: gx, y: gy }); return; }
    }
    const only = this.interaction.targets.length ? new Set(this.interaction.targets.map((t) => t.uid)) : null;
    for (const v of this.views.values()) {
      if (!v.alive || (only && !only.has(v.uid))) continue;
      v.proxy.updateMatrixWorld(true);
      const hits: THREE.Intersection[] = [];
      v.proxy.raycast(this.ray, hits);
      if (hits.length && (!best || hits[0].distance < best.dist)) best = { uid: v.uid, dist: hits[0].distance };
    }
    if (best) { this.hooks.pick({ kind: "unit", uid: best.uid }); return; }
    const th = this.ray.intersectObjects(this.tiles.map((t) => t.mesh), false)[0];
    if (th) this.hooks.pick({ kind: "tile", x: th.object.userData.gx, y: th.object.userData.gy });
  };

  // ---------------- utilidades de depuración / pruebas ----------------
  private screenPoint(p: THREE.Vector3) {
    const s = this.project(p); if (!s) return null;
    const r = this.host.getBoundingClientRect();
    return { x: r.left + s.x, y: r.top + s.y };
  }
  /** Coordenadas de pantalla (página) del primer objetivo seleccionable, para pruebas automáticas. */
  getTargets() {
    const t = this.interaction.targets[0]; const v = t && this.views.get(t.uid);
    return v ? this.screenPoint(this.chest(v)) : null;
  }
  getMoveTile() {
    const foes = [...this.views.values()].filter((v) => v.side === "enemy" && v.alive);
    const best = [...this.interaction.moveTiles].sort((a, b) => {
      const d = (t: { x: number; y: number }) => Math.min(...foes.map((f) => Math.abs(f.data.x - t.x) + Math.abs(f.data.y - t.y)));
      return d(a) - d(b);
    })[0];
    return best ? this.screenPoint(this.worldPos(best.x, best.y)) : null;
  }
  screenOfUnit(uid: number) { const v = this.views.get(uid); return v ? this.screenPoint(this.chest(v)) : null; }
  screenOfTile(x: number, y: number) { return this.screenPoint(this.worldPos(x, y)); }
  debug() {
    return { layout: this.layout, quality: this.quality, rush: this.rush, playing: this.playing, units: [...this.views.values()].map((v) => ({ uid: v.uid, clip: v.rig.clip, alive: v.alive, hp: v.data.hp })), cam: this.cam.camera.position.toArray(), fov: this.cam.currentFov, calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles, geos: this.renderer.info.memory.geometries };
  }

  // ---------------- bucle ----------------
  private loop(now: number) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const real = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (this.hitstop > 0) this.hitstop -= real;
    const ts = this.timeScale * (this.hitstop > 0 ? 0.08 : 1);
    const dt = real * ts;
    this.t += dt;
    this.update(dt, real);
    if (this.w !== Math.round(this.host.clientWidth) || this.h !== Math.round(this.host.clientHeight)) this.onResize();
    this.cam.update(real);
    this.vfx.setScale(this.h * this.renderer.getPixelRatio() / (2 * Math.tan((this.cam.currentFov * Math.PI) / 360)));
    this.renderer.render(this.scene, this.cam.camera);
    this.updateHud();
    // degradar calidad si el dispositivo va justo
    if (this.quality === "high") {
      this.frameTimes.push(real);
      if (this.frameTimes.length === 90) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / 90;
        if (avg > 0.045) this.downgrade();
        this.frameTimes = [];
      }
    }
  }
  private downgrade() {
    this.quality = "low"; this.vfx.quality = "low";
    this.renderer.setPixelRatio(1); this.renderer.setSize(this.w, this.h, false);
  }
  private update(dt: number, real: number) {
    // tweens
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.dur);
      try { tw.fn(k); } catch { /* */ }
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
    this.scenery.update(this.t, real);
    this.vfx.update(dt);
    const it = this.interaction;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
    for (const t of this.tiles) {
      t.mat.color.copy(t.base);
      if (it.moveTiles.some((m) => m.x === t.x && m.y === t.y)) t.mat.color.lerp(new THREE.Color("#38d4ff"), 0.45 + pulse * 0.3);
    }
    for (const v of this.views.values()) {
      v.yaw += shortAngle(v.targetYaw - v.yaw) * Math.min(1, 12 * dt);
      v.offset.multiplyScalar(Math.max(0, 1 - 7 * dt));
      v.rig.update(dt);
      const root = v.rig.root;
      root.position.copy(v.pos).add(v.offset); root.rotation.y = v.yaw;
      v.proxy.position.set(root.position.x, 1.15 * v.baseScale, root.position.z);
      // fin de clips no cíclicos → vuelve a la pose base
      const clip = v.rig.clip;
      if (v.alive && !CLIPS[clip].loop && v.rig.clipTime() >= v.rig.clipDuration(clip) + 0.02) v.rig.play(v.base, 0.15);
      if (v.flash > 0) { v.flash = Math.max(0, v.flash - dt * 5); v.rig.setFlash(v.flash * 0.8); }
      if (!v.alive) {
        v.deadT += dt;
        const f = Math.max(0, 1 - Math.max(0, v.deadT - 0.9) / 0.6);
        v.rig.setFade(f); v.rig.root.visible = f > 0.01; v.marker.visible = false;
        if (v.aura) v.aura.visible = false;
      }
      v.marker.position.set(root.position.x, 0.06, root.position.z);
      // marcadores de selección
      const isCur = it.currentUid === v.uid && v.alive;
      const tgt = it.targets.find((x) => x.uid === v.uid);
      if (tgt && v.alive) {
        v.markerMat.color.set(tgt.kind === "enemy" ? "#ff4d6d" : "#4ade80"); v.markerMat.opacity = 0.6 + pulse * 0.4;
        v.marker.scale.setScalar(1.15 + pulse * 0.15 * v.baseScale);
      } else if (isCur) {
        v.markerMat.color.set("#fbbf24"); v.markerMat.opacity = 0.9; v.marker.scale.setScalar(1 + 0.05 * pulse);
      } else v.markerMat.opacity = 0;
      if (v.aura) {
        v.aura.position.set(root.position.x, 0.1, root.position.z);
        v.aura.rotation.z += dt * 2;
        const ph = v.data.boss && v.data.phase >= 2;
        (v.aura.material as THREE.MeshBasicMaterial).color.set(ph ? "#ff5a7a" : v.data.boss ? "#b18cff" : "#fbbf24");
        v.aura.scale.setScalar(1 + (ph ? 0.15 * pulse : 0));
      }
      v.hud.arrow.style.opacity = isCur ? "1" : "0";
    }
  }
  private updateHud() {
    const tmp = new THREE.Vector3();
    for (const v of this.views.values()) {
      if (!v.alive) continue;
      tmp.copy(v.pos).add(v.offset).setY(2.25 * v.baseScale + 0.1);
      tmp.project(this.cam.camera);
      const behind = tmp.z > 1;
      const x = Math.round((tmp.x * 0.5 + 0.5) * this.w), y = Math.round((-tmp.y * 0.5 + 0.5) * this.h);
      if (x !== v.hud.x || y !== v.hud.y) {
        v.hud.x = x; v.hud.y = y;
        v.hud.root.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
      }
      v.hud.root.style.display = behind || !v.rig.root.visible ? "none" : "flex";
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    const cv = this.renderer.domElement;
    cv.removeEventListener("pointerdown", this.onDown); cv.removeEventListener("pointerup", this.onUp);
    for (const tw of this.tweens) tw.res();
    this.tweens = [];
    for (const v of this.views.values()) { v.rig.dispose(); v.marker.geometry.dispose(); v.markerMat.dispose(); v.proxy.geometry.dispose(); v.aura?.geometry.dispose(); }
    this.vfx.dispose(); this.scenery.dispose();
    for (const t of this.tiles) { t.mat.dispose(); }
    this.tileGroup.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    cv.remove(); this.hudLayer.remove(); this.overlay.remove();
  }
}

function shortAngle(a: number) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
