import { describe, expect, it } from "vitest";
import { evaluateRateLimit } from "./rate-limit-policy";

describe("Identity rate-limit policy", () => {
  it("allows requests through the configured limit", () => {
    const result = evaluateRateLimit(2, new Date(), 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.requestCount).toBe(3);
  });

  it("rejects requests exceeding the configured limit", () => {
    const result = evaluateRateLimit(3, new Date(), 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.requestCount).toBe(4);
  });

  it("starts a new window after the prior window expires", () => {
    const now = new Date("2026-08-11T10:01:00.000Z");
    const result = evaluateRateLimit(3, new Date("2026-08-11T10:00:00.000Z"), 3, 60_000, now);
    expect(result).toMatchObject({ allowed: true, requestCount: 1, resetAt: new Date("2026-08-11T10:02:00.000Z") });
  });
});
