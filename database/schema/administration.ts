import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Administration domain — Phase 6 (Admin Dashboard), per
 * docs/01_Product_Vision.md's domain table: "User management, moderation,
 * division/news/event management, system settings, audit logs".
 *
 * Deliberately a separate table from `identityAuditLogs`: that table is
 * scoped to Identity security events (login, password reset, email
 * verification) per its own doc comment. Administration actions — role
 * grants, applicant decisions, and (future) project moderation / content
 * moderation / settings changes — are a distinct domain's audit trail per
 * docs/08_Security_Standards.md §7, which lists them as a separate
 * category from Identity's own log.
 */
export const ADMIN_AUDIT_ACTIONS = [
  "user_role_changed",
  "application_accepted",
  "application_rejected",
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

/**
 * Append-only. Application code never exposes update or delete operations
 * for this table — matches docs/08_Security_Standards.md §7 ("Audit logs
 * are readable by Super Admin only, and are never editable or deletable
 * through the application layer").
 */
export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id),
    targetUserId: text("target_user_id").references(() => users.id),
    action: text("action").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    actorUserIdIdx: index("admin_audit_logs_actor_user_id_idx").on(table.actorUserId),
    targetUserIdIdx: index("admin_audit_logs_target_user_id_idx").on(table.targetUserId),
    createdAtIdx: index("admin_audit_logs_created_at_idx").on(table.createdAt),
  })
);
