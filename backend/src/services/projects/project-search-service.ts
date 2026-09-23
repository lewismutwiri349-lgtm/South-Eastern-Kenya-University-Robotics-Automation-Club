import { normalizeTag, MAX_TAGS_PER_PROJECT } from "../../schemas/project-management";

/**
 * Browse / search over projects (Phase 5). Raw D1 statements, like the other
 * Phase 3+ services. Two scopes share one query builder:
 *   public — published projects only, newest published first
 *   mine   — projects the user owns or is assigned to (or every project, for
 *            oversight roles), any status, most recently updated first
 */

export type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  category: string | null;
  githubUrl: string | null;
  tags: string[];
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image_url: string | null;
  category: string | null;
  github_url: string | null;
  status: string;
  published_at: number | null;
  updated_at: number;
  tags: string | null;
};

export type SearchOptions = {
  limit: number;
  cursor?: string;
  q?: string;
  category?: string;
  tag?: string[];
  scope: { kind: "public" } | { kind: "mine"; userId: string; status?: string } | { kind: "all"; status?: string };
};

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

function toSummary(r: Row): ProjectSummary {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    coverImageUrl: r.cover_image_url,
    category: r.category,
    githubUrl: r.github_url,
    tags: r.tags ? r.tags.split(",").sort() : [],
    status: r.status,
    publishedAt: r.published_at === null ? null : iso(r.published_at),
    updatedAt: iso(r.updated_at),
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid cursor");
    this.name = "InvalidCursorError";
  }
}

function encodeCursor(key: number, id: string): string {
  return Buffer.from(JSON.stringify({ k: key, id })).toString("base64url");
}

function decodeCursor(cursor: string): { k: number; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
    if (typeof parsed?.k === "number" && typeof parsed?.id === "string") return parsed;
  } catch {
    // fall through
  }
  throw new InvalidCursorError();
}

export async function searchProjects(
  db: D1Database,
  opts: SearchOptions
): Promise<{ projects: ProjectSummary[]; nextCursor: string | null }> {
  const where: string[] = ["p.deleted_at IS NULL"];
  const binds: (string | number)[] = [];

  // Public listing is ordered by publish time; everything else by last edit.
  const sortColumn = opts.scope.kind === "public" ? "p.published_at" : "p.updated_at";

  if (opts.scope.kind === "public") {
    where.push("p.status = 'published'");
  } else {
    if (opts.scope.status) {
      where.push("p.status = ?");
      binds.push(opts.scope.status);
    }
    if (opts.scope.kind === "mine") {
      where.push(
        `(p.owner_id = ? OR EXISTS (
            SELECT 1 FROM member_projects mp
              JOIN member_profiles mprof ON mprof.id = mp.member_id
             WHERE mp.project_id = p.id AND mprof.user_id = ?))`
      );
      binds.push(opts.scope.userId, opts.scope.userId);
    }
  }

  if (opts.category) {
    where.push("p.category = ?");
    binds.push(opts.category);
  }

  for (const tag of (opts.tag ?? []).slice(0, MAX_TAGS_PER_PROJECT)) {
    where.push("EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag = ?)");
    binds.push(tag);
  }

  // Free text: every word must match the title, summary or a tag.
  const words = (opts.q ?? "").split(/\s+/).filter(Boolean).slice(0, 5);
  for (const word of words) {
    const like = `%${escapeLike(word.toLowerCase())}%`;
    where.push(
      `(LOWER(p.title) LIKE ? ESCAPE '\\'
        OR LOWER(p.summary) LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM project_tags t WHERE t.project_id = p.id AND t.tag LIKE ? ESCAPE '\\'))`
    );
    binds.push(like, like, like);
  }

  if (opts.cursor) {
    const { k, id } = decodeCursor(opts.cursor);
    where.push(`(${sortColumn} < ? OR (${sortColumn} = ? AND p.id < ?))`);
    binds.push(k, k, id);
  }

  const sql = `
    SELECT p.id, p.title, p.slug, p.summary, p.cover_image_url, p.category, p.github_url,
           p.status, p.published_at, p.updated_at,
           (SELECT group_concat(t.tag, ',') FROM project_tags t WHERE t.project_id = p.id) AS tags
      FROM projects p
     WHERE ${where.join(" AND ")}
     ORDER BY ${sortColumn} DESC, p.id DESC
     LIMIT ?`;
  binds.push(opts.limit + 1); // one extra row tells us whether another page exists

  const { results } = await db.prepare(sql).bind(...binds).all<Row>();
  const hasMore = results.length > opts.limit;
  const page = hasMore ? results.slice(0, opts.limit) : results;

  const last = page[page.length - 1];
  const lastKey = last ? (opts.scope.kind === "public" ? last.published_at : last.updated_at) : null;
  const nextCursor = hasMore && last && lastKey !== null ? encodeCursor(lastKey, last.id) : null;

  return { projects: page.map(toSummary), nextCursor };
}

/** Category and tag counts across published projects, for the filter UI. */
export async function getFacets(db: D1Database): Promise<{
  categories: { value: string; count: number }[];
  tags: { value: string; count: number }[];
}> {
  const [cats, tags] = await Promise.all([
    db
      .prepare(
        `SELECT category AS value, COUNT(*) AS count FROM projects
          WHERE status = 'published' AND deleted_at IS NULL AND category IS NOT NULL
          GROUP BY category ORDER BY count DESC, value ASC`
      )
      .all<{ value: string; count: number }>(),
    db
      .prepare(
        `SELECT t.tag AS value, COUNT(*) AS count
           FROM project_tags t JOIN projects p ON p.id = t.project_id
          WHERE p.status = 'published' AND p.deleted_at IS NULL
          GROUP BY t.tag ORDER BY count DESC, value ASC LIMIT 50`
      )
      .all<{ value: string; count: number }>(),
  ]);
  return { categories: cats.results, tags: tags.results };
}

export async function getProjectTags(db: D1Database, projectId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT tag FROM project_tags WHERE project_id = ? ORDER BY tag")
    .bind(projectId)
    .all<{ tag: string }>();
  return results.map((r) => r.tag);
}

/** Replaces the project's whole tag set atomically. */
export async function setProjectTags(db: D1Database, projectId: string, tags: string[]): Promise<void> {
  const clean = [...new Set(tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS_PER_PROJECT);
  await db.batch([
    db.prepare("DELETE FROM project_tags WHERE project_id = ?").bind(projectId),
    ...clean.map((tag) =>
      db.prepare("INSERT INTO project_tags (project_id, tag) VALUES (?, ?)").bind(projectId, tag)
    ),
  ]);
}
