import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestSession,
  createTestUser,
  resetIdentityTables,
  sessionCookieHeader,
} from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/logout";
const ME_ENDPOINT = "http://example.com/api/identity/me";

describe("POST /api/identity/logout", () => {
  beforeEach(resetIdentityTables);

  it("success path: revokes the session so it can no longer authenticate", async () => {
    const user = await createTestUser();
    const rawToken = await createTestSession(user.id);

    const res = await SELF.fetch(ENDPOINT, {
      method: "POST",
      headers: { Cookie: sessionCookieHeader(rawToken) },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toContain("session_token=;");

    const meAfterLogout = await SELF.fetch(ME_ENDPOINT, {
      headers: { Cookie: sessionCookieHeader(rawToken) },
    });
    expect(meAfterLogout.status).toBe(401);
  });

  it("unauthorized: rejects a request with no session cookie", async () => {
    const res = await SELF.fetch(ENDPOINT, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("unauthorized: rejects a request with an invalid session token", async () => {
    const res = await SELF.fetch(ENDPOINT, {
      method: "POST",
      headers: { Cookie: sessionCookieHeader("not-a-real-token") },
    });
    expect(res.status).toBe(401);
  });
});
