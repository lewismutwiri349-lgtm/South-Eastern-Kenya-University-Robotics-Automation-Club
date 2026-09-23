import { generateId } from "../../lib/id-generator";
import {
  classifyUpload,
  contentDisposition,
  isInlineMime,
  sanitizeFilename,
  MAX_FILE_BYTES,
  PROJECT_STORAGE_QUOTA_BYTES,
  SIGNATURE_READ_BYTES,
  type FileCategory,
} from "../../lib/file-types";

/**
 * Project file storage (Phase 5). Bytes live in R2 under
 *   projects/<projectId>/<fileId>/v<version><ext>
 * metadata (name, category, visibility, current version) lives in
 * `project_files`, and one `project_file_versions` row is written per
 * upload — so history is never overwritten, only appended to.
 *
 * Raw D1 + R2 calls throughout, matching the other Phase 3+ services.
 */

export class ProjectFileError extends Error {
  constructor(
    message: string,
    readonly code:
      | "FILE_NOT_FOUND"
      | "VERSION_NOT_FOUND"
      | "UNSUPPORTED_TYPE"
      | "CONTENT_MISMATCH"
      | "FILE_TOO_LARGE"
      | "QUOTA_EXCEEDED"
      | "EMPTY_FILE"
  ) {
    super(message);
    this.name = "ProjectFileError";
  }
}

export type FileRow = {
  id: string;
  project_id: string;
  name: string;
  category: FileCategory;
  visibility: "team" | "public";
  current_version: number;
  created_by: string;
  created_at: number;
  updated_at: number;
};

export type VersionRow = {
  id: string;
  file_id: string;
  version: number;
  r2_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  note: string | null;
  uploaded_by: string;
  created_at: number;
};

function r2Key(projectId: string, fileId: string, version: number, extension: string): string {
  return `projects/${projectId}/${fileId}/v${version}${extension ? `.${extension}` : ""}`;
}

async function currentStorageBytes(db: D1Database, projectId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(v.size_bytes), 0) AS total
         FROM project_file_versions v
         JOIN project_files f ON f.id = v.file_id
        WHERE f.project_id = ? AND f.deleted_at IS NULL AND v.version = f.current_version`
    )
    .bind(projectId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/** Uploads a brand-new file (version 1) to a project. */
export async function uploadProjectFile(
  db: D1Database,
  bucket: R2Bucket,
  params: {
    projectId: string;
    uploadedBy: string;
    filename: string;
    displayName?: string;
    visibility: "team" | "public";
    note?: string;
    bytes: ArrayBuffer;
  }
): Promise<FileRow & { version: VersionRow }> {
  const { projectId, uploadedBy, filename, visibility, note, bytes } = params;

  if (bytes.byteLength === 0) throw new ProjectFileError("File is empty", "EMPTY_FILE");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new ProjectFileError(`File exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit`, "FILE_TOO_LARGE");
  }

  const head = new Uint8Array(bytes.slice(0, SIGNATURE_READ_BYTES));
  const classified = classifyUpload(filename, head);
  if (!classified.ok) {
    throw new ProjectFileError(
      classified.reason === "unsupported_type" ? "File type is not allowed" : "File content does not match its extension",
      classified.reason === "unsupported_type" ? "UNSUPPORTED_TYPE" : "CONTENT_MISMATCH"
    );
  }

  const used = await currentStorageBytes(db, projectId);
  if (used + bytes.byteLength > PROJECT_STORAGE_QUOTA_BYTES) {
    throw new ProjectFileError("Project storage quota exceeded", "QUOTA_EXCEEDED");
  }

  const now = Math.floor(Date.now() / 1000);
  const fileId = generateId();
  const versionId = generateId();
  const cleanName = sanitizeFilename(filename);
  const displayName = params.displayName?.trim() || cleanName;
  const key = r2Key(projectId, fileId, 1, classified.value.extension);

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: classified.value.mime,
      contentDisposition: contentDisposition(classified.value.inline ? "inline" : "attachment", cleanName),
    },
  });

  await db.batch([
    db
      .prepare(
        `INSERT INTO project_files (id, project_id, name, category, visibility, current_version, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(fileId, projectId, displayName, classified.value.category, visibility, uploadedBy, now, now),
    db
      .prepare(
        `INSERT INTO project_file_versions (id, file_id, version, r2_key, original_name, mime_type, size_bytes, note, uploaded_by, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, fileId, key, cleanName, classified.value.mime, bytes.byteLength, note ?? null, uploadedBy, now),
  ]);

  const version: VersionRow = {
    id: versionId,
    file_id: fileId,
    version: 1,
    r2_key: key,
    original_name: cleanName,
    mime_type: classified.value.mime,
    size_bytes: bytes.byteLength,
    note: note ?? null,
    uploaded_by: uploadedBy,
    created_at: now,
  };
  return {
    id: fileId,
    project_id: projectId,
    name: displayName,
    category: classified.value.category,
    visibility,
    current_version: 1,
    created_by: uploadedBy,
    created_at: now,
    updated_at: now,
    version,
  };
}

/** Uploads a new version of an existing file. Reuses the file's stored category. */
export async function uploadNewVersion(
  db: D1Database,
  bucket: R2Bucket,
  params: { projectId: string; fileId: string; uploadedBy: string; filename: string; note?: string; bytes: ArrayBuffer }
): Promise<{ file: FileRow; version: VersionRow }> {
  const { projectId, fileId, uploadedBy, filename, note, bytes } = params;

  const file = await db
    .prepare("SELECT * FROM project_files WHERE id = ? AND project_id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(fileId, projectId)
    .first<FileRow>();
  if (!file) throw new ProjectFileError("File not found", "FILE_NOT_FOUND");

  if (bytes.byteLength === 0) throw new ProjectFileError("File is empty", "EMPTY_FILE");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new ProjectFileError(`File exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit`, "FILE_TOO_LARGE");
  }

  const head = new Uint8Array(bytes.slice(0, SIGNATURE_READ_BYTES));
  const classified = classifyUpload(filename, head);
  if (!classified.ok) {
    throw new ProjectFileError(
      classified.reason === "unsupported_type" ? "File type is not allowed" : "File content does not match its extension",
      classified.reason === "unsupported_type" ? "UNSUPPORTED_TYPE" : "CONTENT_MISMATCH"
    );
  }

  const used = await currentStorageBytes(db, projectId);
  const previousSize = await db
    .prepare("SELECT size_bytes FROM project_file_versions WHERE file_id = ? AND version = ?")
    .bind(fileId, file.current_version)
    .first<{ size_bytes: number }>();
  const projectedUsed = used - (previousSize?.size_bytes ?? 0) + bytes.byteLength;
  if (projectedUsed > PROJECT_STORAGE_QUOTA_BYTES) {
    throw new ProjectFileError("Project storage quota exceeded", "QUOTA_EXCEEDED");
  }

  const now = Math.floor(Date.now() / 1000);
  const nextVersion = file.current_version + 1;
  const versionId = generateId();
  const cleanName = sanitizeFilename(filename);
  const key = r2Key(projectId, fileId, nextVersion, classified.value.extension);

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: classified.value.mime,
      contentDisposition: contentDisposition(isInlineMime(classified.value.mime) ? "inline" : "attachment", cleanName),
    },
  });

  await db.batch([
    db
      .prepare(
        `INSERT INTO project_file_versions (id, file_id, version, r2_key, original_name, mime_type, size_bytes, note, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, fileId, nextVersion, key, cleanName, classified.value.mime, bytes.byteLength, note ?? null, uploadedBy, now),
    db
      .prepare("UPDATE project_files SET current_version = ?, updated_at = ? WHERE id = ?")
      .bind(nextVersion, now, fileId),
  ]);

  return {
    file: { ...file, current_version: nextVersion, updated_at: now },
    version: {
      id: versionId,
      file_id: fileId,
      version: nextVersion,
      r2_key: key,
      original_name: cleanName,
      mime_type: classified.value.mime,
      size_bytes: bytes.byteLength,
      note: note ?? null,
      uploaded_by: uploadedBy,
      created_at: now,
    },
  };
}

