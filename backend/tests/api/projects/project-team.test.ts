import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyProjectManagementMigrations,
  resetProjectManagementTables,
  createTestProject,
  createTestUser,
  createMemberProfile,
  managerCookie,
  memberCookie,
} from "../../helpers/project-fixtures";

beforeAll(applyProjectManagementMigrations);
beforeEach(resetProjectManagementTables);

describe("Project team assignments (Phase 5)", () => {
  it("a manager adds a member to the team, sees them listed, updates their role, then removes them", async () => {
    const { userId: ownerId, cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject({ ownerId });

    const candidate = await createTestUser({ role: "member" });
    await createMemberProfile(candidate.id);

    const add = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: candidate.id, role: "contributor" }),
    });
    expect(add.status).toBe(201);

    const adding = await add.json<{ data: { added: boolean } }>();
    expect(adding.data.added).toBe(true);

    const list = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      headers: { Cookie: ownerCookie },
    });
    const { data: team } = await list.json<{ data: { id: string; userId: string; role: string }[] }>();
    const entry = team.find((m) => m.userId === candidate.id);
    expect(entry?.role).toBe("contributor");

    const promote = await SELF.fetch(`http://example.com/api/projects/${project.id}/team/${entry!.id}`, {
      method: "PATCH",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "lead" }),
    });
    expect(promote.status).toBe(200);

    const remove = await SELF.fetch(`http://example.com/api/projects/${project.id}/team/${entry!.id}`, {
      method: "DELETE",
      headers: { Cookie: ownerCookie },
    });
    expect(remove.status).toBe(204);

    const listAfter = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      headers: { Cookie: ownerCookie },
    });
    const { data: teamAfter } = await listAfter.json<{ data: { userId: string }[] }>();
    expect(teamAfter.find((m) => m.userId === candidate.id)).toBeUndefined();
  });

  it("adding the same member twice is rejected with 409", async () => {
    const { userId: ownerId, cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject({ ownerId });
    const candidate = await createTestUser({ role: "member" });
    await createMemberProfile(candidate.id);

    const body = JSON.stringify({ userId: candidate.id, role: "contributor" });
    const first = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body,
    });
    expect(first.status).toBe(201);

    const second = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body,
    });
    expect(second.status).toBe(409);
  });

  it("adding a user with no member profile is rejected with 404", async () => {
    const { userId: ownerId, cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject({ ownerId });
    const noProfile = await createTestUser({ role: "member" });

    const res = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: noProfile.id, role: "contributor" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects team access for a non-member, non-manager (reported as not found)", async () => {
    const project = await createTestProject();
    const { cookie: outsiderCookie } = await memberCookie();
    const res = await SELF.fetch(`http://example.com/api/projects/${project.id}/team`, {
      headers: { Cookie: outsiderCookie },
    });
    expect(res.status).toBe(404);
  });

  it("candidate search is manager-only", async () => {
    const { cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject();
    const { cookie: contributorCookie } = await memberCookie();

    const managerSearch = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/team/candidates?q=jo`,
      { headers: { Cookie: ownerCookie } }
    );
    expect(managerSearch.status).toBe(200);

    const contributorSearch = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/team/candidates?q=jo`,
      { headers: { Cookie: contributorCookie } }
    );
    expect(contributorSearch.status).toBe(404);
  });
});
