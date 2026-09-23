import { describe, it, expect } from "vitest";
import {
  tagsSchema,
  githubUrlSchema,
  normalizeTag,
  searchProjectsQuerySchema,
} from "../../../src/schemas/project-management";

describe("normalizeTag / tagsSchema", () => {
  it("lowercases, trims and hyphenates", () => {
    expect(normalizeTag("  Line  Follower  ")).toBe("line-follower");
    expect(normalizeTag("PCB_Design")).toBe("pcb-design");
  });

  it("deduplicates equivalent tags", () => {
    const result = tagsSchema.parse(["Robotics", "robotics", "ROBOTICS"]);
    expect(result).toEqual(["robotics"]);
  });

  it("rejects a tag that normalizes to something outside the allowed pattern", () => {
    expect(() => tagsSchema.parse(["!!!"])).toThrow();
  });

  it("caps the number of tags", () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    expect(() => tagsSchema.parse(tooMany)).toThrow();
  });
});

describe("githubUrlSchema", () => {
  it("accepts a well-formed repo URL and strips trailing slash/.git", () => {
    expect(githubUrlSchema.parse("https://github.com/seku-rasc/line-follower/")).toBe(
      "https://github.com/seku-rasc/line-follower"
    );
    expect(githubUrlSchema.parse("https://github.com/seku-rasc/line-follower.git")).toBe(
      "https://github.com/seku-rasc/line-follower"
    );
  });

  it("rejects non-GitHub URLs and paths deeper than owner/repo", () => {
    expect(() => githubUrlSchema.parse("https://gitlab.com/x/y")).toThrow();
    expect(() => githubUrlSchema.parse("https://github.com/x/y/tree/main")).toThrow();
  });
});

describe("searchProjectsQuerySchema", () => {
  it("defaults limit and parses a comma-separated tag filter", () => {
    const result = searchProjectsQuerySchema.parse({ tag: "Line Follower, robotics" });
    expect(result.limit).toBe(20);
    expect(result.tag).toEqual(["line-follower", "robotics"]);
  });

  it("rejects a limit above the max", () => {
    expect(() => searchProjectsQuerySchema.parse({ limit: "51" })).toThrow();
  });
});