export async function listProjectFiles(
  db: D1Database,
  projectId: string,
  opts: { category?: FileCategory; publicOnly: boolean }
): Promise<FileRow[]> {
  const where = ["project_id = ?", "deleted_at IS NULL"];
  const binds: (string | number)[] = [projectId];
  if (opts.category) {
    where.push("category = ?");
    binds.push(opts.category);
  }
  if (opts.publicOnly) where.push("visibility = 'public'");

  const { results } = await db
    .prepare(`SELECT * FROM project_files WHERE ${where.join(" AND ")} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<FileRow>();
  return results;
}

export async function getFile(db: D1Database, projectId: string, fileId: string): Promise<FileRow | null> {
  return db
    .prepare("SELECT * FROM project_files WHERE id = ? AND project_id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(fileId, projectId)
    .first<FileRow>();
}

export async function listVersions(db: D1Database, fileId: string): Promise<VersionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM project_file_versions WHERE file_id = ? ORDER BY version DESC")
    .bind(fileId)
    .all<VersionRow>();
  return results;
}

export async function getVersion(db: D1Database, fileId: string, version: number): Promise<VersionRow | null> {
  return db
    .prepare("SELECT * FROM project_file_versions WHERE file_id = ? AND version = ? LIMIT 1")
    .bind(fileId, version)
    .first<VersionRow>();
}

export async function updateFileMetadata(
  db: D1Database,
  fileId: string,
  updates: { name?: string; visibility?: "team" | "public" }
): Promise<void> {
  const sets: string[] = ["updated_at = ?"];
  const binds: (string | number)[] = [Math.floor(Date.now() / 1000)];
  if (updates.name !== undefined) {
    sets.push("name = ?");
    binds.push(updates.name);
  }
  if (updates.visibility !== undefined) {
    sets.push("visibility = ?");
    binds.push(updates.visibility);
  }
  binds.push(fileId);
  await db.prepare(`UPDATE project_files SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
}

/** Soft-deletes the file record. R2 objects are left in place (referenced by old versions for audit/history). */
export async function deleteFile(db: D1Database, fileId: string): Promise<void> {
  await db
    .prepare("UPDATE project_files SET deleted_at = ? WHERE id = ?")
    .bind(Math.floor(Date.now() / 1000), fileId)
    .run();
}
