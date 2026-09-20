import { describe, it, expect } from "vitest";
import { slugify, disambiguateSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates a normal title", () => {
    expect(slugify("Club Wins Regional Competition")).toBe("club-wins-regional-competition");
  });

  it("strips punctuation", () => {
    expect(slugify("What's Next for Division 5?")).toBe("whats-next-for-division-5");
  });

  it("collapses repeated whitespace and hyphens", () => {
    expect(slugify("Too    Many   Spaces")).toBe("too-many-spaces");
  });

  it("trims leading/trailing whitespace before slugging", () => {
    expect(slugify("  Padded Title  ")).toBe("padded-title");
  });
});

describe("disambiguateSlug", () => {
  it("appends a suffix different from the base slug", () => {
    const result = disambiguateSlug("club-news");
    expect(result).not.toBe("club-news");
    expect(result.startsWith("club-news-")).toBe(true);
  });

  it("produces different suffixes on each call", () => {
    const a = disambiguateSlug("club-news");
    const b = disambiguateSlug("club-news");
    expect(a).not.toBe(b);
  });
});
