import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/require-auth";
import type { Env, AuthVariables } from "../../types/env";

export const meRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

meRoute.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env);

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
  }

  return c.json({
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    },
  });
});
