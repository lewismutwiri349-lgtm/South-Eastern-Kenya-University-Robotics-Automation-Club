import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type { UserRole } from "../../../../database/schema";
import {
  createTestSession,
  createTestUser,
  resetIdentityTables,
  sessionCookieHeader,
} from "../../helpers/identity-fixtures";

const ENDPOINT = "http://example.com/api/identity/users";

async function fetchAsRole(role: UserRole) {
  const user = await createTestUser({ role });
  const rawToken = await createTestSession(user.id);
  return SELF.fetch(ENDPOINT, { headers: { Cookie: sessionCookieHeader(rawToken) } });
}

/**
 * Per docs/10_Testing_Standards.md §3, every protected route must assert
 * all three permission-boundary cases. This is Identity's only
 * `requireRole`-gated route (per docs/modules/identity-auth.md §5), so it's
 * where the full allowed/denied role matrix from docs/07_User_Roles.md §4
 * gets exercised end to end.
 */
describe("GET /api/identity/users", () => {
  beforeEach(resetIdentityTables);

  it("1. unauthenticated request is rejected (401)", async () => {
    const res = await SELF.fetch(ENDPOINT);
    expect(res.status).toBe(401);
  });

  const deniedRoles = [
    "applicant",
    "member",
    "moderator",
    "project_leader",
    "division_head",
    "treasurer",
  ] as const;

  it.each(deniedRoles)("2. authenticated %s (no permission) is rejected (403)", async (role) => {
    const res = await fetchAsRole(role);
    expect(res.status).toBe(403);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  const allowedRoles = ["super_admin", "chairperson", "vice_chairperson", "secretary"] as const;

  it.each(allowedRoles)("3. authenticated %s (has permission) succeeds (200)", async (role) => {
    const res = await fetchAsRole(role);
    expect(res.status).toBe(200);
    const json = await res.json<{ data: unknown[] }>();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("success path: returns the roster without password hashes", async () => {
    await createTestUser({ role: "member" });
    const admin = await createTestUser({ role: "super_admin" });
    const rawToken = await createTestSession(admin.id);

    const res = await SELF.fetch(ENDPOINT, { headers: { Cookie: sessionCookieHeader(rawToken) } });
    expect(res.status).toBe(200);
    const json = await res.json<{ data: Record<string, unknown>[] }>();
    expect(json.data).toHaveLength(2);
    for (const row of json.data) {
      expect(row).not.toHaveProperty("passwordHash");
    }
  });
});
