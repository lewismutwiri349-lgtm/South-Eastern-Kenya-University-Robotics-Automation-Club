import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyProjectManagementMigrations,
  resetProjectManagementTables,
  createTestProject,
  env,
} from "../../helpers/project-fixtures";
import { setProjectTags } from "../../../src/services/projects/project-search-service";

const BASE = "http://example.com/api/projects";

beforeAll(applyProjectManagementMigrations);
beforeEach(resetProjectManagementTables);

describe("GET /api/projects (public search)", () => {
  it("only returns published projects, newest published first", async () => {
    await createTestProject({ status: "draft", title: "Draft Bot" });
    const older = await createTestProject({ status: "published", title: "Line Follower" });
    const newer = await createTestProject({ status: "published", title: "Arm Rig" });
    // Force a distinguishable publish order.
    const db = env.DB;
    await db.prepare("UPDATE projects SET published_at = ? WHERE id = ?").bind(100, older.id).run();
    await db.prepare("UPDATE projects SET published_at = ? WHERE id = ?").bind(200, newer.id).run();

    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(200);
    const json = await res.json<{ data: { title: string }[] }>();
    expect(json.data.map((p) => p.title)).toEqual(["Arm Rig", "Line Follower"]);
  });

  it("filters by category", async () => {
    const db = env.DB;
    const a = await createTestProject({ status: "published", title: "A", category: "robotics" });
    const b = await createTestProject({ status: "published", title: "B", category: "software" });
    await db.prepare("UPDATE projects SET published_at = 100 WHERE id = ?").bind(a.id).run();
    await db.prepare("UPDATE projects SET published_at = 100 WHERE id = ?").bind(b.id).run();

    const res = await SELF.fetch(`${BASE}?category=robotics`);
    const json = await res.json<{ data: { title: string }[] }>();
    expect(json.data.map((p) => p.title)).toEqual(["A"]);
  });

  it("filters by tag and matches free-text search against title/summary/tags", async () => {
    const db = env.DB;
    const project = await createTestProject({ status: "published", title: "Autonomous Line Follower" });
    await db.prepare("UPDATE projects SET published_at = 100 WHERE id = ?").bind(project.id).run();
    await setProjectTags(db, project.id, ["line-following", "embedded"]);

    const byTag = await SELF.fetch(`${BASE}?tag=embedded`);
    expect((await byTag.json<{ data: unknown[] }>()).data).toHaveLength(1);

    const byQuery = await SELF.fetch(`${BASE}?q=autonomous`);
    expect((await byQuery.json<{ data: unknown[] }>()).data).toHaveLength(1);

    const noMatch = await SELF.fetch(`${BASE}?q=underwater`);
    expect((await noMatch.json<{ data: unknown[] }>()).data).toHaveLength(0);
  });

  it("paginates with a cursor", async () => {
    const db = env.DB;
    for (let i = 0; i < 3; i++) {
      const p = await createTestProject({ status: "published", title: `P${i}` });
      await db.prepare("UPDATE projects SET published_at = ? WHERE id = ?").bind(100 + i, p.id).run();
    }

    const page1 = await SELF.fetch(`${BASE}?limit=2`);
    const json1 = await page1.json<{ data: { title: string }[]; meta: { nextCursor: string | null } }>();
    expect(json1.data).toHaveLength(2);
    expect(json1.meta.nextCursor).not.toBeNull();

    const page2 = await SELF.fetch(`${BASE}?limit=2&cursor=${encodeURIComponent(json1.meta.nextCursor!)}`);
    const json2 = await page2.json<{ data: { title: string }[]; meta: { nextCursor: string | null } }>();
    expect(json2.data).toHaveLength(1);
    expect(json2.meta.nextCursor).toBeNull();
  });

  it("rejects a malformed cursor with 400", async () => {
    const res = await SELF.fetch(`${BASE}?cursor=not-valid-base64url-json`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/projects/facets", () => {
  it("returns category and tag counts across published projects only", async () => {
    const db = env.DB;
    const p1 = await createTestProject({ status: "published", category: "robotics" });
    await createTestProject({ status: "draft", category: "software" }); // excluded
    await db.prepare("UPDATE projects SET published_at = 100 WHERE id = ?").bind(p1.id).run();
    await setProjectTags(db, p1.id, ["autonomy"]);

    const res = await SELF.fetch(`${BASE}/facets`);
    const json = await res.json<{ data: { categories: { value: string }[]; tags: { value: string }[] } }>();
    expect(json.data.categories.map((c) => c.value)).toEqual(["robotics"]);
    expect(json.data.tags.map((t) => t.value)).toEqual(["autonomy"]);
  });
});
