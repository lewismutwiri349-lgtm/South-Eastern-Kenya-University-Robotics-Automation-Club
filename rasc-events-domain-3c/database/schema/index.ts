/**
 * Schema barrel file. Per docs/03_Technical_Architecture.md §6, one schema
 * file per domain (e.g. `identity.ts`, `membership.ts`, `projects.ts`),
 * re-exported here.
 */

export * from "./identity";
// `./news` was missing from this barrel (flagged and fixed 2026-08-14 while
// touching this file to add `./events` below — see docs/modules/events.md §9
// for details; backend/src/services/news/news-service.ts imports
// `newsArticles` through this barrel and would not typecheck without it).
export * from "./news";
export * from "./events";
