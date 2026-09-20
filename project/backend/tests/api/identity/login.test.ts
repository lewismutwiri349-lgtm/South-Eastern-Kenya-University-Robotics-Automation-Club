import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestUser, resetIdentityTables, uniqueIp } from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/login";

function login(email: string, password: string, ip: string) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ email, password }),
  });
}

describe("POST /api/identity/login", () => {
  beforeEach(resetIdentityTables);

  it("success path: sets an httpOnly session cookie and returns the role", async () => {
    const user = await createTestUser();
    const res = await login(user.email, user.password, uniqueIp());

    expect(res.status).toBe(200);
    const json = await res.json<{ data: { userId: string; role: string } }>();
    expect(json.data.userId).toBe(user.id);
    expect(json.data.role).toBe("applicant");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("validation failure: rejects a missing password", async () => {
    const res = await SELF.fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": uniqueIp() },
      body: JSON.stringify({ email: "a@example.com" }),
    });
    expect(res.status).toBe(400);
  });

  it("invalid credentials: wrong password never reveals which field was wrong", async () => {
    const user = await createTestUser();
    const res = await login(user.email, "wrong-password-here", uniqueIp());
    expect(res.status).toBe(401);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("invalid credentials: unknown email returns the same generic error as a wrong password", async () => {
    const res = await login("nobody@example.com", "irrelevant-password", uniqueIp());
    expect(res.status).toBe(401);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("unverified account: rejects login before email verification", async () => {
    const user = await createTestUser({ verified: false });
    const res = await login(user.email, user.password, uniqueIp());
    expect(res.status).toBe(403);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("account lockout: 5 consecutive failed attempts locks the account, even with the correct password on the next try", async () => {
    // Each attempt uses a distinct IP — per-IP rate limiting (5 req/window,
    // see the next test) would otherwise mask account lockout on the 6th
    // request from a single IP before the lockout check is ever reached.
    // This is the realistic case lockout exists for: a distributed
    // (multi-IP) credential-stuffing attempt against one account, which
    // per-IP rate limiting alone can't stop.
    const user = await createTestUser();

    let lastFailure;
    for (let i = 0; i < 5; i++) {
      lastFailure = await login(user.email, "wrong-password", uniqueIp());
    }
    expect(lastFailure!.status).toBe(401);

    const lockedAttempt = await login(user.email, user.password, uniqueIp());
    expect(lockedAttempt.status).toBe(429);
    const json = await lockedAttempt.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("rate limiting: the 6th login request from the same IP within the window is rejected", async () => {
    const user = await createTestUser();
    const ip = uniqueIp();

    let last;
    for (let i = 0; i < 6; i++) {
      last = await login(user.email, "wrong-password", ip);
    }
    expect(last!.status).toBe(429);
  });
});
