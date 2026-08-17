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
    // Null = uncapped — every registration lands directly as "registered",
    // the waitlist path in event-registrations.ts never triggers. Set by
    // the organizer at creation (docs/modules/events.md §8/§10 —
    // registration sub-slice, confirmed with Lewis 2026-08-14: waitlisting
    // in scope, capacity optional per event).
    capacity: integer("capacity"),
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

export const REGISTRATION_STATUSES = ["registered", "waitlisted", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/**
 * One row per (event, user), ever — re-registering after a cancellation
 * updates the existing row rather than inserting a new one, per
 * docs/modules/events.md §10. `registeredAt` doubles as the FIFO ordering
 * key for waitlist promotion, so it's bumped on every (re-)registration,
 * not just the first.
 *
 * Not soft-deleted in the events.ts sense (no separate deletedAt) —
 * "cancelled" is itself a first-class status, since a cancelled
 * registration has ongoing value (frees a waitlist seat, shows in an
 * organizer's history) rather than being logically absent data.
 */
export const eventRegistrations = sqliteTable(
  "event_registrations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    registeredAt: integer("registered_at", { mode: "timestamp" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    eventUserIdx: uniqueIndex("event_registrations_event_user_idx").on(table.eventId, table.userId),
    userIdIdx: index("event_registrations_user_id_idx").on(table.userId),
    // Matches both real queries: counting active registrants for capacity,
    // and finding the oldest waitlisted row to promote on a cancellation.
    eventStatusRegisteredAtIdx: index("event_registrations_event_status_registered_at_idx").on(
      table.eventId,
      table.status,
      table.registeredAt
    ),
  })
);
