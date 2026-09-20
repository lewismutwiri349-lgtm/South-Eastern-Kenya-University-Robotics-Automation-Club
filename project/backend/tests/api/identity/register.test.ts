import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { resetIdentityTables, uniqueEmail, uniqueIp, getUserByEmail } from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/register";

function register(body: unknown, ip: string) {
  return SELF.fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/identity/register", () => {
  beforeEach(resetIdentityTables);

  it("success path: creates an account with the default applicant role", async () => {
    const email = uniqueEmail();
    const res = await register(
      { email, password: "correct-horse-battery", firstName: "Ada", lastName: "Lovelace" },
      uniqueIp()
    );

    expect(res.status).toBe(201);
    const json = await res.json<{ data: { userId: string } }>();
    expect(json.data.userId).toBeTruthy();

    const user = await getUserByEmail(email);
    expect(user).toBeDefined();
    expect(user.role).toBe("applicant");
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("validation failure: rejects a password shorter than the policy minimum", async () => {
    const res = await register(
      { email: uniqueEmail(), password: "short", firstName: "Ada", lastName: "Lovelace" },
      uniqueIp()
    );

    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error).toBeDefined();
  });

  it("validation failure: rejects a malformed email", async () => {
    const res = await register(
      { email: "not-an-email", password: "correct-horse-battery", firstName: "Ada", lastName: "Lovelace" },
      uniqueIp()
    );

    expect(res.status).toBe(400);
  });

  it("conflict: rejects a second registration with the same email", async () => {
    const email = uniqueEmail();
    const ip = uniqueIp();
    const first = await register(
      { email, password: "correct-horse-battery", firstName: "Ada", lastName: "Lovelace" },
      ip
    );
    expect(first.status).toBe(201);

    const second = await register(
      { email, password: "another-correct-pw", firstName: "Ada", lastName: "Lovelace" },
      ip
    );
    expect(second.status).toBe(409);
    const json = await second.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("EMAIL_TAKEN");
  });

  it("rate limiting: the 6th request from the same IP within the window is rejected", async () => {
    const ip = uniqueIp();
    let last;
    for (let i = 0; i < 6; i++) {
      last = await register(
        { email: uniqueEmail(), password: "correct-horse-battery", firstName: "Ada", lastName: "Lovelace" },
        ip
      );
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
