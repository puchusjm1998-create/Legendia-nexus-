// Efectos por elemento y secuencia cinemática de las técnicas definitivas.
// El daño real (Hit) se aplica en el clímax; la cinemática sólo decide cuándo se ve.
import * as THREE from "three";
import type { Element } from "@/game/catalog";
import type { Beat } from "./script";
import type { BattleStage, UnitView } from "./stage";

type ActionBeat = Extract<Beat, { t: "action" }>;

/** Estallido elemental en un punto (impactos normales y ultimates). */
export function elementBurst(st: BattleStage, el: Element, pos: THREE.Vector3, color: string, power = 1) {
  const v = st.vfx;
  const ground = pos.clone().setY(0.08);
  switch (el) {
    case "fuego":
      v.burst(pos, "#ffb347", Math.round(20 * power), 4.5 * power, { life: 0.7, size: 0.3, gravity: -2 });
      v.burst(pos, "#ff4d1a", Math.round(12 * power), 3, { life: 0.8, size: 0.4, gravity: -3 });
      v.disc(ground, "#ff7a2a", 1.6 * power, 0.6, 0.55);
      if (power > 1) v.pillar(ground, "#ff7a2a", 1.0, 7, 0.8);
      break;
    case "agua":
      v.ring(ground, "#7fd8ff", 2 * power, 0.6); v.ring(ground, "#bdeaff", 1.2 * power, 0.45);
      v.burst(pos, "#a5e4ff", Math.round(22 * power), 4 * power, { life: 0.7, size: 0.2, gravity: 8 });
      if (power > 1) v.pillar(ground, "#4cc3ff", 1.2, 5, 0.8);
      break;
    case "viento":
      for (let i = 0; i < 3; i++) setTimeout(() => v.ring(ground.clone().setY(0.1 + i * 0.7), "#9dffd0", 1.2 * power + i * 0.4, 0.5), i * 70);
      v.burst(pos, "#c8ffe6", Math.round(20 * power), 5 * power, { life: 0.6, size: 0.18, gravity: -1 });
      if (power > 1) st.vfx.emitter(spiral(v, ground, "#7dffc0", 0.9));
      break;
    case "rayo":
      v.lightning(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 7, 0)), pos, "#fff27a", 0.28);
      if (power > 1) { v.lightning(pos.clone().add(new THREE.Vector3(1.2, 7, 0.5)), pos, "#ffffff", 0.35); v.lightning(pos.clone().add(new THREE.Vector3(-1.2, 7, -0.5)), pos, "#ffe14d", 0.35); }
      v.burst(pos, "#fff27a", Math.round(18 * power), 6 * power, { life: 0.45, size: 0.16, gravity: 3 });
      v.ring(ground, "#fff27a", 1.8 * power, 0.4);
      break;
    case "luz":
      v.pillar(ground, "#fff3c4", 0.7 * power, 8, 0.7); v.ring(ground, "#fff9de", 2 * power, 0.55);
      v.burst(pos, "#ffffff", Math.round(18 * power), 3.5, { life: 0.8, size: 0.2, gravity: -1.5 });
      break;
    case "oscuridad":
      v.ring(ground, "#b18cff", 2.2 * power, 0.6); v.disc(ground, "#5a2a9a", 1.8 * power, 0.7, 0.65);
      v.burst(pos, "#c8a0ff", Math.round(20 * power), 3.5 * power, { life: 0.7, size: 0.26, gravity: -1 });
      v.burst(pos, "#2a0a4a", Math.round(10 * power), 2.5, { life: 0.9, size: 0.4 });
      if (power > 1) v.pillar(ground, "#7a3fd0", 1, 6, 0.8);
      break;
    default: v.burst(pos, color, 16, 4);
  }
}

function spiral(v: BattleStage["vfx"], center: THREE.Vector3, color: string, dur: number) {
  const p = new THREE.Vector3();
  return (dt: number, t: number) => {
    for (let i = 0; i < 4; i++) {
      const a = t * 12 + i * 1.6, h = (t / dur) * 5 + i * 0.2, r = 0.5 + h * 0.18;
      v.emit(p.set(center.x + Math.cos(a) * r, h, center.z + Math.sin(a) * r), color, { life: 0.5, size: 0.2, drag: 1 });
    }
    void dt; return t < dur;
  };
}

