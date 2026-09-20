import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { projects } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateProjectInput, UpdateProjectInput } from "../../schemas/projects";

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ProjectNotFoundError";
  }
}

export async function createProject(
  env: Env,
  ownerId: string,
  input: CreateProjectInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(projects).where(eq(projects.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(projects).values({
    id,
    title: input.title,
    slug,
    summary: input.summary,
    body: input.body,
    coverImageUrl: input.coverImageUrl ?? null,
    ownerId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateProject(
  env: Env,
  projectId: string,
  input: UpdateProjectInput
): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!existing) throw new ProjectNotFoundError();

  await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function publishProject(env: Env, projectId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!existing) throw new ProjectNotFoundError();

  const now = new Date();
  await db
    .update(projects)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(projects.id, projectId));
}

export async function deleteProject(env: Env, projectId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!existing) throw new ProjectNotFoundError();

  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(eq(projects.id, projectId));
}

const PUBLISHED = and(eq(projects.status, "published"), isNull(projects.deletedAt));

export async function getPublishedProjectBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), PUBLISHED));
  return project ?? null;
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (publishedAt, id) descending, same as News (newest-first), unlike
 * Events (soonest-first) — Projects has no inherent "when" dimension the
 * way an event does.
 */
export async function listPublishedProjects(
  env: Env,
  { limit, cursor }: { limit: number; cursor?: string }
): Promise<{ projects: (typeof projects.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const whereClause = cursorCondition
    ? and(
        PUBLISHED,
        or(
          lt(projects.publishedAt, cursorCondition.publishedAt),
          and(eq(projects.publishedAt, cursorCondition.publishedAt), lt(projects.id, cursorCondition.id))
        )
      )
    : PUBLISHED;

  const rows = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(desc(projects.publishedAt), desc(projects.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor = hasMore && last && last.publishedAt ? encodeCursor(last.publishedAt, last.id) : null;

  return { projects: result, nextCursor };
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
