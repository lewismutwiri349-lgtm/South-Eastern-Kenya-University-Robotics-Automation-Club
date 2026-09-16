import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Phase 2 scope only, per docs/17_Feature_Roadmap.md — "Gallery, Resources,
 * Contact" as part of the Public Website.
 *
 * Inbound messages from the public contact form. Unlike every other domain
 * built so far this is *write-by-anonymous, read-by-staff* rather than the
 * reverse, which drives three deliberate differences:
 *
 * 1. No `slug` and no public GET-by-id — a contact message is never a
 *    public page, so it has no addressable public identity.
 * 2. No `status`/`publishedAt` publish workflow. Instead `handledAt` marks
 *    a message as dealt with. Triage UI (assignment, threading, replies)
 *    belongs to the Phase 6 Admin Dashboard and is deliberately not built
 *    here; see docs/modules/contact.md §8.
 * 3. `submitterIpHash` stores a hash, never the raw IP, per
 *    docs/08_Security_Standards.md — enough to correlate abuse across
 *    submissions without retaining a raw identifier.
 *
 * Soft-deleted (deletedAt) per docs/04_Database_Design.md §5: a message
 * dismissed by mistake should be recoverable.
 */
export const contactMessages = sqliteTable(
  "contact_messages",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    submitterIpHash: text("submitter_ip_hash"),
    handledAt: integer("handled_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    // Matches the actual staff listing query: newest first.
    createdAtIdx: index("contact_messages_created_at_idx").on(table.createdAt),
    // Matches the "unhandled only" filter used by the listing endpoint.
    handledAtIdx: index("contact_messages_handled_at_idx").on(table.handledAt),
  })
);
