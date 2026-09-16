import { z } from "zod";

/**
 * Public, unauthenticated write path — the only one in the codebase outside
 * Identity's register/login. Length ceilings here are the primary defence
 * against a single request filling D1 with a multi-megabyte body, so they
 * are deliberately tighter than the content domains' (which are authored by
 * trusted, role-checked staff).
 */
export const createContactMessageSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});
export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4. Ordered by
// (createdAt, id) rather than a publish date — a contact message has no
// publish lifecycle, only an arrival time.
export const listContactMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  // Defaults to the triage view staff actually want on opening the list:
  // unhandled only. Pass `handled=all` to see everything.
  handled: z.enum(["unhandled", "all"]).default("unhandled"),
});
export type ListContactMessagesQuery = z.infer<typeof listContactMessagesQuerySchema>;
