import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Phase 2 scope only, per docs/17_Feature_Roadmap.md — "Awards &
 * Recognition (public view)". The full Awards System (badges,
 * certificates, Hall of Fame, Engineer/Project of the Month workflows) is
 * explicitly Phase 8 and deliberately not built here; see
 * docs/modules/awards.md §8.
 *
 * `recipientName` is a free-text field, not a foreign key to `users` — a
 * deliberate scope call, not a guess made silently: Phase 8 owns the
 * actual nomination/approval workflow, and tying this to a real member
 * record now would mean inventing that structure ahead of that decision.
 * See docs/modules/awards.md §4.
 */
export const AWARD_STATUSES = ["draft", "published", "archived"] as const;
export type AwardStatus = (typeof AWARD_STATUSES)[number];

/**
 * Has recognition/history value, so soft-deleted (deletedAt), per
 * docs/04_Database_Design.md §5 — same rationale as News/Events/Projects.
 */
export const awards = sqliteTable(
  "awards",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    recipientName: text("recipient_name").notNull(),
    // Free-text, not an enum — Phase 8 owns the real category/workflow
    // model (Engineer of the Month, Hall of Fame, etc.). Nullable: a
    // generic recognition entry doesn't have to fit a category yet.
    category: text("category"),
    // The date being recognized for, distinct from publishedAt (when it
    // went live on the site) — same publishedAt-vs-domain-date split as
    // Events' startAt.
    awardedAt: integer("awarded_at", { mode: "timestamp" }).notNull(),
    coverImageUrl: text("cover_image_url"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("awards_slug_idx").on(table.slug),
    authorIdIdx: index("awards_author_id_idx").on(table.authorId),
    // Matches the actual public listing query: published awards, most
    // recently awarded first.
    statusAwardedAtIdx: index("awards_status_awarded_at_idx").on(table.status, table.awardedAt),
  })
);
