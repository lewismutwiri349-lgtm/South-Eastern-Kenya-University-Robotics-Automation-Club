import { env as rawEnv } from "cloudflare:test";
import { eq } from "drizzle-orm";
import {
  users,
  sessions,
  emailVerificationTokens,
  passwordResetTokens,
  identityAuditLogs,
  identityRateLimits,
  DEFAULT_USER_ROLE,
  type UserRole,
} from "../../../database/schema";
import { createDb } from "../../src/db/client";
import { hashPassword } from "../../src/services/identity/password";
import { generateToken, hashToken } from "../../src/services/identity/tokens";
import type { Env } from "../../src/types/env";

/**
 * `cloudflare:test`'s `env` is typed as the ambient, wrangler-generated
 * `Cloudflare.Env` — this project deliberately hasn't adopted that
 * generated-types convention (still on `@cloudflare/workers-types` +
 * `src/types/env.ts`, per `docs/03_Technical_Architecture.md`), so the
 * shapes don't structurally match even though the runtime object is the
 * same. Cast once, here, rather than at every call site.
 */
const env = rawEnv as unknown as Env;
export { env };

/**
 * The Workers test pool does not give each `it()` a fresh D1 instance (only
 * each test *file* starts clean) — confirmed empirically while wiring this
 * up. Every test that touches the database calls this first so tests stay
 * independent per `docs/10_Testing_Standards.md` §4, rather than relying on
 * insertion order or a shared implicit fixture.
 */
export async function resetIdentityTables(): Promise<void> {
  const db = createDb(env);
  await db.delete(identityAuditLogs);
  await db.delete(identityRateLimits);
  await db.delete(passwordResetTokens);
  await db.delete(emailVerificationTokens);
  await db.delete(sessions);
  await db.delete(users);
}

let uniqueCounter = 0;
/** A fresh per-call value so parallel/adjacent tests never collide. */
export function uniqueEmail(): string {
  uniqueCounter += 1;
  return `user${Date.now()}${uniqueCounter}@example.com`;
}

/** A fresh per-call IP so the shared rate limiter doesn't leak across tests. */
export function uniqueIp(): string {
  uniqueCounter += 1;
  return `10.0.${uniqueCounter % 255}.${(uniqueCounter * 7) % 255}`;
}

export const VALID_PASSWORD = "correct-horse-battery";

/** Inserts a user directly, bypassing the registration flow, for tests that need an existing account. */
export async function createTestUser(overrides?: {
  email?: string;
  password?: string;
  role?: UserRole;
  verified?: boolean;
  failedLoginCount?: number;
  lockedUntil?: Date | null;
}): Promise<{ id: string; email: string; password: string; role: UserRole }> {
  const db = createDb(env);
  const id = crypto.randomUUID();
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? VALID_PASSWORD;
  const role = overrides?.role ?? DEFAULT_USER_ROLE;
  const now = new Date();

  await db.insert(users).values({
    id,
    email,
    passwordHash: await hashPassword(password),
    firstName: "Test",
    lastName: "User",
    role,
    emailVerifiedAt: overrides?.verified === false ? null : now,
    failedLoginCount: overrides?.failedLoginCount ?? 0,
    lockedUntil: overrides?.lockedUntil ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, email, password, role };
}

/** Creates a session for a user and returns the raw cookie token, for tests exercising authenticated routes. */
export async function createTestSession(userId: string): Promise<string> {
  const db = createDb(env);
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const now = new Date();

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
    createdAt: now,
    lastUsedAt: now,
  });

  return rawToken;
}

export async function getUserByEmail(email: string) {
  const db = createDb(env);
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export function sessionCookieHeader(rawToken: string): string {
  return `session_token=${rawToken}`;
}
