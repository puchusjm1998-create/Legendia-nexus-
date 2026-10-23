import { fail, getUserFromRequest, json, logError } from "@/lib/auth";
import { doSummon, GameError } from "@/server/game";

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    const body = await req.json().catch(() => ({}));
    const result = await doSummon(user.id, String(body.bannerKey || ""), Number(body.count || 1));
    return json(result);
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}