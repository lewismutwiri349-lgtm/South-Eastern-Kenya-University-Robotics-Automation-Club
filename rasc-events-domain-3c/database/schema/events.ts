import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Events is explicitly a separate domain from News per docs/01_Product_Vision.md
 * and docs/17_Feature_Roadmap.md — no shared table, no shared routes.
 *
 * This is the first Events slice: listing/detail + draft-publish content
 * management, mirroring the News domain's shape (docs/13_Documentation_Standards.md
 * consistency requirement). Registration, attendance, and calendar/ICS export —
 * called out in docs/01_Product_Vision.md and docs/17_Feature_Roadmap.md as part
 * of the Events domain — are deliberately deferred to a later sub-slice rather
 * than guessed at here; see docs/modules/events.md §8.
 */
export const EVENT_STATUSES = ["draft", "published", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * Has moderation/history value, so soft-deleted (deletedAt), per
 * docs/04_Database_Design.md §5 — same rationale as newsArticles.
 */
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    location: text("location").notNull(),
    // Both are wall-clock event times, not audit timestamps — modeled
    // separately from createdAt/updatedAt below.
    startAt: integer("start_at", { mode: "timestamp" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp" }),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(table.slug),
    organizerIdIdx: index("events_organizer_id_idx").on(table.organizerId),
    // Matches the actual public listing query: published, upcoming-first.
    statusStartAtIdx: index("events_status_start_at_idx").on(table.status, table.startAt),
  })
);
