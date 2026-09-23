-- Phase 5 — Project Management
-- Extends the Phase 2 `projects` content table with categories, GitHub links,
-- tags, versioned file storage (bytes live in R2, metadata here) and a
-- uniqueness guarantee for the Phase 4 `member_projects` assignments.
-- Timestamps are unix SECONDS, matching migrations 0004-0009.
--
-- Not journal-tracked (drizzle-kit generate), matching 0007-0009: this file
-- mixes a Drizzle-tracked ALTER (projects.category/github_url, which IS in
-- database/schema/projects.ts) with new tables managed via raw D1 calls
-- only, same split as the rest of Phase 3+. See backend/tests/helpers/
-- project-fixtures.ts for how tests apply it on top of the journal-tracked
-- migrations.

ALTER TABLE projects ADD COLUMN category TEXT;
ALTER TABLE projects ADD COLUMN github_url TEXT;
CREATE INDEX projects_category_idx ON projects(category);

CREATE TABLE project_tags (
  project_id TEXT NOT NULL REFERENCES projects(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (project_id, tag)
);
CREATE INDEX project_tags_tag_idx ON project_tags(tag);

-- One row per logical file; one project_file_versions row per upload.
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,                    -- image | video | cad | document | archive
  visibility TEXT NOT NULL DEFAULT 'team',   -- team | public (public only served once the project is published)
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX project_files_project_idx ON project_files(project_id, deleted_at);

CREATE TABLE project_file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES project_files(id),
  version INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  etag TEXT,
  note TEXT,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
-- Also the concurrency guard: two simultaneous uploads can't both become vN.
CREATE UNIQUE INDEX project_file_versions_file_version_idx ON project_file_versions(file_id, version);

-- A member can only be on a project once.
CREATE UNIQUE INDEX member_projects_member_project_idx ON member_projects(member_id, project_id);
