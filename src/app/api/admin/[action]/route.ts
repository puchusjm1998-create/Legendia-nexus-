import { ensureAdmin, fail, getUserFromRequest, json, logError } from "@/lib/auth";
import {
  adminBackup, adminClearErrors, adminData, adminGrant, adminSaveEvent,
  adminSetOverride, adminUpdateBanner, GameError,
} from "@/server/game";

async function requireAdmin(req: Request) {
  await ensureAdmin();
  const user = await getUserFromRequest(req);
  if (!user) return null;
  if (!user.isAdmin) return null;
  return user;
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    const admin = await requireAdmin(req);
    if (!admin) return fail("Acceso restringido a administradores.", 403);
    if (action === "data") return json(await adminData());
    if (action === "backup") {
      const data = await adminBackup();
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="legendia-backup-${Date.now()}.json"`,
        },
      });
    }
    return fail("Acción desconocida.", 404);
  } catch (e) {
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    const admin = await requireAdmin(req);
    if (!admin) return fail("Acceso restringido a administradores.", 403);
    const body = await req.json().catch(() => ({}));
    switch (action) {
      case "grant": return json(await adminGrant(Number(body.userId), body));
      case "banner": return json(await adminUpdateBanner(String(body.key || ""), body));
      case "event": return json(await adminSaveEvent(body));
      case "override": return json(await adminSetOverride(String(body.charKey || ""), body.mult || {}));
      case "clearErrors": return json(await adminClearErrors());
      default: return fail("Acción desconocida.", 404);
    }
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}