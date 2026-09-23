import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  uploadFieldsSchema,
  versionFieldsSchema,
  updateFileSchema,
  listFilesQuerySchema,
} from "../../schemas/project-management";
import { getProjectAccess, atLeast } from "../../services/projects/project-access";
import {
  uploadProjectFile,
  uploadNewVersion,
  listProjectFiles,
  getFile,
  listVersions,
  getVersion,
  updateFileMetadata,
  deleteFile,
  ProjectFileError,
} from "../../services/projects/project-files-service";
import { contentDisposition } from "../../lib/file-types";
import { requireAuth } from "../../middleware/require-auth";
import { optionalAuth } from "../../middleware/optional-auth";
import type { Env, AuthVariables } from "../../types/env";

export const filesRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type Ctx = { env: Env; get: (k: "userId" | "role") => any };

async function requireProjectAccess(c: Ctx, projectId: string, minLevel: "manager" | "contributor") {
  const access = await getProjectAccess(c.env.DB, projectId, { userId: c.get("userId"), role: c.get("role") });
  if (!access || !atLeast(access.level, minLevel)) return null;
  return access;
}

function fileErrorStatus(code: ProjectFileError["code"]): 400 | 404 | 413 {
  switch (code) {
    case "FILE_NOT_FOUND":
    case "VERSION_NOT_FOUND":
      return 404;
    case "FILE_TOO_LARGE":
    case "QUOTA_EXCEEDED":
      return 413;
    default:
      return 400;
  }
}

async function readUpload(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }) {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return { file: null as null, fields: body };
  return { file, fields: body };
}

// GET /:id/files — list files visible to the caller (public visitors see published + public only).
filesRoutes.get("/:id/files", optionalAuth, zValidator("query", listFilesQuerySchema), async (c) => {
  const userId = c.get("userId");
  const role = c.get("role");
  const viewer = userId && role ? { userId, role } : null;

  const access = await getProjectAccess(c.env.DB, c.req.param("id"), viewer);
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const { category } = c.req.valid("query");
  const files = await listProjectFiles(c.env.DB, access.project.id, {
    category,
    publicOnly: access.level === "public",
  });

  return c.json({
    data: files.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      visibility: f.visibility,
      currentVersion: f.current_version,
      createdBy: f.created_by,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })),
  });
});

// POST /:id/files — upload a new file. multipart/form-data: file, visibility?, name?, note?
filesRoutes.post("/:id/files", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "contributor");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const { file, fields } = await readUpload(c);
  if (!file) return c.json({ error: { code: "VALIDATION_ERROR", message: "A 'file' field is required" } }, 400);

  const parsed = uploadFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid fields" } }, 400);
  }

  try {
    const result = await uploadProjectFile(c.env.DB, c.env.FILES, {
      projectId: access.project.id,
      uploadedBy: c.get("userId"),
      filename: file.name,
      displayName: parsed.data.name,
      visibility: parsed.data.visibility,
      note: parsed.data.note,
      bytes: await file.arrayBuffer(),
    });
    return c.json(
      {
        data: {
          id: result.id,
          name: result.name,
          category: result.category,
          visibility: result.visibility,
          currentVersion: result.current_version,
          size: result.version.size_bytes,
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof ProjectFileError) {
      return c.json({ error: { code: err.code, message: err.message } }, fileErrorStatus(err.code));
    }
    throw err;
  }
});

// PATCH /:id/files/:fileId — rename or change visibility.
filesRoutes.patch("/:id/files/:fileId", requireAuth, zValidator("json", updateFileSchema), async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const file = await getFile(c.env.DB, access.project.id, c.req.param("fileId"));
  if (!file) return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);

  await updateFileMetadata(c.env.DB, file.id, c.req.valid("json"));
  return c.json({ data: { updated: true } });
});

// DELETE /:id/files/:fileId — soft delete.
filesRoutes.delete("/:id/files/:fileId", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "manager");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const file = await getFile(c.env.DB, access.project.id, c.req.param("fileId"));
  if (!file) return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);

  await deleteFile(c.env.DB, file.id);
  return c.body(null, 204);
});

// GET /:id/files/:fileId/versions — version history.
filesRoutes.get("/:id/files/:fileId/versions", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "contributor");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const file = await getFile(c.env.DB, access.project.id, c.req.param("fileId"));
  if (!file) return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);

  const versions = await listVersions(c.env.DB, file.id);
  return c.json({
    data: versions.map((v) => ({
      version: v.version,
      originalName: v.original_name,
      mimeType: v.mime_type,
      size: v.size_bytes,
      note: v.note,
      uploadedBy: v.uploaded_by,
      createdAt: v.created_at,
    })),
  });
});

// POST /:id/files/:fileId/versions — upload a new version. multipart/form-data: file, note?
filesRoutes.post("/:id/files/:fileId/versions", requireAuth, async (c) => {
  const access = await requireProjectAccess(c, c.req.param("id"), "contributor");
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const existing = await getFile(c.env.DB, access.project.id, c.req.param("fileId"));
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);

  const { file, fields } = await readUpload(c);
  if (!file) return c.json({ error: { code: "VALIDATION_ERROR", message: "A 'file' field is required" } }, 400);

  const parsed = versionFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid fields" } }, 400);
  }

  try {
    const result = await uploadNewVersion(c.env.DB, c.env.FILES, {
      projectId: access.project.id,
      fileId: existing.id,
      uploadedBy: c.get("userId"),
      filename: file.name,
      note: parsed.data.note,
      bytes: await file.arrayBuffer(),
    });
    return c.json({ data: { version: result.version.version, size: result.version.size_bytes } }, 201);
  } catch (err) {
    if (err instanceof ProjectFileError) {
      return c.json({ error: { code: err.code, message: err.message } }, fileErrorStatus(err.code));
    }
    throw err;
  }
});

// GET /:id/files/:fileId/download?version=N — streams the file bytes from R2.
filesRoutes.get("/:id/files/:fileId/download", optionalAuth, async (c) => {
  // Optional auth, same reasoning as the list route: public files of a
  // published project must be downloadable by a signed-out visitor.
  const userId = c.get("userId");
  const role = c.get("role");
  const viewer = userId && role ? { userId, role } : null;
  const access = await getProjectAccess(c.env.DB, c.req.param("id"), viewer);
  if (!access) return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);

  const file = await getFile(c.env.DB, access.project.id, c.req.param("fileId"));
  if (!file) return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);
  if (access.level === "public" && file.visibility !== "public") {
    return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);
  }

  const versionParam = c.req.query("version");
  const version = versionParam ? Number(versionParam) : file.current_version;
  if (!Number.isInteger(version) || version < 1) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "version must be a positive integer" } }, 400);
  }

  const versionRow = await getVersion(c.env.DB, file.id, version);
  if (!versionRow) return c.json({ error: { code: "NOT_FOUND", message: "Version not found" } }, 404);

  const object = await c.env.FILES.get(versionRow.r2_key);
  if (!object) return c.json({ error: { code: "NOT_FOUND", message: "File data not found in storage" } }, 404);

  c.header("Content-Type", versionRow.mime_type);
  c.header("Content-Length", String(versionRow.size_bytes));
  c.header("Content-Disposition", contentDisposition("attachment", versionRow.original_name));
  return c.body(object.body);
});
