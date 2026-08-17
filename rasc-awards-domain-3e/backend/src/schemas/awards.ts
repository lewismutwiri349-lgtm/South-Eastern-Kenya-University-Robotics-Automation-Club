import { z } from "zod";

export const createAwardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  recipientName: z.string().min(1).max(200),
  category: z.string().min(1).max(100).optional(),
  awardedAt: z.coerce.date(),
  coverImageUrl: z.string().url().max(2000).optional(),
});
export type CreateAwardInput = z.infer<typeof createAwardSchema>;

export const updateAwardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10_000).optional(),
  recipientName: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).nullable().optional(),
  awardedAt: z.coerce.date().optional(),
  coverImageUrl: z.string().url().max(2000).nullable().optional(),
});
export type UpdateAwardInput = z.infer<typeof updateAwardSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4.
export const listAwardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type ListAwardsQuery = z.infer<typeof listAwardsQuerySchema>;
