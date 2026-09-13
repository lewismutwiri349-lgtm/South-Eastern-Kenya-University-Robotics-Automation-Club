import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { emailVerificationTokens } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { generateToken, hashToken } from "../../../src/services/identity/tokens";
import {
  createTestUser,
  env,
  getUserByEmail,
  resetIdentityTables,
} from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/verify-email";

function verify(token: unknown) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

async function issueToken(userId: string, expiresInMs: number) {
  const db = createDb(env);
  const rawToken = generateToken();
  await db.insert(emailVerificationTokens).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: await hashToken(rawToken),
    expiresAt: new Date(Date.now() + expiresInMs),
    createdAt: new Date(),
  });
  return rawToken;
}

describe("POST /api/identity/verify-email", () => {
  beforeEach(resetIdentityTables);

  it("success path: marks the account verified and consumes the token", async () => {
    const user = await createTestUser({ verified: false });
    const rawToken = await issueToken(user.id, 60_000);

    const res = await verify(rawToken);
    expect(res.status).toBe(200);

    const updated = await getUserByEmail(user.email);
    expect(updated.emailVerifiedAt).not.toBeNull();

    // Single-use: the same token can't be replayed.
    const replay = await verify(rawToken);
    expect(replay.status).toBe(400);
  });

  it("validation failure: rejects an empty token", async () => {
    const res = await verify("");
    expect(res.status).toBe(400);
  });

  it("business failure: rejects an unknown token", async () => {
    const res = await verify("not-a-real-token");
    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("INVALID_TOKEN");
  });

  it("business failure: rejects an expired token", async () => {
    const user = await createTestUser({ verified: false });
    const rawToken = await issueToken(user.id, -1000);

    const res = await verify(rawToken);
    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("TOKEN_EXPIRED");
  });
});
