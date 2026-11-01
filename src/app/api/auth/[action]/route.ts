import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession, ensureAdmin, fail, getUserFromRequest,
  json, logError, registerUser, verifyPassword,
} from "@/lib/auth";
import { logoutUser } from "@/server/game";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    await ensureAdmin();
    if (action === "register") {
      const { username, password } = await req.json();
      const name = String(username || "").trim();
      if (!/^[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ-]{3,20}$/.test(name))
        return fail("Nombre de usuario inválido (3-20 caracteres, letras/números).");
      if (typeof password !== "string" || password.length < 6)
        return fail("La contraseña debe tener al menos 6 caracteres.");
      const exists = await db.select().from(users).where(eq(users.username, name)).limit(1);
      if (exists.length) return fail("Ese nombre de invocador ya existe.", 409);
      const user = await registerUser(name, password);
      const token = await createSession(user.id);
      return json({ token, username: user.username, isAdmin: user.isAdmin });
    }
    if (action === "login") {
      const { username, password } = await req.json();
      const name = String(username || "").trim();
      const rows = await db.select().from(users).where(eq(users.username, name)).limit(1);
      if (!rows.length || !verifyPassword(String(password || ""), rows[0].salt, rows[0].passwordHash))
        return fail("Credenciales incorrectas.", 401);
      const token = await createSession(rows[0].id);
      return json({ token, username: rows[0].username, isAdmin: rows[0].isAdmin });
    }
    if (action === "logout") {
      const header = req.headers.get("authorization") || "";
      if (header.startsWith("Bearer ")) await logoutUser(header.slice(7));
      return json({ ok: true });
    }
    return fail("Acción desconocida.", 404);
  } catch (e) {
    await logError(e);
    return fail("Error interno del servidor.", 500);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action === "me") {
    const user = await getUserFromRequest(req);
    if (!user) return fail("No autenticado.", 401);
    return json(user);
  }
  return fail("Acción desconocida.", 404);
}

