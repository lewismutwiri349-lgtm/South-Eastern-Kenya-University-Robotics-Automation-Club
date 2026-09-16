import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { galleryItems } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateGalleryItemInput, UpdateGalleryItemInput } from "../../schemas/gallery";

export class GalleryItemNotFoundError extends Error {
  constructor() {
    super("Gallery item not found");
    this.name = "GalleryItemNotFoundError";
  }
}

export async function createGalleryItem(
  env: Env,
  authorId: string,
  input: CreateGalleryItemInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(galleryItems).where(eq(galleryItems.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(galleryItems).values({
    id,
    title: input.title,
    slug,
    caption: input.caption,
    imageUrl: input.imageUrl,
    category: input.category ?? null,
    capturedAt: input.capturedAt,
    authorId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateGalleryItem(
  env: Env,
  itemId: string,
  input: UpdateGalleryItemInput
): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.id, itemId), isNull(galleryItems.deletedAt)));
  if (!existing) throw new GalleryItemNotFoundError();

  await db
    .update(galleryItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(galleryItems.id, itemId));
}

export async function publishGalleryItem(env: Env, itemId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.id, itemId), isNull(galleryItems.deletedAt)));
  if (!existing) throw new GalleryItemNotFoundError();

  const now = new Date();
  await db
    .update(galleryItems)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(galleryItems.id, itemId));
}

export async function deleteGalleryItem(env: Env, itemId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.id, itemId), isNull(galleryItems.deletedAt)));
  if (!existing) throw new GalleryItemNotFoundError();

  await db
    .update(galleryItems)
    .set({ deletedAt: new Date() })
    .where(eq(galleryItems.id, itemId));
}

const PUBLISHED = and(eq(galleryItems.status, "published"), isNull(galleryItems.deletedAt));

export async function getPublishedGalleryItemBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [item] = await db
    .select()
    .from(galleryItems)
    .where(and(eq(galleryItems.slug, slug), PUBLISHED));
  return item ?? null;
}

/**
 * Distinct categories across published items, for the public filter UI.
 * Computed rather than stored: a separate categories table would need its
 * own CRUD and would drift out of sync with what's actually in use. The
 * gallery is expected to hold hundreds of rows, not millions, so a single
 * indexed scan is the boring correct answer here. If that assumption ever
 * breaks, this is the one function to revisit.
 */
export async function listPublishedGalleryCategories(env: Env): Promise<string[]> {
  const db = createDb(env);
  const rows = await db
    .selectDistinct({ category: galleryItems.category })
    .from(galleryItems)
    .where(PUBLISHED);

  return rows
    .map((row) => row.category)
    .filter((category): category is string => category !== null)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (capturedAt, id) descending: most recently photographed first.
 * Deliberately ordered by the domain date (capturedAt), not publishedAt,
 * for the same reason as Awards: a photo uploaded months late belongs in
 * its real chronological place, not at the top of the grid.
 */
export async function listPublishedGalleryItems(
  env: Env,
  { limit, cursor, category }: { limit: number; cursor?: string; category?: string }
): Promise<{ items: (typeof galleryItems.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const filters = [PUBLISHED];

  if (category) {
    filters.push(eq(galleryItems.category, category));
  }

  if (cursorCondition) {
    const pageCondition = or(
      lt(galleryItems.capturedAt, cursorCondition.capturedAt),
      and(
        eq(galleryItems.capturedAt, cursorCondition.capturedAt),
        lt(galleryItems.id, cursorCondition.id)
      )
    );
    if (pageCondition) filters.push(pageCondition);
  }

  const rows = await db
    .select()
    .from(galleryItems)
    .where(and(...filters))
    .orderBy(desc(galleryItems.capturedAt), desc(galleryItems.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.capturedAt, last.id) : null;

  return { items, nextCursor };
}

function encodeCursor(capturedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ capturedAt: capturedAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { capturedAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { capturedAt: new Date(decoded.capturedAt), id: decoded.id };
}
