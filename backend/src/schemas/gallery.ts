import { z } from "zod";

export const createGalleryItemSchema = z.object({
  title: z.string().min(1).max(200),
  caption: z.string().min(1).max(1000),
  imageUrl: z.string().url().max(2000),
  category: z.string().min(1).max(100).optional(),
  capturedAt: z.coerce.date(),
});
export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;

export const updateGalleryItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  caption: z.string().min(1).max(1000).optional(),
  imageUrl: z.string().url().max(2000).optional(),
  category: z.string().min(1).max(100).nullable().optional(),
  capturedAt: z.coerce.date().optional(),
});
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4.
// `category` is an optional public filter — the gallery is the one public
// listing where browsing by category is the natural interaction, unlike
// News/Awards where chronology is the only ordering that matters.
export const listGalleryItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(24),
  cursor: z.string().optional(),
  category: z.string().min(1).max(100).optional(),
});
export type ListGalleryItemsQuery = z.infer<typeof listGalleryItemsQuerySchema>;
