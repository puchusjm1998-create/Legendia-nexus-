"use client";
// Visor 3D opcional de la ficha: modelo provisional (o .glb si existe en public/models).
// Toca el modelo para ver sus animaciones. Three.js se carga bajo demanda.
import { useEffect, useRef } from "react";
import { ELEMENTS, CHAR_MAP } from "@/game/catalog";

export function ModelViewer({ charKey, transformed }: { charKey: string; transformed?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const tap = useRef<() => void>(() => {});
  useEffect(() => {
    let disposed = false; let cleanup = () => {};
    (async () => {
      const [THREE, { createRig }, { resolveQuality }] = await Promise.all([
        import("three"), import("@/game3d/models"), import("@/game3d/capability"),
      ]);
      const el = host.current; if (!el || disposed) return;
      const q = resolveQuality("auto");
      const renderer = new THREE.WebGLRenderer({ antialias: q === "high", alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.1, 50);
      cam.position.set(0, 1.6, 7); cam.lookAt(0, 1.1, 0);
      scene.add(new THREE.HemisphereLight("#ffffff", "#334466", 1.5));
      const sun = new THREE.DirectionalLight("#ffffff", 2); sun.position.set(3, 5, 4); scene.add(sun);
      const color = ELEMENTS[CHAR_MAP[charKey]?.element ?? "luz"].color;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; scene.add(disc);
      let rig = createRig(charKey, { quality: q === "low" ? "low" : "high", transformed }, (real) => {
        scene.remove(rig.root); rig.dispose(); rig = real; scene.add(real.root); real.play("idle");
      });
      scene.add(rig.root); rig.play("idle");
      const clips = ["melee", "skill", "victory", "buff", "idle"] as const; let ci = 0, back = 0;
      tap.current = () => { rig.play(clips[ci % clips.length], 0.1); ci++; back = rig.clipDuration(rig.clip) + 0.1; };
      let raf = 0, last = performance.now(), yaw = 0.5;
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        yaw += dt * 0.5; rig.root.rotation.y = yaw; rig.update(dt);
        if (back > 0 && (back -= dt) <= 0 && !["idle", "victory"].includes(rig.clip)) rig.play("idle", 0.15);
        renderer.render(scene, cam);
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); rig.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
      if (disposed) cleanup();
    })().catch((e) => console.warn("[ModelViewer]", e));
    return () => { disposed = true; cleanup(); };
  }, [charKey, transformed]);
  return <div ref={host} onClick={() => tap.current()} className="h-full w-full cursor-pointer" title="Toca para ver animaciones" />;
}
