import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { awards } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateAwardInput, UpdateAwardInput } from "../../schemas/awards";

export class AwardNotFoundError extends Error {
  constructor() {
    super("Award not found");
    this.name = "AwardNotFoundError";
  }
}

export async function createAward(
  env: Env,
  authorId: string,
  input: CreateAwardInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(awards).where(eq(awards.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(awards).values({
    id,
    title: input.title,
    slug,
    description: input.description,
    recipientName: input.recipientName,
    category: input.category ?? null,
    awardedAt: input.awardedAt,
    coverImageUrl: input.coverImageUrl ?? null,
    authorId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateAward(env: Env, awardId: string, input: UpdateAwardInput): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(awards)
    .where(and(eq(awards.id, awardId), isNull(awards.deletedAt)));
  if (!existing) throw new AwardNotFoundError();

  await db
    .update(awards)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(awards.id, awardId));
}

export async function publishAward(env: Env, awardId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(awards)
    .where(and(eq(awards.id, awardId), isNull(awards.deletedAt)));
  if (!existing) throw new AwardNotFoundError();

  const now = new Date();
  await db
    .update(awards)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(awards.id, awardId));
}

export async function deleteAward(env: Env, awardId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(awards)
    .where(and(eq(awards.id, awardId), isNull(awards.deletedAt)));
  if (!existing) throw new AwardNotFoundError();

  await db
    .update(awards)
    .set({ deletedAt: new Date() })
    .where(eq(awards.id, awardId));
}

const PUBLISHED = and(eq(awards.status, "published"), isNull(awards.deletedAt));

export async function getPublishedAwardBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [award] = await db
    .select()
    .from(awards)
    .where(and(eq(awards.slug, slug), PUBLISHED));
  return award ?? null;
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (awardedAt, id) descending: most-recently-awarded first. Deliberately
 * ordered by the domain date (awardedAt), not publishedAt — an award
 * published late should still appear in its actual chronological place
 * among other recognitions, not jump to the top just because it was
 * entered into the system recently.
 */
export async function listPublishedAwards(
  env: Env,
  { limit, cursor }: { limit: number; cursor?: string }
): Promise<{ awards: (typeof awards.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const whereClause = cursorCondition
    ? and(
        PUBLISHED,
        or(
          lt(awards.awardedAt, cursorCondition.awardedAt),
          and(eq(awards.awardedAt, cursorCondition.awardedAt), lt(awards.id, cursorCondition.id))
        )
      )
    : PUBLISHED;

  const rows = await db
    .select()
    .from(awards)
    .where(whereClause)
    .orderBy(desc(awards.awardedAt), desc(awards.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.awardedAt, last.id) : null;

  return { awards: result, nextCursor };
}

function encodeCursor(awardedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ awardedAt: awardedAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { awardedAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { awardedAt: new Date(decoded.awardedAt), id: decoded.id };
}
