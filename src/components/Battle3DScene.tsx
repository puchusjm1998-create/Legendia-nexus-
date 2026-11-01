// ============================================================
// LEGENDIA NEXUS — Escenario y Modelos de Combate 3D (Three.js)
// Anime JRPG: Modelos procedurales articulados, cámaras cinemáticas y FX
// ============================================================
"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Unit } from "@/game/combat";
import type { BattleFrame } from "@/game/battle-engine";
import { GRID_W, GRID_H } from "@/game/combat";

interface Battle3DSceneProps {
  units: Unit[];
  currentUid: number | null;
  moveTiles: { x: number; y: number }[];
  validTargets: Unit[];
  selectedAction: "attack" | "skill" | "ultimate" | null;
  onTileClick: (x: number, y: number) => void;
  onUnitClick: (u: Unit) => void;
  lastEvent: { kind: string; uid?: number; targetUid?: number; amount?: number } | null;
  ultHero: Unit | null;
}

// Convertir coordenadas de cuadrícula 7x5 a coordenadas 3D mundiales (X, Z)
export function gridToWorld(x: number, y: number): { x: number; z: number } {
  const cellSize = 1.6;
  const offsetX = ((GRID_W - 1) * cellSize) / 2;
  const offsetZ = ((GRID_H - 1) * cellSize) / 2;
  return {
    x: x * cellSize - offsetX,
    z: y * cellSize - offsetZ,
  };
}

