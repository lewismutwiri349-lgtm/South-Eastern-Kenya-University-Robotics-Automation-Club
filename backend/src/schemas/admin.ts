import { z } from "zod";
import { USER_ROLES } from "../../../database/schema";
import { APPLICATION_STATUSES } from "../../../database/schema";

/**
 * Validation schemas for the Administration domain (Phase 6 — User &
 * Applicant Management slice).
 */

// Cursor-based pagination per docs/05_API_Standards.md §4, same shape as
// Contact's listContactMessagesQuerySchema.
export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  // Matches on name or email (case-insensitive substring) — kept as a
  // single free-text param rather than separate name/email fields, since
  // staff searching a roster don't think in those terms.
  q: z.string().trim().min(1).max(200).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const changeUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;

export const listApplicationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
});
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

// Optional free-text note recorded on the audit log entry (e.g. why an
// application was rejected). Never emailed to the applicant automatically —
// Notifications is a reserved, unbuilt domain per docs/01_Product_Vision.md.
export const applicationDecisionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionSchema>;
