import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyProjectManagementMigrations,
  resetProjectManagementTables,
  createTestProject,
  createTestUser,
  createTestSession,
  sessionCookieHeader,
  managerCookie,
  memberCookie,
} from "../../helpers/project-fixtures";

const BASE = "http://example.com/api/projects";

beforeAll(applyProjectManagementMigrations);
beforeEach(resetProjectManagementTables);

const VALID_PROJECT = {
  title: "Line Following Robot",
  summary: "A PID-controlled line follower for the annual competition.",
  body: "Full write-up of the build.",
  category: "robotics",
  githubUrl: "https://github.com/seku-rasc/line-follower",
  tags: ["Line Following", "PID"],
};

describe("POST /api/projects", () => {
  it("an authorised role creates a draft project with category, GitHub link and tags", async () => {
    const { cookie } = await managerCookie();
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PROJECT),
    });
    expect(res.status).toBe(201);
    const { data } = await res.json<{ data: { id: string; slug: string } }>();

    const mine = await SELF.fetch(`${BASE}/mine`, { headers: { Cookie: cookie } });
    const { data: mineData } = await mine.json<{ data: { id: string; category: string; tags: string[] }[] }>();
    const created = mineData.find((p) => p.id === data.id);
    expect(created?.category).toBe("robotics");
    expect(created?.tags).toEqual(["line-following", "pid"]);
  });

  it("rejects a GitHub URL that isn't a bare owner/repo", async () => {
    const { cookie } = await managerCookie();
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_PROJECT, githubUrl: "https://github.com/seku-rasc/line-follower/tree/main" }),
    });
    expect(res.status).toBe(400);
  });

  it("unprivileged member: rejected with 403", async () => {
    const { cookie } = await memberCookie();
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PROJECT),
    });
    expect(res.status).toBe(403);
  });

  it("unauthenticated: rejected with 401", async () => {
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PROJECT),
    });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/projects/:id", () => {
  it("replaces the tag set rather than merging it", async () => {
    const { cookie } = await managerCookie();
    const created = await SELF.fetch(BASE, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PROJECT),
    });
    const { data } = await created.json<{ data: { id: string } }>();

    const patched = await SELF.fetch(`${BASE}/${data.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["autonomy"] }),
    });
    expect(patched.status).toBe(200);

    const mine = await SELF.fetch(`${BASE}/mine`, { headers: { Cookie: cookie } });
    const { data: mineData } = await mine.json<{ data: { id: string; tags: string[] }[] }>();
    expect(mineData.find((p) => p.id === data.id)?.tags).toEqual(["autonomy"]);
  });
});

describe("GET /api/projects/mine", () => {
  it("returns projects the caller owns, regardless of status", async () => {
    const { userId, cookie } = await managerCookie();
    await createTestProject({ ownerId: userId, status: "draft", title: "Mine" });
    await createTestProject({ status: "published", title: "Not mine" });

    const res = await SELF.fetch(`${BASE}/mine`, { headers: { Cookie: cookie } });
    const { data } = await res.json<{ data: { title: string }[] }>();
    expect(data.map((p) => p.title)).toEqual(["Mine"]);
  });

  it("scope=all succeeds for an oversight role but is rejected for project_leader", async () => {
    const { cookie: oversightCookie } = await managerCookie(); // secretary is in PROJECT_OVERSIGHT_ROLES
    const oversightRes = await SELF.fetch(`${BASE}/mine?scope=all`, { headers: { Cookie: oversightCookie } });
    expect(oversightRes.status).toBe(200);

    // project_leader can manage its own projects but isn't an oversight role.
    const leader = await createTestUser({ role: "project_leader" });
    const leaderCookie = sessionCookieHeader(await createTestSession(leader.id));
    const leaderRes = await SELF.fetch(`${BASE}/mine?scope=all`, { headers: { Cookie: leaderCookie } });
    expect(leaderRes.status).toBe(403);
  });
});
