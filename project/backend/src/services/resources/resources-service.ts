import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { resources } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateResourceInput, UpdateResourceInput } from "../../schemas/resources";

export class ResourceNotFoundError extends Error {
  constructor() {
    super("Resource not found");
    this.name = "ResourceNotFoundError";
  }
}

export async function createResource(
  env: Env,
  authorId: string,
  input: CreateResourceInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(resources).where(eq(resources.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(resources).values({
    id,
    title: input.title,
    slug,
    description: input.description,
    url: input.url,
    category: input.category ?? null,
    authorId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateResource(
  env: Env,
  resourceId: string,
  input: UpdateResourceInput
): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)));
  if (!existing) throw new ResourceNotFoundError();

  await db
    .update(resources)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(resources.id, resourceId));
}

export async function publishResource(env: Env, resourceId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)));
  if (!existing) throw new ResourceNotFoundError();

  const now = new Date();
  await db
    .update(resources)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(resources.id, resourceId));
}

export async function deleteResource(env: Env, resourceId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)));
  if (!existing) throw new ResourceNotFoundError();

  await db
    .update(resources)
    .set({ deletedAt: new Date() })
    .where(eq(resources.id, resourceId));
}

const PUBLISHED = and(eq(resources.status, "published"), isNull(resources.deletedAt));

export async function getPublishedResourceBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.slug, slug), PUBLISHED));
  return resource ?? null;
}

/** Distinct categories across published resources — same rationale as the
 * equivalent Gallery function (computed, not a separate managed table). */
export async function listPublishedResourceCategories(env: Env): Promise<string[]> {
  const db = createDb(env);
  const rows = await db
    .selectDistinct({ category: resources.category })
    .from(resources)
    .where(PUBLISHED);

  return rows
    .map((row) => row.category)
    .filter((category): category is string => category !== null)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (publishedAt, id) descending. Unlike Gallery/Awards/Events there is no
 * separate domain date to order by; a link has no "happened on" moment.
 */
export async function listPublishedResources(
  env: Env,
  { limit, cursor, category }: { limit: number; cursor?: string; category?: string }
): Promise<{ resources: (typeof resources.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const filters = [PUBLISHED];

  if (category) {
    filters.push(eq(resources.category, category));
  }

  if (cursorCondition) {
    const pageCondition = or(
      lt(resources.publishedAt, cursorCondition.publishedAt),
      and(
        eq(resources.publishedAt, cursorCondition.publishedAt),
        lt(resources.id, cursorCondition.id)
      )
    );
    if (pageCondition) filters.push(pageCondition);
  }

  const rows = await db
    .select()
    .from(resources)
    .where(and(...filters))
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor =
    hasMore && last && last.publishedAt ? encodeCursor(last.publishedAt, last.id) : null;

  return { resources: result, nextCursor };
}

function encodeCursor(publishedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ publishedAt: publishedAt.getTime(), id })).toString(
    "base64url"
  );
}

function decodeCursor(cursor: string): { publishedAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { publishedAt: new Date(decoded.publishedAt), id: decoded.id };
}
