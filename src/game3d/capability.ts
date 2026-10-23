// Detección de capacidades para decidir 3D alto / ligero / 2D clásico.
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch { return false; }
}

export type ResolvedQuality = "high" | "low" | "2d";
export function resolveQuality(pref: "auto" | "high" | "low" | "2d"): ResolvedQuality {
  if (pref === "2d") return "2d";
  if (!webglAvailable()) return "2d";
  if (pref === "high" || pref === "low") return pref;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const mem = nav.deviceMemory ?? 8, cores = nav.hardwareConcurrency ?? 8;
  if (coarse && (mem < 6 || cores < 8)) return "low";
  if (!coarse && (mem <= 2 || cores <= 2)) return "low";
  return "high";
}
