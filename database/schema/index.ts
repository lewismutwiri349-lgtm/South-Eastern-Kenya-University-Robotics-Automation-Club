/**
 * Schema barrel file. Per docs/03_Technical_Architecture.md §6, one schema
 * file per domain (e.g. `identity.ts`, `membership.ts`, `projects.ts`),
 * re-exported here.
 */

export * from "./identity";
export * from "./news";
export * from "./events";
export * from "./projects";
export * from "./awards";
export * from "./gallery";
export * from "./resources";
export * from "./contact";
