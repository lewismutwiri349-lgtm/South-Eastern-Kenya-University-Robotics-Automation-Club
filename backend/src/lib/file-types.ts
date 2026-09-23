/**
 * Upload allow-list for project files (docs/17_Feature_Roadmap.md Phase 5:
 * images, video, CAD, PDF, ZIP).
 *
 * Deliberately extension-driven: the client-supplied MIME type is never
 * trusted or stored. The canonical MIME type comes from this table, and
 * formats with a reliable signature are also checked against their first
 * bytes so a renamed executable can't pass as a PNG. SVG and HTML are
 * excluded on purpose — both can carry script.
 */

export const FILE_CATEGORIES = ["image", "video", "cad", "document", "archive"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

/** Per-file cap. The Worker buffers multipart bodies, so this stays well under the 128 MB isolate limit. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** Per-project cap across all versions of all live files. */
export const PROJECT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

type Signature = { offset: number; bytes: number[] };

type FileTypeSpec = {
  category: FileCategory;
  mime: string;
  /** Any one of these signatures matching is enough. Omitted = no reliable signature. */
  signatures?: Signature[];
  /** Safe to render inline in a browser; everything else is forced to download. */
  inline?: boolean;
};

const PK: Signature[] = [
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
];
const FTYP: Signature[] = [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }]; // "ftyp"

const TYPES: Record<string, FileTypeSpec> = {
  // images
  png: { category: "image", mime: "image/png", inline: true, signatures: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }] },
  jpg: { category: "image", mime: "image/jpeg", inline: true, signatures: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  jpeg: { category: "image", mime: "image/jpeg", inline: true, signatures: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  gif: { category: "image", mime: "image/gif", inline: true, signatures: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }] },
  webp: { category: "image", mime: "image/webp", inline: true, signatures: [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }] },
  // video
  mp4: { category: "video", mime: "video/mp4", inline: true, signatures: FTYP },
  mov: { category: "video", mime: "video/quicktime", signatures: FTYP },
  webm: { category: "video", mime: "video/webm", inline: true, signatures: [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }] },
  // documents / archives
  pdf: { category: "document", mime: "application/pdf", signatures: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }] },
  zip: { category: "archive", mime: "application/zip", signatures: PK },
  // CAD & fabrication — mostly proprietary or text formats, so few signatures
  step: { category: "cad", mime: "model/step" },
  stp: { category: "cad", mime: "model/step" },
  iges: { category: "cad", mime: "model/iges" },
  igs: { category: "cad", mime: "model/iges" },
  stl: { category: "cad", mime: "model/stl" },
  obj: { category: "cad", mime: "model/obj" },
  dxf: { category: "cad", mime: "application/dxf" },
  dwg: { category: "cad", mime: "application/acad", signatures: [{ offset: 0, bytes: [0x41, 0x43] }] }, // "AC"
  "3mf": { category: "cad", mime: "model/3mf", signatures: PK },
  sldprt: { category: "cad", mime: "application/octet-stream" },
  sldasm: { category: "cad", mime: "application/octet-stream" },
  slddrw: { category: "cad", mime: "application/octet-stream" },
};

export const ALLOWED_EXTENSIONS = Object.keys(TYPES).sort();
/** Longest signature offset + length we ever need to read. */
export const SIGNATURE_READ_BYTES = 16;

export type ClassifiedUpload = { category: FileCategory; mime: string; inline: boolean; extension: string };
export type ClassifyResult =
  | { ok: true; value: ClassifiedUpload }
  | { ok: false; reason: "unsupported_type" | "content_mismatch" };

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function classifyUpload(filename: string, head: Uint8Array): ClassifyResult {
  const extension = getExtension(filename);
  const spec = Object.hasOwn(TYPES, extension) ? TYPES[extension] : undefined;
  if (!spec) return { ok: false, reason: "unsupported_type" };

  if (spec.signatures) {
    const matches = spec.signatures.some(({ offset, bytes }) =>
      bytes.every((b, i) => head[offset + i] === b)
    );
    if (!matches) return { ok: false, reason: "content_mismatch" };
  }
  return { ok: true, value: { category: spec.category, mime: spec.mime, inline: spec.inline === true, extension } };
}

/** Looks up serving info for a stored file (by its stored MIME type). */
export function isInlineMime(mime: string): boolean {
  return Object.values(TYPES).some((t) => t.inline === true && t.mime === mime);
}

/**
 * Display name for a stored file: no path components, no control
 * characters, bounded length. The original name is only ever *displayed*
 * and sent in Content-Disposition — it never forms part of an R2 key.
 */
export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  const name = cleaned.replace(/^\.+/, "");
  if (name.length <= 150) return name;
  const ext = getExtension(name);
  const stem = name.slice(0, name.length - (ext ? ext.length + 1 : 0));
  return `${stem.slice(0, 140)}${ext ? `.${ext}` : ""}`;
}

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 filename*. */
export function contentDisposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/[\\"]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
