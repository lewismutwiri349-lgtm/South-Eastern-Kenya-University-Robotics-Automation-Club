import { eq } from "drizzle-orm";
import { users } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { verifyPassword } from "./password";
import { createSession } from "./session-service";
import type { Env } from "../../types/env";
import type { LoginInput } from "../../schemas/identity";

// Deliberately generic — never reveals whether the email or password was
// the wrong part, per common credential-enumeration prevention practice.
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("Please verify your email before logging in");
    this.name = "EmailNotVerifiedError";
  }
}

export async function loginUser(
  env: Env,
  input: LoginInput
): Promise<{ rawToken: string; expiresAt: Date; userId: string; role: string }> {
  const db = createDb(env);

  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerifiedAt) {
    throw new EmailNotVerifiedError();
  }

  const { rawToken, expiresAt } = await createSession(env, user.id);

  return { rawToken, expiresAt, userId: user.id, role: user.role };
}
