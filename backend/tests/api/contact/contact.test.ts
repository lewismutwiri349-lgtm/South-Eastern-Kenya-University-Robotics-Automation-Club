import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { contactMessages } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import {
  authorCookie,
  env,
  resetContentTables,
  unprivilegedCookie,
  VALID_CONTACT_MESSAGE,
} from "../../helpers/content-fixtures";

const BASE = "http://example.com/api/contact";

type SubmitResponse = { data: { id: string } };

/**
 * A distinct IP per submission. The endpoint is rate-limited per IP, so
 * without this every test after the fifth in a file would get a 429 from a
 * previous test's counter rather than exercising what it's testing.
 */
let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `203.0.113.${ipCounter % 254}`;
}

async function submit(overrides: Record<string, unknown> = {}, ip = freshIp()) {
  return SELF.fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ ...VALID_CONTACT_MESSAGE, ...overrides }),
  });
}

describe("POST /api/contact", () => {
  beforeEach(resetContentTables);

  it("success path: an anonymous visitor submits a message", async () => {
    const res = await submit();
    expect(res.status).toBe(201);

    const json = await res.json<SubmitResponse>();
    expect(json.data.id).toBeTruthy();
  });

  it("returns only the id — never echoes the submitted content back", async () => {
    const res = await submit();
    const json = await res.json<Record<string, Record<string, unknown>>>();
    expect(Object.keys(json.data)).toEqual(["id"]);
  });

  it("stores the IP hashed, never in the clear", async () => {
    const ip = freshIp();
    const res = await submit({}, ip);
    const { data } = await res.json<SubmitResponse>();

    const db = createDb(env);
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, data.id));
    expect(row.submitterIpHash).not.toBeNull();
    expect(row.submitterIpHash).not.toBe(ip);
    expect(row.submitterIpHash).toHaveLength(64); // SHA-256, hex
  });

  it("validation failure: rejects an invalid email", async () => {
    expect((await submit({ email: "not-an-email" })).status).toBe(400);
  });

  it("validation failure: rejects an empty message", async () => {
    expect((await submit({ message: "" })).status).toBe(400);
  });

  it("validation failure: rejects a message over the length ceiling", async () => {
    expect((await submit({ message: "x".repeat(5001) })).status).toBe(400);
  });

  it("rate limiting: a sixth submission from the same IP within the window is rejected", async () => {
    const ip = freshIp();

    for (let i = 0; i < 5; i += 1) {
      expect((await submit({ subject: `Message ${i}` }, ip)).status).toBe(201);
    }

    const sixth = await submit({ subject: "Message 6" }, ip);
    expect(sixth.status).toBe(429);

    const json = await sixth.json<{ error: { code: string } }>();
    expect(json.error.code).toBe("RATE_LIMITED");
  });

  it("rate limiting: a different IP is unaffected by another's exhausted window", async () => {
    const busyIp = freshIp();
    for (let i = 0; i < 5; i += 1) {
      await submit({ subject: `Message ${i}` }, busyIp);
    }
    expect((await submit({}, busyIp)).status).toBe(429);

    // A different visitor must still get through.
    expect((await submit({}, freshIp())).status).toBe(201);
  });
});

