import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password service", () => {
  it("hashes a password to a value different from the original", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("same password");
    const hash2 = await hashPassword("same password");
    expect(hash1).not.toBe(hash2);
  });
});
