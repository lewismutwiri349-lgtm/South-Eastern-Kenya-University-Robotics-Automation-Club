import { SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { passwordResetTokens } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { createTestUser, env, resetIdentityTables, uniqueIp } from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/request-password-reset";

function requestReset(email: string, ip: string) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email }),
  });
}

describe("POST /api/identity/request-password-reset", () => {
  beforeEach(resetIdentityTables);

  it("success path: issues a reset token for a real account", async () => {
    const user = await createTestUser();
    const res = await requestReset(user.email, uniqueIp());
    expect(res.status).toBe(200);

    const db = createDb(env);
    const tokens = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));
    expect(tokens).toHaveLength(1);
  });

  it("no enumeration: an unregistered email gets the identical generic response", async () => {
    const known = await requestReset((await createTestUser()).email, uniqueIp());
    const unknown = await requestReset("nobody-registered@example.com", uniqueIp());

    expect(unknown.status).toBe(known.status);
    const [knownBody, unknownBody] = await Promise.all([known.json(), unknown.json()]);
    expect(unknownBody).toEqual(knownBody);
  });

  it("validation failure: rejects a malformed email", async () => {
    const res = await requestReset("not-an-email", uniqueIp());
    expect(res.status).toBe(400);
  });

  it("rate limiting: the 6th request from the same IP within the window is rejected", async () => {
    const ip = uniqueIp();
    let last;
    for (let i = 0; i < 6; i++) {
      last = await requestReset("nobody-registered@example.com", ip);
    }
    expect(last!.status).toBe(429);
  });
});