/** Disparo del atacante hacia el objetivo (proyectil, rayo o haz según elemento). */
export function castFx(st: BattleStage, A: UnitView, target: UnitView, color: string, size = 1) {
  const from = st.handPos(A), to = st.chest(target);
  const el = A.data.element;
  if (el === "rayo") { st.hooks.sfx("beam"); st.vfx.lightning(from, to, color, 0.35); }
  else if (el === "luz" && size > 1) { st.hooks.sfx("beam"); st.vfx.beam(from, to, color, 0.28 * size, 0.4); }
  else st.vfx.projectile(from, to, color, 0.3, 0.26 * size, el === "fuego" || el === "agua" ? 0.7 : 0.2);
  st.vfx.burst(from, color, 8, 2);
}

/** Efecto en el punto de impacto de un golpe normal / habilidad. */
export function impactFx(st: BattleStage, el: Element, target: UnitView, color: string, power: number, melee: boolean, A: UnitView) {
  const c = st.chest(target);
  if (melee) st.vfx.slash(c, A.yaw, color, 1.5 * power, 0.5 - Math.random());
  elementBurst(st, el, c, color, power > 1 ? 1.1 : 0.7);
}

export async function playUltimate(st: BattleStage, b: ActionBeat, A: UnitView, targets: UnitView[], color: string, support: boolean) {
  const el = A.data.element;
  const name = b.ultName ?? A.data.ultimate.name;
  const quick = st.skipUlt;
  const primary = targets[0] ?? A;
  st.face(A, primary.pos);
  st.hooks.sfx("charge");

  if (!quick) {
    st.dim(true); st.title("Técnica Definitiva", name, color);
    const f = new THREE.Vector3(Math.sin(A.yaw), 0, Math.cos(A.yaw));
    const s = new THREE.Vector3(Math.cos(A.yaw), 0, -Math.sin(A.yaw));
    const chest = st.chest(A);
    const cam = chest.clone().addScaledVector(f, 3.4).addScaledVector(s, 1.2).setY(1.9 * A.baseScale);
    st.setCameraView(cam, chest.clone().setY(chest.y + 0.1), 30, 5);
    A.rig.play("ultCharge", 0.1);
    st.vfx.charge(() => st.chest(A), color, 1.4, 2.6, 80);
    st.vfx.disc(A.pos.clone().setY(0.08), color, 3, 1.3, 0.55);
    st.vfx.ring(A.pos.clone().setY(0.1), color, 3, 0.9);
    await st.wait(0.55);
    st.cam.shake(0.14, 0.9);
    st.vfx.ring(A.pos.clone().setY(0.1), "#ffffff", 2.4, 0.6);
    await st.wait(0.85);
  } else {
    A.rig.play("ultCharge", 0.05);
    st.vfx.ring(A.pos.clone().setY(0.1), color, 2.2, 0.5);
    await st.wait(0.3);
  }

  // liberación
  st.hooks.sfx("ult");
  A.rig.play("ultRelease", 0.05);
  st.flash(0.25, 0.55);
  st.dim(false); st.title("", "", null);
  st.focus([A.pos, ...targets.map((t) => t.pos)], { pad: 2, minDist: 8, rate: 5, elev: 0.42, side: 0.5 });
  st.cam.punch(5);
  await st.wait(A.rig.impactTime("ultRelease") * 0.9);

  if (!support) {
    targets.slice(0, 5).forEach((t, i) => setTimeout(() => castFx(st, A, t, color, 2.2), i * 60 / Math.max(0.5, st.timeScale)));
    if (targets.length > 1) elementBurst(st, el, primary.pos.clone().setY(0.4), color, 0.6);
    await st.wait(0.4);
  } else {
    for (const t of targets) st.vfx.pillar(t.pos, color, 0.8, 6, 0.7);
    st.vfx.ring(A.pos.clone().setY(0.1), color, 4, 0.8);
    await st.wait(0.35);
  }

  // clímax: aquí se aplica el daño/curación real
  st.flash(0.5, 0.95);
  st.cam.shake(1.0, 0.7); st.cam.punch(7);
  st.hooks.sfx("boom");
  for (let i = 0; i < b.hits.length; i++) {
    const h = b.hits[i], tv = st.views.get(h.targetUid);
    if (tv && !support && h.kind !== "status") elementBurst(st, el, st.chest(tv), color, 1.6);
    st.applyHit(h, A, color, 2);
    if (i < b.hits.length - 1) await st.wait(0.09);
  }
  await st.wait(0.75);
}
