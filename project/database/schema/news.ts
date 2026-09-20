import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/**
 * News is explicitly a separate domain from Events per docs/01_Product_Vision.md
 * and docs/17_Feature_Roadmap.md — no shared table, no shared routes.
 *
 * Has moderation/history value, so soft-deleted (deletedAt), per
 * docs/04_Database_Design.md §5 — unlike Identity's sessions/tokens, which
 * are hard-deleted.
 */
export const newsArticles = sqliteTable(
  "news_articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
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
    slugIdx: uniqueIndex("news_articles_slug_idx").on(table.slug),
    authorIdIdx: index("news_articles_author_id_idx").on(table.authorId),
    // Matches the actual public listing query: published articles, newest first.
    statusPublishedAtIdx: index("news_articles_status_published_at_idx").on(
      table.status,
      table.publishedAt
    ),
  })
);
