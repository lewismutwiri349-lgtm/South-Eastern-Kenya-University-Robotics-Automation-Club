import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  authorCookie,
  resetContentTables,
  unprivilegedCookie,
  VALID_RESOURCE,
} from "../../helpers/content-fixtures";

const BASE = "http://example.com/api/resources";

type CreateResponse = { data: { id: string; slug: string } };

async function createResource(cookie: string, overrides: Record<string, unknown> = {}) {
  return SELF.fetch(BASE, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ ...VALID_RESOURCE, ...overrides }),
  });
}

async function publishedResource(cookie: string, overrides: Record<string, unknown> = {}) {
  const created = await createResource(cookie, overrides);
  const { data } = await created.json<CreateResponse>();
  await SELF.fetch(`${BASE}/${data.id}/publish`, { method: "POST", headers: { Cookie: cookie } });
  return data;
}

describe("POST /api/resources", () => {
  beforeEach(resetContentTables);

  it("success path: an authorised role creates a draft resource", async () => {
    const res = await createResource(await authorCookie());
    expect(res.status).toBe(201);

    const json = await res.json<CreateResponse>();
    expect(json.data.slug).toBe("stm32f4-reference-manual");
  });

  it("validation failure: rejects a non-URL", async () => {
    const res = await createResource(await authorCookie(), { url: "not-a-url" });
    expect(res.status).toBe(400);
  });

  // The whole reason `httpUrl` exists in schemas/resources.ts rather than a
  // bare z.string().url(): these render as clickable links on a public page.
  it("security: rejects a javascript: URL", async () => {
    const res = await createResource(await authorCookie(), {
      url: "javascript:alert(document.cookie)",
    });
    expect(res.status).toBe(400);
  });

  it("security: rejects a data: URL", async () => {
    const res = await createResource(await authorCookie(), {
      url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    });
    expect(res.status).toBe(400);
  });

  it("accepts a plain http URL", async () => {
    const res = await createResource(await authorCookie(), { url: "http://example.com/doc.pdf" });
    expect(res.status).toBe(201);
  });

  it("unauthenticated: rejected with 401", async () => {
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_RESOURCE),
    });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const res = await createResource(await unprivilegedCookie());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/resources", () => {
  beforeEach(resetContentTables);

  it("success path: lists published resources to an anonymous visitor", async () => {
    await publishedResource(await authorCookie());

    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { url: string }[] }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].url).toBe(VALID_RESOURCE.url);
  });

  it("drafts are not public", async () => {
    await createResource(await authorCookie());

    const json = await (await SELF.fetch(BASE)).json<{ data: unknown[] }>();
    expect(json.data).toHaveLength(0);
  });

  it("filters by category", async () => {
    const cookie = await authorCookie();
    await publishedResource(cookie, { title: "Alpha", category: "Datasheet" });
    await publishedResource(cookie, { title: "Beta", category: "Tutorial" });

    const json = await (await SELF.fetch(`${BASE}?category=Tutorial`)).json<{
      data: { title: string }[];
    }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Beta");
  });

  it("validation failure: rejects a limit above the allowed maximum", async () => {
    const res = await SELF.fetch(`${BASE}?limit=500`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/resources/categories", () => {
  beforeEach(resetContentTables);

  it("success path: returns distinct published categories, sorted", async () => {
    const cookie = await authorCookie();
    await publishedResource(cookie, { title: "A", category: "Tutorial" });
    await publishedResource(cookie, { title: "B", category: "Datasheet" });
    await publishedResource(cookie, { title: "C", category: "Datasheet" });

    const res = await SELF.fetch(`${BASE}/categories`);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: string[] }>();
    expect(json.data).toEqual(["Datasheet", "Tutorial"]);
  });

  it("regression: /categories is not swallowed by the /:slug detail route", async () => {
    // Depends on mount order in routes/resources/index.ts.
    const res = await SELF.fetch(`${BASE}/categories`);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/resources/:slug", () => {
  beforeEach(resetContentTables);

  it("success path: returns a published resource", async () => {
    const resource = await publishedResource(await authorCookie());

    const res = await SELF.fetch(`${BASE}/${resource.slug}`);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { title: string } }>();
    expect(json.data.title).toBe(VALID_RESOURCE.title);
  });

  it("not found: an unpublished resource is a 404", async () => {
    const created = await createResource(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    expect((await SELF.fetch(`${BASE}/${data.slug}`)).status).toBe(404);
  });

  it("not found: an unknown slug returns 404", async () => {
    expect((await SELF.fetch(`${BASE}/no-such-resource`)).status).toBe(404);
  });
});

describe("PATCH /api/resources/:id", () => {
  beforeEach(resetContentTables);

  it("success path: an authorised role updates a field", async () => {
    const cookie = await authorCookie();
    const resource = await publishedResource(cookie);

    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated." }),
    });
    expect(res.status).toBe(200);

    const detail = await (await SELF.fetch(`${BASE}/${resource.slug}`)).json<{
      data: { description: string };
    }>();
    expect(detail.data.description).toBe("Updated.");
  });

  it("security: rejects a javascript: URL on update too", async () => {
    const cookie = await authorCookie();
    const resource = await publishedResource(cookie);

    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "javascript:alert(1)" }),
    });
    expect(res.status).toBe(400);
  });

  it("not found: updating an unknown id returns 404", async () => {
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}`, {
      method: "PATCH",
      headers: { Cookie: await authorCookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const resource = await publishedResource(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const resource = await publishedResource(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "PATCH",
      headers: { Cookie: await unprivilegedCookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/resources/:id/publish", () => {
  beforeEach(resetContentTables);

  it("success path: publishing makes a draft publicly visible", async () => {
    const cookie = await authorCookie();
    const created = await createResource(cookie);
    const { data } = await created.json<CreateResponse>();

    expect((await SELF.fetch(`${BASE}/${data.slug}`)).status).toBe(404);

    const res = await SELF.fetch(`${BASE}/${data.id}/publish`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    expect((await SELF.fetch(`${BASE}/${data.slug}`)).status).toBe(200);
  });

  it("not found: publishing an unknown id returns 404", async () => {
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}/publish`, {
      method: "POST",
      headers: { Cookie: await authorCookie() },
    });
    expect(res.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const created = await createResource(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    expect((await SELF.fetch(`${BASE}/${data.id}/publish`, { method: "POST" })).status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const created = await createResource(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    const res = await SELF.fetch(`${BASE}/${data.id}/publish`, {
      method: "POST",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/resources/:id", () => {
  beforeEach(resetContentTables);

  it("success path: soft-deletes and removes from the public listing", async () => {
    const cookie = await authorCookie();
    const resource = await publishedResource(cookie);

    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(204);

    const listing = await (await SELF.fetch(BASE)).json<{ data: unknown[] }>();
    expect(listing.data).toHaveLength(0);
  });

  it("not found: deleting an already-deleted resource returns 404", async () => {
    const cookie = await authorCookie();
    const resource = await publishedResource(cookie);

    await SELF.fetch(`${BASE}/${resource.id}`, { method: "DELETE", headers: { Cookie: cookie } });
    const second = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(second.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const resource = await publishedResource(await authorCookie());
    expect((await SELF.fetch(`${BASE}/${resource.id}`, { method: "DELETE" })).status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const resource = await publishedResource(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${resource.id}`, {
      method: "DELETE",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});
