import { describe, expect, it } from "vitest";
import { frontendOrigin, frontendUrl } from "./frontend-url";

describe("frontendUrl", () => {
  it("builds the emailed verification link from FRONTEND_URL", () => {
    expect(frontendUrl({ FRONTEND_URL: "https://app.example.dev" }, "/verify-email?token=abc")).toBe(
      "https://app.example.dev/verify-email?token=abc"
    );
  });

  it("tolerates a trailing slash so links never contain '//'", () => {
    expect(frontendOrigin({ FRONTEND_URL: "https://app.example.dev/" })).toBe("https://app.example.dev");
  });

  it("fails loudly instead of emitting 'undefined/...' links when unset", () => {
    expect(() => frontendUrl({ FRONTEND_URL: undefined as unknown as string }, "/x")).toThrow(/FRONTEND_URL/);
    expect(() => frontendUrl({ FRONTEND_URL: "  " }, "/x")).toThrow(/FRONTEND_URL/);
  });
});
