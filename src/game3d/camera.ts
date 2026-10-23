// Cámara dinámica: suavizado exponencial hacia una vista objetivo, temblor y "golpe" de FOV.
import * as THREE from "three";

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private pos = new THREE.Vector3(0, 8, 14); private look = new THREE.Vector3();
  private tPos = new THREE.Vector3(0, 8, 14); private tLook = new THREE.Vector3();
  private fov = 40; private tFov = 40; private rate = 4;
  private shakeAmp = 0; private shakeT = 0; private shakeDur = 0; private punchV = 0;
  private roll = 0; private tRoll = 0;
  constructor(aspect: number) { this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 200); }

  setAspect(a: number) { this.camera.aspect = a; this.camera.updateProjectionMatrix(); }
  /** Vista objetivo; `rate` mayor = transición más rápida. */
  setView(pos: THREE.Vector3, look: THREE.Vector3, fov = 40, rate = 4, roll = 0) {
    this.tPos.copy(pos); this.tLook.copy(look); this.tFov = fov; this.rate = rate; this.tRoll = roll;
  }
  snap() { this.pos.copy(this.tPos); this.look.copy(this.tLook); this.fov = this.tFov; this.roll = this.tRoll; this.apply(0); }
  shake(amp = 0.3, dur = 0.35) { this.shakeAmp = Math.max(this.shakeAmp * 0.5, amp); this.shakeT = 0; this.shakeDur = dur; }
  punch(deg = 4) { this.punchV = deg; }
  update(dt: number) {
    const k = 1 - Math.exp(-this.rate * dt);
    this.pos.lerp(this.tPos, k); this.look.lerp(this.tLook, k);
    this.fov += (this.tFov - this.fov) * k; this.roll += (this.tRoll - this.roll) * k;
    this.punchV *= Math.exp(-9 * dt);
    this.apply(dt);
  }
  private apply(dt: number) {
    const c = this.camera;
    c.position.copy(this.pos);
    if (this.shakeAmp > 0.001) {
      this.shakeT += dt;
      const f = Math.max(0, 1 - this.shakeT / Math.max(0.05, this.shakeDur));
      const a = this.shakeAmp * f;
      c.position.x += (Math.random() - 0.5) * a; c.position.y += (Math.random() - 0.5) * a; c.position.z += (Math.random() - 0.5) * a * 0.5;
      if (f <= 0) this.shakeAmp = 0;
    }
    c.up.set(Math.sin(this.roll), Math.cos(this.roll), 0);
    c.lookAt(this.look);
    const fv = this.fov - this.punchV;
    if (Math.abs(c.fov - fv) > 0.01) { c.fov = fv; c.updateProjectionMatrix(); }
  }
  get currentFov() { return this.camera.fov; }
}

/** Distancia mínima (desde `center`, en dirección `dir`) para que todos los puntos entren en pantalla. */
export function fitDistance(dir: THREE.Vector3, center: THREE.Vector3, points: THREE.Vector3[], fovDeg: number, aspect: number, mx = 0.88, my = 0.86): number {
  const f = dir.clone().normalize();                    // del centro hacia la cámara
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, f).normalize();
  const cu = new THREE.Vector3().crossVectors(f, right).normalize();
  const th = Math.tan((fovDeg * Math.PI) / 360);
  let d = 1;
  for (const p of points) {
    const r = p.clone().sub(center);
    const x = r.dot(right), y = r.dot(cu), z = r.dot(f);
    d = Math.max(d, z + Math.abs(x) / (mx * th * aspect), z + Math.abs(y) / (my * th));
  }
  return d;
}
