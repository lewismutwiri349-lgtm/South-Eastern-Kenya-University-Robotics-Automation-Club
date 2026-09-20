import { eq } from "drizzle-orm";
import { users } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { verifyPassword } from "./password";
import { createSession } from "./session-service";
import { recordIdentityAuditEvent } from "./audit-service";
import { calculateFailedLoginState, isAccountLocked } from "./login-policy";
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

export class AccountLockedError extends Error {
  constructor() {
    super("This account is temporarily locked. Try again later.");
    this.name = "AccountLockedError";
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

  if (isAccountLocked(user.lockedUntil)) {
    await recordIdentityAuditEvent(env, { action: "login_failed", targetUserId: user.id });
    throw new AccountLockedError();
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    await recordFailedLogin(env, user.id, user.failedLoginCount);
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerifiedAt) {
    throw new EmailNotVerifiedError();
  }

  await resetFailedLoginState(env, user.id);
  const { rawToken, expiresAt } = await createSession(env, user.id);
  await recordIdentityAuditEvent(env, { action: "login_succeeded", actorUserId: user.id });

  return { rawToken, expiresAt, userId: user.id, role: user.role };
}

async function recordFailedLogin(env: Env, userId: string, failedLoginCount: number): Promise<void> {
  const db = createDb(env);
  const state = calculateFailedLoginState(failedLoginCount);
  await db
    .update(users)
    .set({ ...state, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await recordIdentityAuditEvent(env, { action: "login_failed", targetUserId: userId });

  if (state.lockedUntil) {
    await recordIdentityAuditEvent(env, { action: "account_locked", targetUserId: userId });
  }
}

async function resetFailedLoginState(env: Env, userId: string): Promise<void> {
  const db = createDb(env);
  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