describe("GET /api/contact", () => {
  beforeEach(resetContentTables);

  it("success path: an authorised role lists messages", async () => {
    await submit();

    const res = await SELF.fetch(BASE, { headers: { Cookie: await authorCookie() } });
    expect(res.status).toBe(200);

    const json = await res.json<{ data: { subject: string }[] }>();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].subject).toBe(VALID_CONTACT_MESSAGE.subject);
  });

  it("never exposes submitterIpHash to staff", async () => {
    await submit();

    const json = await (
      await SELF.fetch(BASE, { headers: { Cookie: await authorCookie() } })
    ).json<{ data: Record<string, unknown>[] }>();
    expect(json.data[0]).not.toHaveProperty("submitterIpHash");
  });

  it("defaults to unhandled only; handled=all includes handled messages", async () => {
    const cookie = await authorCookie();
    const { data } = await (await submit()).json<SubmitResponse>();
    await submit({ subject: "Second" });

    await SELF.fetch(`${BASE}/${data.id}/handle`, { method: "POST", headers: { Cookie: cookie } });

    const unhandled = await (await SELF.fetch(BASE, { headers: { Cookie: cookie } })).json<{
      data: unknown[];
    }>();
    expect(unhandled.data).toHaveLength(1);

    const all = await (
      await SELF.fetch(`${BASE}?handled=all`, { headers: { Cookie: cookie } })
    ).json<{ data: unknown[] }>();
    expect(all.data).toHaveLength(2);
  });

  it("validation failure: rejects an unknown handled value", async () => {
    const res = await SELF.fetch(`${BASE}?handled=maybe`, {
      headers: { Cookie: await authorCookie() },
    });
    expect(res.status).toBe(400);
  });

  // This is the leg that matters most here: the public can write to this
  // table, so an accidental public read would expose every sender's email.
  it("unauthenticated: rejected with 401", async () => {
    expect((await SELF.fetch(BASE)).status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const res = await SELF.fetch(BASE, { headers: { Cookie: await unprivilegedCookie() } });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/contact/:id/handle", () => {
  beforeEach(resetContentTables);

  it("success path: marks a message handled", async () => {
    const cookie = await authorCookie();
    const { data } = await (await submit()).json<SubmitResponse>();

    const res = await SELF.fetch(`${BASE}/${data.id}/handle`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);

    const db = createDb(env);
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, data.id));
    expect(row.handledAt).not.toBeNull();
  });

  it("idempotent: re-handling keeps the original timestamp", async () => {
    const cookie = await authorCookie();
    const { data } = await (await submit()).json<SubmitResponse>();

    await SELF.fetch(`${BASE}/${data.id}/handle`, { method: "POST", headers: { Cookie: cookie } });

    const db = createDb(env);
    const [first] = await db.select().from(contactMessages).where(eq(contactMessages.id, data.id));

    await SELF.fetch(`${BASE}/${data.id}/handle`, { method: "POST", headers: { Cookie: cookie } });
    const [second] = await db.select().from(contactMessages).where(eq(contactMessages.id, data.id));

    expect(second.handledAt?.getTime()).toBe(first.handledAt?.getTime());
  });

  it("not found: an unknown id returns 404", async () => {
    const res = await SELF.fetch(`${BASE}/${crypto.randomUUID()}/handle`, {
      method: "POST",
      headers: { Cookie: await authorCookie() },
    });
    expect(res.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const { data } = await (await submit()).json<SubmitResponse>();
    expect((await SELF.fetch(`${BASE}/${data.id}/handle`, { method: "POST" })).status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const { data } = await (await submit()).json<SubmitResponse>();
    const res = await SELF.fetch(`${BASE}/${data.id}/handle`, {
      method: "POST",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/contact/:id", () => {
  beforeEach(resetContentTables);

  it("success path: soft-deletes and removes from the listing", async () => {
    const cookie = await authorCookie();
    const { data } = await (await submit()).json<SubmitResponse>();

    const res = await SELF.fetch(`${BASE}/${data.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(204);

    const listing = await (
      await SELF.fetch(`${BASE}?handled=all`, { headers: { Cookie: cookie } })
    ).json<{ data: unknown[] }>();
    expect(listing.data).toHaveLength(0);

    // Soft delete — the row is still there for recovery.
    const db = createDb(env);
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, data.id));
    expect(row.deletedAt).not.toBeNull();
  });

  it("not found: deleting an already-deleted message returns 404", async () => {
    const cookie = await authorCookie();
    const { data } = await (await submit()).json<SubmitResponse>();

    await SELF.fetch(`${BASE}/${data.id}`, { method: "DELETE", headers: { Cookie: cookie } });
    const second = await SELF.fetch(`${BASE}/${data.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(second.status).toBe(404);
  });

  it("unauthenticated: rejected with 401", async () => {
    const { data } = await (await submit()).json<SubmitResponse>();
    expect((await SELF.fetch(`${BASE}/${data.id}`, { method: "DELETE" })).status).toBe(401);
  });

  it("wrong role: an authenticated member is rejected with 403", async () => {
    const { data } = await (await submit()).json<SubmitResponse>();
    const res = await SELF.fetch(`${BASE}/${data.id}`, {
      method: "DELETE",
      headers: { Cookie: await unprivilegedCookie() },
    });
    expect(res.status).toBe(403);
  });
});
