import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { newsArticles } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateArticleInput, UpdateArticleInput } from "../../schemas/news";

export class ArticleNotFoundError extends Error {
  constructor() {
    super("Article not found");
    this.name = "ArticleNotFoundError";
  }
}

export async function createArticle(
  env: Env,
  authorId: string,
  input: CreateArticleInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(newsArticles).where(eq(newsArticles.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(newsArticles).values({
    id,
    title: input.title,
    slug,
    excerpt: input.excerpt,
    body: input.body,
    authorId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateArticle(
  env: Env,
  articleId: string,
  input: UpdateArticleInput
): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.id, articleId), isNull(newsArticles.deletedAt)));
  if (!existing) throw new ArticleNotFoundError();

  await db
    .update(newsArticles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(newsArticles.id, articleId));
}

export async function publishArticle(env: Env, articleId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.id, articleId), isNull(newsArticles.deletedAt)));
  if (!existing) throw new ArticleNotFoundError();

  const now = new Date();
  await db
    .update(newsArticles)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(newsArticles.id, articleId));
}

export async function deleteArticle(env: Env, articleId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.id, articleId), isNull(newsArticles.deletedAt)));
  if (!existing) throw new ArticleNotFoundError();

  await db
    .update(newsArticles)
    .set({ deletedAt: new Date() })
    .where(eq(newsArticles.id, articleId));
}

const PUBLISHED = and(eq(newsArticles.status, "published"), isNull(newsArticles.deletedAt));

export async function getPublishedArticleBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [article] = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.slug, slug), PUBLISHED));
  return article ?? null;
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (publishedAt, id) descending, both used in the cursor to keep ordering
 * stable even if two articles publish in the same millisecond.
 */
export async function listPublishedArticles(
  env: Env,
  { limit, cursor }: { limit: number; cursor?: string }
): Promise<{ articles: (typeof newsArticles.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const whereClause = cursorCondition
    ? and(
        PUBLISHED,
        or(
          lt(newsArticles.publishedAt, cursorCondition.publishedAt),
          and(
            eq(newsArticles.publishedAt, cursorCondition.publishedAt),
            lt(newsArticles.id, cursorCondition.id)
          )
        )
      )
    : PUBLISHED;

  const rows = await db
    .select()
    .from(newsArticles)
    .where(whereClause)
    .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const articles = hasMore ? rows.slice(0, limit) : rows;
  const last = articles[articles.length - 1];
  const nextCursor = hasMore && last && last.publishedAt ? encodeCursor(last.publishedAt, last.id) : null;

  return { articles, nextCursor };
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
