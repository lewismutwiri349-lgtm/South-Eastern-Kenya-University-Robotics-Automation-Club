import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  authorCookie,
  resetContentTables,
  unprivilegedCookie,
  VALID_GALLERY_ITEM,
} from "../../helpers/content-fixtures";

const BASE = "http://example.com/api/gallery";

type CreateResponse = { data: { id: string; slug: string } };

async function createItem(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await SELF.fetch(BASE, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ ...VALID_GALLERY_ITEM, ...overrides }),
  });
  return res;
}

/** Creates and publishes an item, returning its slug and id. */
async function publishedItem(cookie: string, overrides: Record<string, unknown> = {}) {
  const created = await createItem(cookie, overrides);
  const { data } = await created.json<CreateResponse>();
  await SELF.fetch(`${BASE}/${data.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  return data;
}

describe("POST /api/gallery", () => {
  beforeEach(resetContentTables);

  it("success path: an authorised role creates a draft item", async () => {
    const res = await createItem(await authorCookie());
    expect(res.status).toBe(201);

    const json = await res.json<CreateResponse>();
    expect(json.data.slug).toBe("chassis-assembly-round-two");
  });

  it("validation failure: rejects a non-URL imageUrl", async () => {
    const res = await createItem(await authorCookie(), { imageUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("validation failure: rejects a missing capturedAt", async () => {
    const cookie = await authorCookie();
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "No date",
        caption: "c",
        imageUrl: "https://example.com/a.jpg",
      }),
    });
    expect(res.status).toBe(400);
  });

  // Permission matrix per docs/10_Testing_Standards.md §3.
  it("unauthenticated: rejected with 401", async () => {
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_GALLERY_ITEM),
    });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const res = await createItem(await unprivilegedCookie());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/gallery", () => {
  beforeEach(resetContentTables);

  it("success path: lists published items to an anonymous visitor", async () => {
    await publishedItem(await authorCookie());

    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: unknown[]; meta: { nextCursor: string | null } }>();
    expect(json.data).toHaveLength(1);
    expect(json.meta.nextCursor).toBeNull();
  });

  it("drafts are not public: an unpublished item is absent from the listing", async () => {
    await createItem(await authorCookie());

    const res = await SELF.fetch(BASE);
    const json = await res.json<{ data: unknown[] }>();
    expect(json.data).toHaveLength(0);
  });

  it("filters by category", async () => {
    const cookie = await authorCookie();
    await publishedItem(cookie, { title: "Alpha", category: "Build Log" });
    await publishedItem(cookie, { title: "Beta", category: "Competition" });

    const res = await SELF.fetch(`${BASE}?category=Competition`);
    const json = await res.json<{ data: { title: string }[] }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Beta");
  });

  it("validation failure: rejects a limit above the allowed maximum", async () => {
    const res = await SELF.fetch(`${BASE}?limit=500`);
    expect(res.status).toBe(400);
  });

  it("paginates: the cursor returns the next page and no duplicates", async () => {
    const cookie = await authorCookie();
    await publishedItem(cookie, { title: "First", capturedAt: "2026-01-01T00:00:00.000Z" });
    await publishedItem(cookie, { title: "Second", capturedAt: "2026-02-01T00:00:00.000Z" });

    const firstPage = await (await SELF.fetch(`${BASE}?limit=1`)).json<{
      data: { title: string }[];
      meta: { nextCursor: string | null };
    }>();
    expect(firstPage.data[0].title).toBe("Second"); // newest capturedAt first
    expect(firstPage.meta.nextCursor).not.toBeNull();

    const secondPage = await (
      await SELF.fetch(`${BASE}?limit=1&cursor=${firstPage.meta.nextCursor}`)
    ).json<{ data: { title: string }[] }>();
    expect(secondPage.data[0].title).toBe("First");
  });
});

describe("GET /api/gallery/categories", () => {
  beforeEach(resetContentTables);

  it("success path: returns distinct categories of published items, sorted", async () => {
    const cookie = await authorCookie();
    await publishedItem(cookie, { title: "A", category: "Competition" });
    await publishedItem(cookie, { title: "B", category: "Build Log" });
    await publishedItem(cookie, { title: "C", category: "Build Log" });

    const res = await SELF.fetch(`${BASE}/categories`);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: string[] }>();
    expect(json.data).toEqual(["Build Log", "Competition"]);
  });

  it("regression: /categories is not swallowed by the /:slug detail route", async () => {
    // The categories route must be registered before `/:slug` in
    // routes/gallery/index.ts. If that ordering is ever reversed this
    // returns 404 ("Gallery item not found") instead of a category list.
    const res = await SELF.fetch(`${BASE}/categories`);
    expect(res.status).toBe(200);
    const json = await res.json<{ data: unknown }>();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("excludes categories that exist only on drafts", async () => {
    const cookie = await authorCookie();
    await createItem(cookie, { category: "Secret" });

    const json = await (await SELF.fetch(`${BASE}/categories`)).json<{ data: string[] }>();
    expect(json.data).toEqual([]);
  });
});

describe("GET /api/gallery/:slug", () => {
  beforeEach(resetContentTables);

  it("success path: returns a published item to an anonymous visitor", async () => {
    const item = await publishedItem(await authorCookie());

    const res = await SELF.fetch(`${BASE}/${item.slug}`);
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { title: string; imageUrl: string } }>();
    expect(json.data.title).toBe(VALID_GALLERY_ITEM.title);
    expect(json.data.imageUrl).toBe(VALID_GALLERY_ITEM.imageUrl);
  });

  it("not found: an unpublished item is a 404, not a 403", async () => {
    const created = await createItem(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    const res = await SELF.fetch(`${BASE}/${data.slug}`);
    // 404 rather than 403 deliberately: a draft's existence shouldn't be
    // discoverable by an anonymous visitor guessing slugs.
    expect(res.status).toBe(404);
  });

  it("not found: an unknown slug returns 404", async () => {
    const res = await SELF.fetch(`${BASE}/no-such-item`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/gallery/:id", () => {
  beforeEach(resetContentTables);

  it("success path: an authorised role updates a field", async () => {
    const cookie = await authorCookie();
    const item = await publishedItem(cookie);

    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "Updated caption." }),
    });
    expect(res.status).toBe(200);

    const detail = await (await SELF.fetch(`${BASE}/${item.slug}`)).json<{
      data: { caption: string };
    }>();
    expect(detail.data.caption).toBe("Updated caption.");
  });

  it("validation failure: rejects an empty caption", async () => {
    const cookie = await authorCookie();
    const item = await publishedItem(cookie);

    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("not found: updating an unknown id returns 404", async () => {
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}`, {
      method: "PATCH",
      headers: { Cookie: await authorCookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "x" }),
    });
    expect(res.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const item = await publishedItem(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const item = await publishedItem(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "PATCH",
      headers: { Cookie: await unprivilegedCookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "x" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/gallery/:id/publish", () => {
  beforeEach(resetContentTables);

  it("success path: publishing makes a draft publicly visible", async () => {
    const cookie = await authorCookie();
    const created = await createItem(cookie);
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
    const created = await createItem(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    const res = await SELF.fetch(`${BASE}/${data.id}/publish`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const created = await createItem(await authorCookie());
    const { data } = await created.json<CreateResponse>();

    const res = await SELF.fetch(`${BASE}/${data.id}/publish`, {
      method: "POST",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/gallery/:id", () => {
  beforeEach(resetContentTables);

  it("success path: soft-deletes and removes the item from the public listing", async () => {
    const cookie = await authorCookie();
    const item = await publishedItem(cookie);

    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(204);

    const listing = await (await SELF.fetch(BASE)).json<{ data: unknown[] }>();
    expect(listing.data).toHaveLength(0);
    expect((await SELF.fetch(`${BASE}/${item.slug}`)).status).toBe(404);
  });

  it("not found: deleting an already-deleted item returns 404", async () => {
    const cookie = await authorCookie();
    const item = await publishedItem(cookie);

    await SELF.fetch(`${BASE}/${item.id}`, { method: "DELETE", headers: { Cookie: cookie } });
    const second = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(second.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const item = await publishedItem(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${item.id}`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const item = await publishedItem(await authorCookie());
    const res = await SELF.fetch(`${BASE}/${item.id}`, {
      method: "DELETE",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});
