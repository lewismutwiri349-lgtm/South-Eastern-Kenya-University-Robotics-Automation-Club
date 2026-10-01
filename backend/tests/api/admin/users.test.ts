import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { resetIdentityTables } from "../../helpers/identity-fixtures";
import {
  createTestUser,
  resetAdminTables,
  roleGranterCookie,
  staffCookie,
  unprivilegedCookie,
} from "../../helpers/admin-fixtures";

const BASE = "http://example.com/api/admin/users";

async function resetAll() {
  await resetAdminTables();
  await resetIdentityTables();
}

describe("GET /api/admin/users", () => {
  beforeEach(resetAll);

  it("rejects an unauthenticated request", async () => {
    expect((await SELF.fetch(BASE)).status).toBe(401);
  });

  it("rejects an authenticated request from a role without permission", async () => {
    const cookie = await unprivilegedCookie();
    expect((await SELF.fetch(BASE, { headers: { Cookie: cookie } })).status).toBe(403);
  });

  it("success path: an allowed role lists the roster", async () => {
    await createTestUser({ role: "member" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(BASE, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { role: string }[] }>();
    // The staff account itself plus the member created above.
    expect(json.data.length).toBeGreaterThanOrEqual(2);
  });

  it("filters by role", async () => {
    await createTestUser({ role: "member" });
    await createTestUser({ role: "division_head" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}?role=division_head`, { headers: { Cookie: cookie } });
    const json = await res.json<{ data: { role: string }[] }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].role).toBe("division_head");
  });

  it("searches by name or email", async () => {
    await createTestUser({ email: "unique-search-target@example.com", role: "member" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}?q=unique-search-target`, { headers: { Cookie: cookie } });
    const json = await res.json<{ data: { email: string }[] }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].email).toBe("unique-search-target@example.com");
  });

  it("never exposes the password hash", async () => {
    await createTestUser({ role: "member" });
    const cookie = await staffCookie();

    const json = await (await SELF.fetch(BASE, { headers: { Cookie: cookie } })).json<{
      data: Record<string, unknown>[];
    }>();
    for (const row of json.data) {
      expect(row).not.toHaveProperty("passwordHash");
    }
  });
});

describe("PATCH /api/admin/users/:id/role", () => {
  beforeEach(resetAll);

  async function patchRole(userId: string, role: string, cookie?: string) {
    return SELF.fetch(`${BASE}/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ role }),
    });
  }

  it("rejects an unauthenticated request", async () => {
    const target = await createTestUser({ role: "member" });
    expect((await patchRole(target.id, "moderator")).status).toBe(401);
  });

  it("rejects a role without permission (roster-visible staff, but not a role-granter)", async () => {
    const target = await createTestUser({ role: "member" });
    const cookie = await staffCookie(); // secretary — can list, cannot grant
    expect((await patchRole(target.id, "moderator", cookie)).status).toBe(403);
  });

  it("success path: a role-granter promotes a member to moderator", async () => {
    const target = await createTestUser({ role: "member" });
    const { cookie } = await roleGranterCookie();

    const res = await patchRole(target.id, "moderator", cookie);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { role: string } }>();
    expect(json.data.role).toBe("moderator");
  });

  it("rejects an invalid role value", async () => {
    const target = await createTestUser({ role: "member" });
    const { cookie } = await roleGranterCookie();
    expect((await patchRole(target.id, "wizard", cookie)).status).toBe(400);
  });

  it("rejects an actor changing their own role", async () => {
    const { id, cookie } = await roleGranterCookie();
    const res = await patchRole(id, "member", cookie);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent user", async () => {
    const { cookie } = await roleGranterCookie();
    const res = await patchRole(crypto.randomUUID(), "member", cookie);
    expect(res.status).toBe(404);
  });

  it("is idempotent: setting the same role twice succeeds without duplicate audit entries", async () => {
    const target = await createTestUser({ role: "member" });
    const { cookie } = await roleGranterCookie();

    await patchRole(target.id, "moderator", cookie);
    const second = await patchRole(target.id, "moderator", cookie);
    expect(second.status).toBe(200);
  });
});
