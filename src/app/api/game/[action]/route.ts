import { fail, getUserFromRequest, json, logError } from "@/lib/auth";
import {
  GameError, getFullState, levelUpChar, transformChar, skillUpChar,
  toggleFavorite, saveTeams, claimDaily, claimAchievement, buyShop,
  saveSettings, SHOP_ITEMS, claimAfk,
} from "@/server/game";

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    if (action === "state") return json(await getFullState(user.id));
    if (action === "shop") return json({ items: SHOP_ITEMS });
    return fail("Acción desconocida.", 404);
  } catch (e) {
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
    switch (action) {
      case "levelup": return json(await levelUpChar(user.id, Number(body.charId), Number(body.times || 1)));
      case "transform": return json(await transformChar(user.id, Number(body.charId)));
      case "skillup": return json(await skillUpChar(user.id, Number(body.charId)));
      case "favorite": return json(await toggleFavorite(user.id, Number(body.charId)));
      case "teams": return json(await saveTeams(user.id, body.teams));
      case "daily": return json(await claimDaily(user.id));
      case "achievement": return json(await claimAchievement(user.id, String(body.key || "")));
      case "shop": return json(await buyShop(user.id, String(body.itemId || "")));
      case "settings": return json(await saveSettings(user.id, body));
      case "afk": return json(await claimAfk(user.id));
      default: return fail("Acción desconocida.", 404);
    }
  } catch (e) {
    if (e instanceof GameError) return fail(e.message, e.status);
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}