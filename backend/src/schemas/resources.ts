import { z } from "zod";

/**
 * `url` is restricted to http/https. `z.string().url()` alone accepts any
 * scheme WHATWG considers valid, including `javascript:` and `data:` — a
 * stored resource URL is rendered as a clickable link on a public page, so
 * an unrestricted scheme here is a stored-XSS vector per
 * docs/08_Security_Standards.md. Checked server-side, not just in the form.
 */
const httpUrl = z
  .string()
  .url()
  .max(2000)
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must use http or https" }
  );

export const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  url: httpUrl,
  category: z.string().min(1).max(100).optional(),
});
export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  url: httpUrl.optional(),
  category: z.string().min(1).max(100).nullable().optional(),
});
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4. `category` is an
// optional public filter, same rationale as Gallery — a resource library is
// browsed by kind, not only by date.
export const listResourcesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  category: z.string().min(1).max(100).optional(),
});
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;
