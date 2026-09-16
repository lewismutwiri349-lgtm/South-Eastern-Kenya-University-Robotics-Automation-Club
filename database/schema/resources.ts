import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Phase 2 scope only, per docs/17_Feature_Roadmap.md — "Gallery, Resources,
 * Contact" as part of the Public Website.
 *
 * A resource is a *link out* to material the club recommends (datasheets,
 * tutorials, toolchain downloads, standards), not a hosted file. Hosting
 * files is the Phase 5 upload pipeline, deferred per
 * docs/03_Technical_Architecture.md §8. When that lands, a hosted file gets
 * an R2-backed URL written into this same `url` column. See
 * docs/modules/resources.md §4.
 */
export const RESOURCE_STATUSES = ["draft", "published", "archived"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const resources = sqliteTable(
  "resources",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    url: text("url").notNull(),
    // Free-text, not an enum — same reasoning as Gallery's `category` and
    // Awards' `category`: the club's taxonomy ("Datasheet", "Tutorial",
    // "Toolchain", "Standard") will change faster than a schema should.
    category: text("category"),
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
    slugIdx: uniqueIndex("resources_slug_idx").on(table.slug),
    authorIdIdx: index("resources_author_id_idx").on(table.authorId),
    // Matches the actual public listing query: published resources, newest
    // first. Unlike Gallery/Awards/Events there is no separate domain date
    // here — a link has no "happened on" moment, so publishedAt is the only
    // meaningful ordering key.
    statusPublishedAtIdx: index("resources_status_published_at_idx").on(
      table.status,
      table.publishedAt
    ),
  })
);
