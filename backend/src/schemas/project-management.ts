import { z } from "zod";
import { FILE_CATEGORIES } from "../lib/file-types";

export const PROJECT_CATEGORIES = [
  "robotics",
  "automation",
  "embedded",
  "electronics",
  "mechanical",
  "software",
  "research",
  "other",
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const MAX_TAGS_PER_PROJECT = 8;

/** Lower-case slug-style tag: "Line Follower" -> "line-follower". */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,29}$/;

export const tagsSchema = z
  .array(z.string().max(60))
  .max(MAX_TAGS_PER_PROJECT)
  .transform((tags) => [...new Set(tags.map(normalizeTag))])
  .refine((tags) => tags.every((t) => TAG_PATTERN.test(t)), {
    message: "Tags must be 1-30 characters: letters, numbers and hyphens",
  });

export const categorySchema = z.enum(PROJECT_CATEGORIES);

/**
 * GitHub repository link: https://github.com/<owner>/<repo>. Checked by
 * shape rather than fetched — keeps the Worker off the GitHub API and
 * avoids storing arbitrary URLs that would later be rendered as links.
 */
const GITHUB_REPO = /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}\/?$/;

export const githubUrlSchema = z
  .string()
  .max(300)
  .regex(GITHUB_REPO, "Must be a GitHub repository URL, e.g. https://github.com/owner/repo")
  .transform((u) => u.replace(/\/$/, "").replace(/\.git$/, ""));

// --- Search / browse ------------------------------------------------------

/** Comma-separated tag filter; a project must have ALL listed tags. */
const tagFilterSchema = z
  .string()
  .max(300)
  .optional()
  .transform((v) =>
    v
      ? [...new Set(v.split(",").map(normalizeTag).filter(Boolean))].slice(0, 5)
      : []
  );

export const searchProjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).optional(),
  q: z.string().trim().max(100).optional(),
  category: categorySchema.optional(),
  tag: tagFilterSchema,
});
export type SearchProjectsQuery = z.infer<typeof searchProjectsQuerySchema>;

export const myProjectsQuerySchema = searchProjectsQuerySchema.extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
  /** `all` (every project, any status) is only honoured for management roles. */
  scope: z.enum(["mine", "all"]).default("mine"),
});
export type MyProjectsQuery = z.infer<typeof myProjectsQuerySchema>;

// --- Files ----------------------------------------------------------------

export const FILE_VISIBILITIES = ["team", "public"] as const;

export const uploadFieldsSchema = z.object({
  visibility: z.enum(FILE_VISIBILITIES).default("team"),
  note: z.string().trim().max(500).optional(),
  /** Display name; defaults to the uploaded file's own name. */
  name: z.string().trim().min(1).max(150).optional(),
});

export const versionFieldsSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const updateFileSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    visibility: z.enum(FILE_VISIBILITIES).optional(),
  })
  .refine((v) => v.name !== undefined || v.visibility !== undefined, {
    message: "Provide name and/or visibility",
  });

export const listFilesQuerySchema = z.object({
  category: z.enum(FILE_CATEGORIES).optional(),
});

// --- Team -----------------------------------------------------------------

export const TEAM_ROLES = ["lead", "contributor"] as const;

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum(TEAM_ROLES).default("contributor"),
});

export const candidatesQuerySchema = z.object({
  q: z.string().trim().min(2).max(60),
});
