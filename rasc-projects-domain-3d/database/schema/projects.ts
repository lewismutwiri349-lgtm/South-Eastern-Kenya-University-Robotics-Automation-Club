import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Phase 2 scope only, per docs/17_Feature_Roadmap.md — "public-facing
 * listing/detail views". Full project management (drag-and-drop uploads,
 * version history, search/filters/tags, GitHub link integration) is
 * explicitly Phase 5 and deliberately not built here; see
 * docs/modules/projects.md §8. This slice is a content-management model —
 * structurally the same shape as News — not a project-tracking system.
 */
export const PROJECT_STATUSES = ["draft", "published", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Has moderation/history value, so soft-deleted (deletedAt), per
 * docs/04_Database_Design.md §5 — same rationale as News and Events.
 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    // Plain URL, not a managed upload — Phase 5 owns the real upload
    // pipeline (docs/17_Feature_Roadmap.md Phase 5). Nullable: a project
    // can be listed before a cover image exists.
    coverImageUrl: text("cover_image_url"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("projects_slug_idx").on(table.slug),
    ownerIdIdx: index("projects_owner_id_idx").on(table.ownerId),
    // Matches the actual public listing query: published projects, newest first.
    statusPublishedAtIdx: index("projects_status_published_at_idx").on(
      table.status,
      table.publishedAt
    ),
  })
);
