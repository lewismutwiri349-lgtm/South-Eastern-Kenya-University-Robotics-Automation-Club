import { SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { emailVerificationTokens } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { generateToken, hashToken } from "../../../src/services/identity/tokens";
import { createTestUser, env, resetIdentityTables, uniqueIp } from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/resend-verification";

function resend(email: string, ip = uniqueIp(), extraHeaders: Record<string, string> = {}) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip, ...extraHeaders },
    body: JSON.stringify({ email }),
  });
}

async function tokensFor(userId: string) {
  return createDb(env)
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
}

describe("POST /api/identity/resend-verification", () => {
  beforeEach(resetIdentityTables);

  it("success path: replaces the old token so only the newest link is valid", async () => {
    const user = await createTestUser({ verified: false });
    const db = createDb(env);
    const oldHash = await hashToken(generateToken());
    await db.insert(emailVerificationTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: oldHash,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });

    const res = await resend(user.email);
    expect(res.status).toBe(200);

    const rows = await tokensFor(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(oldHash);
  });

  it("no enumeration: unknown and already-verified emails get the identical response and no token", async () => {
    const verified = await createTestUser({ verified: true });

    const unknown = await resend("nobody@example.com");
    const known = await resend(verified.email);

    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect(await tokensFor(verified.id)).toHaveLength(0);
  });

  it("validation failure: rejects a malformed email", async () => {
    const res = await resend("not-an-email");
    expect(res.status).toBe(400);
  });

  it("rate limiting: the 6th request from one IP within the window is rejected", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i++) {
      expect((await resend("nobody@example.com", ip)).status).toBe(200);
    }
    expect((await resend("nobody@example.com", ip)).status).toBe(429);
  });

  it("CSRF guard: a request from a foreign browser origin is rejected before any work happens", async () => {
    const user = await createTestUser({ verified: false });
    const res = await resend(user.email, uniqueIp(), { Origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(await tokensFor(user.id)).toHaveLength(0);
  });

  it("CORS: the configured frontend origin is allowed with credentials", async () => {
    const res = await resend("nobody@example.com", uniqueIp(), { Origin: env.FRONTEND_URL });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(env.FRONTEND_URL);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
