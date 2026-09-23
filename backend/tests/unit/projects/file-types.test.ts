import { describe, it, expect } from "vitest";
import { classifyUpload, sanitizeFilename, contentDisposition, getExtension } from "../../../src/lib/file-types";

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEAD = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const ZIP_HEAD = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("classifyUpload", () => {
  it("accepts a PNG whose bytes match its extension", () => {
    const result = classifyUpload("cover.png", PNG_HEAD);
    expect(result).toEqual({ ok: true, value: { category: "image", mime: "image/png", inline: true, extension: "png" } });
  });

  it("rejects an unsupported extension", () => {
    expect(classifyUpload("virus.exe", new Uint8Array(16))).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it("rejects content that doesn't match its claimed extension", () => {
    // A JPEG renamed to .png — the extension is allowed, but the signature check catches the mismatch.
    expect(classifyUpload("fake.png", JPEG_HEAD)).toEqual({ ok: false, reason: "content_mismatch" });
  });

  it("accepts a ZIP for the archive category", () => {
    const result = classifyUpload("assembly.zip", ZIP_HEAD);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.category).toBe("archive");
  });

  it("accepts CAD formats with no reliable signature, by extension alone", () => {
    const result = classifyUpload("bracket.step", new Uint8Array(16));
    expect(result).toEqual({ ok: true, value: { category: "cad", mime: "model/step", inline: false, extension: "step" } });
  });

  it("is case-insensitive on extension", () => {
    expect(classifyUpload("PHOTO.PNG", PNG_HEAD).ok).toBe(true);
  });
});

describe("sanitizeFilename", () => {
  it("strips path components", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\me\\report.pdf")).toBe("report.pdf");
  });

  it("removes control characters and quotes", () => {
    expect(sanitizeFilename('bad"name\u0000.pdf')).toBe("badname.pdf");
  });

  it("truncates very long names while keeping the extension", () => {
    const long = `${"a".repeat(300)}.pdf`;
    const result = sanitizeFilename(long);
    expect(result.length).toBeLessThanOrEqual(150);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("contentDisposition", () => {
  it("includes both the ASCII fallback and a UTF-8 filename*", () => {
    const header = contentDisposition("attachment", "gëar bräcket.step");
    expect(header).toContain('attachment; filename="g_ar br_cket.step"');
    expect(header).toContain("filename*=UTF-8''");
  });
});

describe("getExtension", () => {
  it("lowercases and handles no-extension names", () => {
    expect(getExtension("Model.STL")).toBe("stl");
    expect(getExtension("README")).toBe("");
  });
});
