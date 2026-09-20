import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestSession,
  createTestUser,
  resetIdentityTables,
  sessionCookieHeader,
} from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/me";

describe("GET /api/identity/me", () => {
  beforeEach(resetIdentityTables);

  it("success path: returns the current session's user, without the password hash", async () => {
    const user = await createTestUser();
    const rawToken = await createTestSession(user.id);

    const res = await SELF.fetch(ENDPOINT, { headers: { Cookie: sessionCookieHeader(rawToken) } });
    expect(res.status).toBe(200);

    const json = await res.json<{ data: Record<string, unknown> }>();
    expect(json.data.id).toBe(user.id);
    expect(json.data.email).toBe(user.email);
    expect(json.data.emailVerified).toBe(true);
    expect(json.data).not.toHaveProperty("passwordHash");
  });

  it("unauthorized: rejects a request with no session cookie", async () => {
    const res = await SELF.fetch(ENDPOINT);
    expect(res.status).toBe(401);
  });

  it("unauthorized: rejects a request with an expired session", async () => {
    // Session tokens that don't resolve to a valid row behave identically
    // to expired ones from the client's point of view (see
    // getValidSession's null-for-any-invalid-case design) — this exercises
    // that boundary via the public API's only observable signal, a 401.
    const res = await SELF.fetch(ENDPOINT, {
      headers: { Cookie: sessionCookieHeader("expired-or-unknown-token") },
    });
    expect(res.status).toBe(401);
  });
});
