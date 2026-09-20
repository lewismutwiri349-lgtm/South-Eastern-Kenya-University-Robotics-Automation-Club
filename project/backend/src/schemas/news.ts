import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(400),
  body: z.string().min(1).max(50_000),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().min(1).max(400).optional(),
  body: z.string().min(1).max(50_000).optional(),
});
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4.
export const listArticlesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
