import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyProjectManagementMigrations,
  resetProjectManagementTables,
  createTestProject,
  addProjectMember,
  managerCookie,
  memberCookie,
  createTestUser,
  createTestSession,
  sessionCookieHeader,
  TINY_PNG_BYTES,
} from "../../helpers/project-fixtures";

function pngFile(name = "cover.png") {
  return new File([TINY_PNG_BYTES], name, { type: "image/png" });
}

beforeAll(applyProjectManagementMigrations);
beforeEach(resetProjectManagementTables);

describe("Project files (Phase 5)", () => {
  it("a manager uploads a file, then a contributor can list and download it", async () => {
    const { userId: ownerId, cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject({ ownerId, status: "draft" });

    const form = new FormData();
    form.set("file", pngFile());
    form.set("visibility", "team");
    const upload = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { Cookie: ownerCookie },
      body: form,
    });
    expect(upload.status).toBe(201);
    const { data: uploaded } = await upload.json<{ data: { id: string; category: string } }>();
    expect(uploaded.category).toBe("image");

    // Assign a contributor and confirm they can see + download the (team-visibility) file.
    const contributor = await createTestUser({ role: "member" });
    await addProjectMember(project.id, contributor.id, "contributor");
    const contributorCookie = sessionCookieHeader(await createTestSession(contributor.id));

    const list = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      headers: { Cookie: contributorCookie },
    });
    const { data: files } = await list.json<{ data: { id: string }[] }>();
    expect(files.map((f) => f.id)).toContain(uploaded.id);

    const download = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/files/${uploaded.id}/download`,
      { headers: { Cookie: contributorCookie } }
    );
    expect(download.status).toBe(200);
    expect(download.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(TINY_PNG_BYTES);
  });

  it("a non-member cannot see a draft project's files (reported as not found)", async () => {
    const project = await createTestProject({ status: "draft" });
    const { cookie: outsiderCookie } = await memberCookie();

    const res = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      headers: { Cookie: outsiderCookie },
    });
    expect(res.status).toBe(404);
  });

  it("a signed-out visitor can download a public file of a published project, but not a team-only one", async () => {
    const { userId: ownerId, cookie: ownerCookie } = await managerCookie();
    const project = await createTestProject({ ownerId, status: "published" });

    const publicForm = new FormData();
    publicForm.set("file", pngFile("public.png"));
    publicForm.set("visibility", "public");
    const publicUpload = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { Cookie: ownerCookie },
      body: publicForm,
    });
    const { data: publicFile } = await publicUpload.json<{ data: { id: string } }>();

    const teamForm = new FormData();
    teamForm.set("file", pngFile("team.png"));
    teamForm.set("visibility", "team");
    const teamUpload = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { Cookie: ownerCookie },
      body: teamForm,
    });
    const { data: teamFile } = await teamUpload.json<{ data: { id: string } }>();

    const publicDownload = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/files/${publicFile.id}/download`
    );
    expect(publicDownload.status).toBe(200);

    const teamDownload = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/files/${teamFile.id}/download`
    );
    expect(teamDownload.status).toBe(404);
  });

  it("rejects an unsupported file type", async () => {
    const { cookie } = await managerCookie();
    const project = await createTestProject();
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "malware.exe", { type: "application/octet-stream" }));

    const res = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });
    expect(res.status).toBe(400);
    const json = await res.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("versions: uploading a new version bumps currentVersion and keeps history", async () => {
    const { userId: ownerId, cookie } = await managerCookie();
    const project = await createTestProject({ ownerId });

    const form = new FormData();
    form.set("file", pngFile());
    const upload = await SELF.fetch(`http://example.com/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });
    const { data: file } = await upload.json<{ data: { id: string } }>();

    const versionForm = new FormData();
    versionForm.set("file", pngFile("v2.png"));
    versionForm.set("note", "Fixed the color profile");
    const versionRes = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/files/${file.id}/versions`,
      { method: "POST", headers: { Cookie: cookie }, body: versionForm }
    );
    expect(versionRes.status).toBe(201);
    const { data: version } = await versionRes.json<{ data: { version: number } }>();
    expect(version.version).toBe(2);

    const history = await SELF.fetch(
      `http://example.com/api/projects/${project.id}/files/${file.id}/versions`,
      { headers: { Cookie: cookie } }
    );
    const { data: versions } = await history.json<{ data: { version: number; note: string | null }[] }>();
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[0].note).toBe("Fixed the color profile");
  });
});
