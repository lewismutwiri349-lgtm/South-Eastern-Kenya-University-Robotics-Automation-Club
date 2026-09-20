import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { galleryItems, resources, contactMessages } from "../../../../database/schema";
import { createDb } from "../../../src/db/client";
import { createTestUser, env, resetContentTables } from "../../helpers/content-fixtures";

/**
 * Per docs/10_Testing_Standards.md §2: "at least one integration test per
 * new database table's core CRUD path", against a real (local, migrated) D1
 * instance rather than a mock.
 */
describe("gallery_items — table CRUD", () => {
  beforeEach(resetContentTables);

  it("insert, select, update, soft-delete", async () => {
    const db = createDb(env);
    const author = await createTestUser();
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(galleryItems).values({
      id,
      title: "Drivetrain",
      slug: "drivetrain",
      caption: "Assembled drivetrain.",
      imageUrl: "https://example.com/a.jpg",
      category: "Build Log",
      capturedAt: now,
      authorId: author.id,
      createdAt: now,
      updatedAt: now,
    });

    const [inserted] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    expect(inserted.slug).toBe("drivetrain");
    // Column default, not something the insert supplied — worth pinning,
    // because a draft leaking to the public listing is the failure mode.
    expect(inserted.status).toBe("draft");
    expect(inserted.publishedAt).toBeNull();
    expect(inserted.deletedAt).toBeNull();

    await db
      .update(galleryItems)
      .set({ status: "published", publishedAt: now })
      .where(eq(galleryItems.id, id));
    const [updated] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    expect(updated.status).toBe("published");

    await db.update(galleryItems).set({ deletedAt: now }).where(eq(galleryItems.id, id));
    const [deleted] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    // Soft delete per docs/04_Database_Design.md §5 — the row survives.
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("rejects a duplicate slug", async () => {
    const db = createDb(env);
    const author = await createTestUser();
    const now = new Date();
    const row = {
      title: "Duplicate",
      slug: "duplicate",
      caption: "c",
      imageUrl: "https://example.com/a.jpg",
      capturedAt: now,
      authorId: author.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(galleryItems).values({ ...row, id: crypto.randomUUID() });
    await expect(
      db.insert(galleryItems).values({ ...row, id: crypto.randomUUID() })
    ).rejects.toThrow();
  });
});

describe("resources — table CRUD", () => {
  beforeEach(resetContentTables);

  it("insert, select, update, soft-delete", async () => {
    const db = createDb(env);
    const author = await createTestUser();
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(resources).values({
      id,
      title: "Reference manual",
      slug: "reference-manual",
      description: "MCU reference.",
      url: "https://example.com/doc.pdf",
      category: "Datasheet",
      authorId: author.id,
      createdAt: now,
      updatedAt: now,
    });

    const [inserted] = await db.select().from(resources).where(eq(resources.id, id));
    expect(inserted.status).toBe("draft");
    expect(inserted.url).toBe("https://example.com/doc.pdf");

    await db.update(resources).set({ title: "Renamed" }).where(eq(resources.id, id));
    const [updated] = await db.select().from(resources).where(eq(resources.id, id));
    expect(updated.title).toBe("Renamed");

    await db.update(resources).set({ deletedAt: now }).where(eq(resources.id, id));
    const [deleted] = await db.select().from(resources).where(eq(resources.id, id));
    expect(deleted.deletedAt).not.toBeNull();
  });
});

describe("contact_messages — table CRUD", () => {
  beforeEach(resetContentTables);

  it("insert, select, mark handled, soft-delete", async () => {
    const db = createDb(env);
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(contactMessages).values({
      id,
      name: "Jane",
      email: "jane@example.com",
      subject: "Hello",
      message: "Body",
      submitterIpHash: "hashed",
      createdAt: now,
    });

    const [inserted] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    expect(inserted.handledAt).toBeNull();
    expect(inserted.deletedAt).toBeNull();

    await db
      .update(contactMessages)
      .set({ handledAt: now })
      .where(eq(contactMessages.id, id));
    const [handled] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    expect(handled.handledAt).not.toBeNull();

    await db
      .update(contactMessages)
      .set({ deletedAt: now })
      .where(eq(contactMessages.id, id));
    const [deleted] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("stores no foreign key to users — a sender need not have an account", async () => {
    const db = createDb(env);
    const id = crypto.randomUUID();

    // Succeeds with no user rows in the database at all, which is the point:
    // the public writes here.
    await db.insert(contactMessages).values({
      id,
      name: "Anonymous",
      email: "anon@example.com",
      subject: "Question",
      message: "Body",
      createdAt: new Date(),
    });

    const rows = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    expect(rows).toHaveLength(1);
  });
});
