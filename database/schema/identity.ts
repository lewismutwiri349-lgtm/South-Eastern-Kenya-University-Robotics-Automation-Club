import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Authoritative role list — matches docs/00_Project_Constitution.md §4.
 * Stored as text (SQLite has no native enum); validated at the Zod schema
 * layer, not just here.
 */
export const USER_ROLES = [
  "super_admin",
  "chairperson",
  "vice_chairperson",
  "secretary",
  "treasurer",
  "division_head",
  "project_leader",
  "moderator",
  "member",
  "applicant",
] as const;
// "Visitor" is intentionally excluded — it represents an unauthenticated
// browser, not a row in the users table.

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Confirmed with project owner (2026-08-04): a newly registered account
 * defaults to "applicant" — registering is the first step before actually
 * submitting an application via the Applicant Portal.
 */
export const DEFAULT_USER_ROLE: UserRole = "applicant";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default(DEFAULT_USER_ROLE),
  emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * Verification tokens are stored hashed (SHA-256), never in plaintext —
 * matches docs/08_Security_Standards.md. The raw token is emailed to the
 * user and never persisted.
 */
export const emailVerificationTokens = sqliteTable(
  "email_verification_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
    // Every lookup is WHERE tokenHash = ? — this is the index that matters most.
    tokenHashIdx: uniqueIndex("email_verification_tokens_token_hash_idx").on(table.tokenHash),
  })
);

/**
 * Append-only security record for Identity actions. Application code never
 * exposes update or delete operations for this table.
 */
export const identityAuditLogs = sqliteTable(
  "identity_audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id),
    targetUserId: text("target_user_id").references(() => users.id),
    action: text("action").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    actorUserIdIdx: index("identity_audit_logs_actor_user_id_idx").on(table.actorUserId),
    targetUserIdIdx: index("identity_audit_logs_target_user_id_idx").on(table.targetUserId),
    createdAtIdx: index("identity_audit_logs_created_at_idx").on(table.createdAt),
  })
);

/**
 * Short-lived counters for sensitive unauthenticated Identity routes. The
 * identifier is a SHA-256 digest, so application data never retains a raw IP.
 */
export const identityRateLimits = sqliteTable(
  "identity_rate_limits",
  {
    id: text("id").primaryKey(),
    route: text("route").notNull(),
    identifierHash: text("identifier_hash").notNull(),
    requestCount: integer("request_count").notNull(),
    windowStartedAt: integer("window_started_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    routeIdentifierIdx: uniqueIndex("identity_rate_limits_route_identifier_idx").on(
      table.route,
      table.identifierHash
    ),
  })
);

/**
 * D1-backed session (single token, not access/refresh pair) — see
 * docs/08_Security_Standards.md §1 for the rationale. Sessions are
 * transactional/ephemeral data, so per docs/04_Database_Design.md §5 they
 * are hard-deleted (logout, expiry cleanup), never soft-deleted.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
  })
);

/**
 * Same hashed-token pattern as email verification. A password reset
 * additionally revokes all of the user's active sessions once used — see
 * password-reset-service.ts — so a stolen old session can't survive a
 * password change.
 */
export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: uniqueIndex("password_reset_tokens_token_hash_idx").on(table.tokenHash),
  })
);
