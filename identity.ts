import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * Verification tokens are stored hashed (SHA-256), never in plaintext —
 * matches docs/08_Security_Standards.md. The raw token is emailed to the
 * user and never persisted.
 */
export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
