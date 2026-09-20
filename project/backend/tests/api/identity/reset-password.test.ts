import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { passwordResetTokens } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { generateToken, hashToken } from "../../../src/services/identity/tokens";
import {
  createTestSession,
  createTestUser,
  env,
  resetIdentityTables,
  sessionCookieHeader,
  uniqueIp,
} from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/reset-password";
const ME_ENDPOINT = "http://example.com/api/identity/me";

async function issueResetToken(userId: string, expiresInMs: number) {
  const db = createDb(env);
  const rawToken = generateToken();
  await db.insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: await hashToken(rawToken),
    expiresAt: new Date(Date.now() + expiresInMs),
    createdAt: new Date(),
  });
  return rawToken;
}

function resetPassword(token: unknown, newPassword: unknown) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
}

describe("POST /api/identity/reset-password", () => {
  beforeEach(resetIdentityTables);

  it("success path: updates the password and revokes every existing session", async () => {
    const user = await createTestUser();
    const existingSessionToken = await createTestSession(user.id);
    const rawResetToken = await issueResetToken(user.id, 60_000);

    const res = await resetPassword(rawResetToken, "a-brand-new-password");
    expect(res.status).toBe(200);

    // The old session must no longer authenticate — matches
    // docs/modules/identity-auth.md §6 ("password reset revokes all
    // sessions").
    const meWithOldSession = await SELF.fetch(ME_ENDPOINT, {
      headers: { Cookie: sessionCookieHeader(existingSessionToken) },
    });
    expect(meWithOldSession.status).toBe(401);

    const login = await SELF.fetch("http://example.com/api/identity/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": uniqueIp() },
      body: JSON.stringify({ email: user.email, password: "a-brand-new-password" }),
    });
    expect(login.status).toBe(200);
  });

  it("validation failure: rejects a new password below the policy minimum", async () => {
    const user = await createTestUser();
    const rawResetToken = await issueResetToken(user.id, 60_000);
    const res = await resetPassword(rawResetToken, "short");
    expect(res.status).toBe(400);
  });

  it("business failure: rejects an unknown token", async () => {
    const res = await resetPassword("not-a-real-token", "a-brand-new-password");
    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("INVALID_TOKEN");
  });

  it("business failure: rejects an expired token", async () => {
    const user = await createTestUser();
    const rawResetToken = await issueResetToken(user.id, -1000);
    const res = await resetPassword(rawResetToken, "a-brand-new-password");
    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("TOKEN_EXPIRED");
  });
});
