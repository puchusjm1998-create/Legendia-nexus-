import { fail, getUserFromRequest, json, logError } from "@/lib/auth";
import { actBattle, getActiveBattle, GameError, retreatBattle, startBattle } from "@/server/game";

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    if ((await ctx.params).action === "active") return json(await getActiveBattle(user.id));
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
    if (action === "start")
      return json(await startBattle(user.id, String(body?.missionId || ""), Number(body?.teamIndex ?? 0)));
    if (action === "action")
      return json(await actBattle(user.id, String(body?.token || ""), body?.command));
    if (action === "retreat" || action === "finish") {
      // Compatibilidad con la URL antigua, nunca con el resultado enviado por el navegador.
      if (body?.victory === true) return fail("El servidor determina las victorias; envía acciones a /battle/action.");
      return json(await retreatBattle(user.id, String(body?.token || "")));
    }
    return fail("Acción desconocida.", 404);
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}
