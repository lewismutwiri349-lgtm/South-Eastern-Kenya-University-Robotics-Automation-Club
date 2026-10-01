import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { resetIdentityTables } from "../../helpers/identity-fixtures";
import {
  createTestApplication,
  createTestUser,
  getMemberProfileByUserId,
  resetAdminTables,
  staffCookie,
  unprivilegedCookie,
} from "../../helpers/admin-fixtures";

const BASE = "http://example.com/api/admin/applications";

async function resetAll() {
  await resetAdminTables();
  await resetIdentityTables();
}

describe("GET /api/admin/applications", () => {
  beforeEach(resetAll);

  it("rejects an unauthenticated request", async () => {
    expect((await SELF.fetch(BASE)).status).toBe(401);
  });

  it("rejects a role without permission", async () => {
    const cookie = await unprivilegedCookie();
    expect((await SELF.fetch(BASE, { headers: { Cookie: cookie } })).status).toBe(403);
  });

  it("success path: lists applications across all applicants, filterable by status", async () => {
    const applicantA = await createTestUser({ role: "applicant" });
    const applicantB = await createTestUser({ role: "applicant" });
    await createTestApplication({ userId: applicantA.id, status: "interviewed" });
    await createTestApplication({ userId: applicantB.id, status: "test_failed" });

    const cookie = await staffCookie();

    const all = await (await SELF.fetch(BASE, { headers: { Cookie: cookie } })).json<{
      data: { status: string }[];
    }>();
    expect(all.data).toHaveLength(2);

    const filtered = await (
      await SELF.fetch(`${BASE}?status=interviewed`, { headers: { Cookie: cookie } })
    ).json<{ data: { status: string }[] }>();
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0].status).toBe("interviewed");
  });
});

describe("GET /api/admin/applications/:id", () => {
  beforeEach(resetAll);

  it("returns 404 for a non-existent application", async () => {
    const cookie = await staffCookie();
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(404);
  });

  it("success path: fetches any applicant's application, not just the caller's own", async () => {
    const applicant = await createTestUser({ role: "applicant" });
    const application = await createTestApplication({ userId: applicant.id, status: "interviewed" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}/${application.id}`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const json = await res.json<{ data: { id: string } }>();
    expect(json.data.id).toBe(application.id);
  });
});

describe("POST /api/admin/applications/:id/accept", () => {
  beforeEach(resetAll);

  it("rejects an unauthenticated request", async () => {
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}/accept`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejects a role without permission", async () => {
    const cookie = await unprivilegedCookie();
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}/accept`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });

  it("rejects accepting an application that hasn't reached 'interviewed'", async () => {
    const applicant = await createTestUser({ role: "applicant" });
    const application = await createTestApplication({ userId: applicant.id, status: "test_passed" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}/${application.id}/accept`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(409);
  });

  it("success path: accepting promotes the user to member and creates a profile", async () => {
    const applicant = await createTestUser({ role: "applicant" });
    const application = await createTestApplication({
      userId: applicant.id,
      status: "interviewed",
      divisionPreferencePrimary: "avionics",
    });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}/${application.id}/accept`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { status: string } }>();
    expect(json.data.status).toBe("accepted");

    const profile = await getMemberProfileByUserId(applicant.id);
    expect(profile).not.toBeNull();
    expect(profile?.division).toBe("avionics");
  });
});

describe("POST /api/admin/applications/:id/reject", () => {
  beforeEach(resetAll);

  it("rejects a role without permission", async () => {
    const cookie = await unprivilegedCookie();
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("allows rejecting from 'test_failed'", async () => {
    const applicant = await createTestUser({ role: "applicant" });
    const application = await createTestApplication({ userId: applicant.id, status: "test_failed" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}/${application.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ reason: "Did not meet the aptitude threshold" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json<{ data: { status: string } }>();
    expect(json.data.status).toBe("rejected");
  });

  it("rejects rejecting from a status outside the allowed set", async () => {
    const applicant = await createTestUser({ role: "applicant" });
    const application = await createTestApplication({ userId: applicant.id, status: "submitted" });
    const cookie = await staffCookie();

    const res = await SELF.fetch(`${BASE}/${application.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(409);
  });
});
