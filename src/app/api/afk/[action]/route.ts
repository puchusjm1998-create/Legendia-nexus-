import { fail, getUserFromRequest, json, logError } from "@/lib/auth";
import { GameError } from "@/server/game";
import { claimExpedition, getAfkState, startExpedition } from "@/server/afk";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    if ((await ctx.params).action === "state") return json(await getAfkState(user.id));
    return fail("Acción desconocida.", 404);
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    const body = await req.json().catch(() => ({}));
    // Nota: el cuerpo NUNCA incluye tiempos; el servidor usa su propio reloj.
    if (action === "start") return json(await startExpedition(user.id, String(body?.expKey || ""), body?.charIds));
    if (action === "claim") return json(await claimExpedition(user.id, Number(body?.id), false));
    if (action === "recall") return json(await claimExpedition(user.id, Number(body?.id), true));
    return fail("Acción desconocida.", 404);
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}
