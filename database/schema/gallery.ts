import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Phase 2 scope only, per docs/17_Feature_Roadmap.md — "Gallery, Resources,
 * Contact" as part of the Public Website.
 *
 * `imageUrl` is a plain URL, not a managed upload. This is the same
 * deliberate call already made for `projects.coverImageUrl` and
 * `awards.coverImageUrl`: the real upload pipeline (drag-and-drop, R2
 * storage, size/type limits, virus scanning) is explicitly Phase 5 and
 * docs/03_Technical_Architecture.md §8 lists it as a deferred decision.
 * Building an upload-backed gallery now would force that decision early.
 * When Phase 5 lands, it populates this same column — no migration needed
 * for existing rows. See docs/modules/gallery.md §4.
 */
export const GALLERY_ITEM_STATUSES = ["draft", "published", "archived"] as const;
export type GalleryItemStatus = (typeof GALLERY_ITEM_STATUSES)[number];

/**
 * Has archival value, so soft-deleted (deletedAt), per
 * docs/04_Database_Design.md §5 — same rationale as News/Events/Projects/Awards.
 */
export const galleryItems = sqliteTable(
  "gallery_items",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    caption: text("caption").notNull(),
    imageUrl: text("image_url").notNull(),
    // Free-text, not an enum — the club's own categorisation ("Competition",
    // "Workshop", "Build Log") will change faster than a schema should.
    // Nullable: an uncategorised photo is still a valid gallery entry.
    category: text("category"),
    // When the photo was taken, distinct from publishedAt (when it went
    // live on the site) — same domain-date-vs-publish-date split as Events'
    // startAt and Awards' awardedAt.
    capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
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
    slugIdx: uniqueIndex("gallery_items_slug_idx").on(table.slug),
    authorIdIdx: index("gallery_items_author_id_idx").on(table.authorId),
    // Matches the actual public listing query: published items, most
    // recently captured first.
    statusCapturedAtIdx: index("gallery_items_status_captured_at_idx").on(
      table.status,
      table.capturedAt
    ),
  })
);
