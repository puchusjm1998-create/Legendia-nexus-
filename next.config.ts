import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el servidor de desarrollo desde un túnel / vista previa remota
  // (p. ej. https://3000-xxxx.e2b.app). No afecta a `next build` / `next start`.
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev", "*.ngrok-free.app", "*.trycloudflare.com", "*.loca.lt"],
};

export default nextConfig;