export function Battle3DScene({
  units,
  currentUid,
  moveTiles,
  validTargets,
  selectedAction,
  onTileClick,
  onUnitClick,
  lastEvent,
  ultHero,
}: Battle3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef(units);
  const moveTilesRef = useRef(moveTiles);
  const validTargetsRef = useRef(validTargets);
  const ultHeroRef = useRef(ultHero);
  const onTileClickRef = useRef(onTileClick);
  const onUnitClickRef = useRef(onUnitClick);

  useEffect(() => {
    unitsRef.current = units;
    moveTilesRef.current = moveTiles;
    validTargetsRef.current = validTargets;
    ultHeroRef.current = ultHero;
    onTileClickRef.current = onTileClick;
    onUnitClickRef.current = onUnitClick;
  }, [units, moveTiles, validTargets, ultHero, onTileClick, onUnitClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Detección de software WebGL para optimización de frame pacing
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement("canvas").getContext("webgl2");
        if (!gl) return true;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Renderer Three.js optimizado para móviles/Android
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Escena y Niebla
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070d1c, 0.035);

    // 4. Cámara de Perspectiva Dinámica
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    const defaultCamPos = new THREE.Vector3(0, 8.5, 9.8);
    const defaultCamTarget = new THREE.Vector3(0, 0, 0.2);
    camera.position.copy(defaultCamPos);
    camera.lookAt(defaultCamTarget);

    // 5. Iluminación PBR de Estudio
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0a1224, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.8);
    keyLight.position.set(6, 12, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    rimLight.position.set(-6, 8, -6);
    scene.add(rimLight);

    // 6. Plataforma del Nexo (Arena 3D flotante con glifos)
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // Suelo principal
    const floorGeo = new THREE.CylinderGeometry(7.2, 7.5, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111c33,
      roughness: 0.4,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    arenaGroup.add(floor);

    // Anillo luminoso exterior
    const ringGeo = new THREE.TorusGeometry(7.2, 0.08, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    arenaGroup.add(ring);

    // Glifos interiores
    const innerRingGeo = new THREE.TorusGeometry(4.2, 0.04, 16, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    arenaGroup.add(innerRing);

    // Casillas del Grid 7x5
    const tileGroup = new THREE.Group();
    scene.add(tileGroup);

    const tileMeshes: { mesh: THREE.Mesh; x: number; y: number }[] = [];
    const tileGeo = new THREE.BoxGeometry(1.4, 0.04, 1.4);

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const { x: wx, z: wz } = gridToWorld(x, y);
        const tileMat = new THREE.MeshStandardMaterial({
          color: (x + y) % 2 === 0 ? 0x162645 : 0x1b2f56,
          roughness: 0.6,
          metalness: 0.2,
          transparent: true,
          opacity: 0.8,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(wx, 0.02, wz);
        tileGroup.add(tile);
        tileMeshes.push({ mesh: tile, x, y });
      }
    }

    // Partículas cósmicas del Vórtice
    const partCount = 180;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      partPos[i * 3] = (Math.random() - 0.5) * 20;
      partPos[i * 3 + 1] = Math.random() * 8;
      partPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // 7. Mapa de unidades 3D instanciadas/articuladas
    const unitMeshMap = new Map<number, THREE.Group>();

    // Generador de modelos 3D anime JRPG (3-12 partes procedurales)
    function build3DAnimeUnit(unit: Unit): THREE.Group {
      const g = new THREE.Group();

      const colorHex = parseInt(unit.color.replace("#", "0x"), 16) || 0x38bdf8;
      const isAlly = unit.side === "ally";

      // 1. Pedestal con aura de facción
      const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.1, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isAlly ? 0x0284c7 : 0xbe123c,
        roughness: 0.3,
        metalness: 0.8,
      });
      const pedestal = new THREE.Mesh(baseGeo, baseMat);
      pedestal.position.y = 0.05;
      g.add(pedestal);

      // Anillo de energía en el suelo
      const auraRingGeo = new THREE.TorusGeometry(0.68, 0.03, 12, 32);
      const auraRingMat = new THREE.MeshBasicMaterial({
        color: colorHex,
      });
      const auraRing = new THREE.Mesh(auraRingGeo, auraRingMat);
      auraRing.rotation.x = Math.PI / 2;
      auraRing.position.y = 0.06;
      g.add(auraRing);

      // 2. Piernas y Botas
      const legGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 12);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.16, 0.35, 0);
      g.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.16, 0.35, 0);
      g.add(rightLeg);

      // 3. Torso y Armadura Anime
      const torsoGeo = new THREE.BoxGeometry(0.48, 0.55, 0.28);
      const torsoMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.5,
      });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.85;
      g.add(torso);

      // Cinturón / Faja
      const beltGeo = new THREE.BoxGeometry(0.5, 0.1, 0.3);
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.y = 0.6;
      g.add(belt);

      // 4. Cabeza y Pelo Anime
      const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfd0, roughness: 0.8 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.32;
      g.add(head);

      // Pelo estilizado puntiagudo anime
      const hairGeo = new THREE.ConeGeometry(0.28, 0.45, 8);
      const hairColor = unit.transformed ? 0xfacc15 : isAlly ? colorHex : 0x475569;
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.48, -0.05);
      hair.rotation.x = -0.3;
      g.add(hair);

      // 5. Hombreras / Capa
      const pauldronGeo = new THREE.BoxGeometry(0.2, 0.15, 0.25);
      const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      const leftP = new THREE.Mesh(pauldronGeo, pauldronMat);
      leftP.position.set(-0.32, 1.05, 0);
      g.add(leftP);
      const rightP = new THREE.Mesh(pauldronGeo, pauldronMat);
      rightP.position.set(0.32, 1.05, 0);
      g.add(rightP);

      // 6. Arma Procedural Distintiva
      const weaponGroup = new THREE.Group();
      if (unit.range > 1) {
        // Bastón / Orbe místico o Arco
        const staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.38, 0.9, 0.15);
        weaponGroup.add(staff);

        const orbGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const orbMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(0.38, 1.6, 0.15);
        weaponGroup.add(orb);
      } else {
        // Espada / Katana / Masamune
        const bladeLength = unit.boss ? 1.6 : 1.1;
        const bladeGeo = new THREE.BoxGeometry(0.06, bladeLength, 0.12);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(0.38, 0.9 + bladeLength / 4, 0.1);
        blade.rotation.z = -0.25;
        weaponGroup.add(blade);
      }
      g.add(weaponGroup);

      // 7. Si es jefe o transformado: Alas o Aura Cósmica
      if (unit.transformed || unit.boss) {
        const wingGeo = new THREE.ConeGeometry(0.35, 1.2, 4);
        const wingMat = new THREE.MeshStandardMaterial({
          color: unit.boss ? 0x9333ea : 0xfbbf24,
          transparent: true,
          opacity: 0.85,
        });
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-0.4, 1.1, -0.3);
        leftWing.rotation.set(-0.3, 0.2, 0.8);
        g.add(leftWing);

        if (!unit.key.includes("sephiroth")) {
          const rightWing = new THREE.Mesh(wingGeo, wingMat);
          rightWing.position.set(0.4, 1.1, -0.3);
          rightWing.rotation.set(-0.3, -0.2, -0.8);
          g.add(rightWing);
        }
      }

      // Orientación: Aliados miran hacia la derecha (+X), enemigos hacia la izquierda (-X)
      g.rotation.y = isAlly ? Math.PI / 2 : -Math.PI / 2;

      return g;
    }

    // Raycaster para clics e interacción táctil en 3D
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (evt: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // 1. Detectar clic en unidades vivas
      const currentUnits = unitsRef.current;
      for (const u of currentUnits) {
        if (!u.alive) continue;
        const mesh = unitMeshMap.get(u.uid);
        if (!mesh) continue;
        const hits = raycaster.intersectObjects(mesh.children, true);
        if (hits.length > 0) {
          onUnitClickRef.current(u);
          return;
        }
      }

      // 2. Detectar clic en casillas del grid
      const intersects = raycaster.intersectObjects(tileGroup.children);
      if (intersects.length > 0) {
        const hitTile = tileMeshes.find((t) => t.mesh === intersects[0].object);
        if (hitTile) {
          onTileClickRef.current(hitTile.x, hitTile.y);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // 8. Bucle de Render y Cinemáticas
    let animId = 0;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Rotar ligeramente partículas cósmicas
      particles.rotation.y = elapsed * 0.05;

      // Actualizar casillas de movimiento y selección
      const currentMoves = moveTilesRef.current;
      for (const t of tileMeshes) {
        const isMove = currentMoves.some((m) => m.x === t.x && m.y === t.y);
        const mat = t.mesh.material as THREE.MeshStandardMaterial;
        if (isMove) {
          mat.color.setHex(0x06b6d4);
          mat.opacity = 0.9;
          t.mesh.position.y = 0.08 + Math.sin(elapsed * 5) * 0.02;
        } else {
          mat.color.setHex((t.x + t.y) % 2 === 0 ? 0x162645 : 0x1b2f56);
          mat.opacity = 0.8;
          t.mesh.position.y = 0.02;
        }
      }

      // Sincronizar unidades con la escena
      const currentUnits = unitsRef.current;
      for (const u of currentUnits) {
        let group = unitMeshMap.get(u.uid);
        if (!group) {
          group = build3DAnimeUnit(u);
          scene.add(group);
          unitMeshMap.set(u.uid, group);
        }

        const { x: tx, z: tz } = gridToWorld(u.x, u.y);

        // Interpolación suave de posición (desplazamiento suave entre casillas)
        group.position.x = THREE.MathUtils.damp(group.position.x, tx, 8, dt);
        group.position.z = THREE.MathUtils.damp(group.position.z, tz, 8, dt);

        if (!u.alive) {
          group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, 0, 5, dt));
          group.visible = group.scale.x > 0.05;
        } else {
          group.visible = true;
          group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, 1, 6, dt));
          // Animación de respiración / flotación idle
          const breath = Math.sin(elapsed * 2.5 + u.uid) * 0.04;
          group.position.y = breath;
        }
      }

      // Cámara Cinemática para Técnicas Definitivas
      const currentUlt = ultHeroRef.current;
      if (currentUlt) {
        const { x: ux, z: uz } = gridToWorld(currentUlt.x, currentUlt.y);
        const camTarget = new THREE.Vector3(ux, 1.2, uz);
        const camOrbit = new THREE.Vector3(
          ux + Math.cos(elapsed * 3) * 3.2,
          1.8 + Math.sin(elapsed * 2) * 0.5,
          uz + Math.sin(elapsed * 3) * 3.2
        );
        camera.position.lerp(camOrbit, 0.1);
        camera.lookAt(camTarget);
      } else {
        camera.position.lerp(defaultCamPos, 0.06);
        camera.lookAt(defaultCamTarget);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    // Ajuste dinámico de pantalla / resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none cursor-pointer overflow-hidden touch-none"
      style={{ minHeight: "360px" }}
    />
  );
}
