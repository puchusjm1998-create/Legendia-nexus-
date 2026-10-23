// Utilidades de render "cel-shading" de anime: material toon con mapa de gradiente,
// contornos por casco invertido y un constructor de geometrías fusionadas con color
// por vértice (1 malla por articulación = pocas llamadas de dibujo en móviles).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

let grad: THREE.DataTexture | null = null;
export function gradientMap(): THREE.DataTexture {
  if (!grad) {
    // 4 escalones de luz: sombra marcada, media, luz y brillo
    const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 225, 225, 225, 255, 255, 255, 255, 255]);
    grad = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    grad.minFilter = THREE.NearestFilter;
    grad.magFilter = THREE.NearestFilter;
    grad.generateMipmaps = false;
    grad.needsUpdate = true;
  }
  return grad;
}

let toonMat: THREE.MeshToonMaterial | null = null;
export const toonVertexMaterial = () =>
  (toonMat ??= new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }));

let glowMat: THREE.MeshBasicMaterial | null = null;
export const glowVertexMaterial = () =>
  (glowMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));

const outlineCache = new Map<number, THREE.ShaderMaterial>();
/** Contorno negro: casco invertido desplazado por la normal. */
export function outlineMaterial(thickness = 0.022, color = 0x0b1020): THREE.ShaderMaterial {
  const key = thickness * 1000 + color;
  let m = outlineCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uThick: { value: thickness }, uColor: { value: new THREE.Color(color) } },
      vertexShader: `uniform float uThick; void main(){ vec3 p = position + normal * uThick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor,1.0); }`,
      side: THREE.BackSide,
    });
    outlineCache.set(key, m);
  }
  return m;
}

export interface PartOpts {
  p?: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
  c: number | string;
}

/** Acumula primitivas con color por vértice y las fusiona en una sola geometría. */
export class GeoBuilder {
  private geos: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, o: PartOpts) {
    const geo = g.index ? g : g;
    geo.deleteAttribute("uv");
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(o.p ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.r ?? [0, 0, 0]))),
      new THREE.Vector3(...(o.s ?? [1, 1, 1])));
    geo.applyMatrix4(m);
    const col = new THREE.Color(o.c as THREE.ColorRepresentation);
    const n = geo.getAttribute("position").count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    this.geos.push(geo);
    return this;
  }
  get empty() { return this.geos.length === 0; }
  build(): THREE.BufferGeometry | null {
    if (!this.geos.length) return null;
    const out = mergeGeometries(this.geos, false);
    this.geos.forEach((g) => g.dispose());
    this.geos = [];
    return out;
  }
}

// primitivas de baja poligonación (segmentos pensados para móviles)
export const sph = (r: number, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
export const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const tor = (r: number, t: number, seg = 14) => new THREE.TorusGeometry(r, t, 6, seg);
export const cap = (r: number, h: number) => new THREE.CapsuleGeometry(r, h, 3, 8);

export function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s), Math.max(0, Math.min(1, hsl.l * f)));
  return `#${c.getHexString()}`;
}
