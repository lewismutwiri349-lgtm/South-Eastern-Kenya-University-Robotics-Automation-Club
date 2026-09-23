import { z } from "zod";
import { categorySchema, githubUrlSchema, tagsSchema } from "./project-management";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(400),
  body: z.string().min(1).max(50_000),
  coverImageUrl: z.string().url().max(2000).optional(),
  category: categorySchema.optional(),
  githubUrl: githubUrlSchema.optional(),
  tags: tagsSchema.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(400).optional(),
  body: z.string().min(1).max(50_000).optional(),
  coverImageUrl: z.string().url().max(2000).nullable().optional(),
  category: categorySchema.nullable().optional(),
  githubUrl: githubUrlSchema.nullable().optional(),
  // Replaces the whole tag set when present.
  tags: tagsSchema.optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4.
export const listProjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
