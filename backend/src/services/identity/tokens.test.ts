import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("token service", () => {
  it("generates a token of sufficient length and hex format", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
  });

  it("generates a different token on each call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("hashes the same token to the same value (deterministic)", async () => {
    const token = generateToken();
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it("produces a hash different from the raw token", async () => {
    const token = generateToken();
    const hash = await hashToken(token);
    expect(hash).not.toBe(token);
  });
});
