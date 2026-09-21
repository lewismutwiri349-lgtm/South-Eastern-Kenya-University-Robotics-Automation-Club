-- Phase 4 — Member Portal
-- Extended member profiles with skills, certifications, achievements, and project tracking

CREATE TABLE member_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  bio TEXT,
  division TEXT,
  joined_at INTEGER NOT NULL,
  profile_image_url TEXT,
  years_in_club INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_member_profiles_user_id ON member_profiles(user_id);
CREATE INDEX idx_member_profiles_division ON member_profiles(division);

-- Member skills (SolidWorks, Python, PCB Design, etc.)
CREATE TABLE member_skills (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_profiles(id),
  skill TEXT NOT NULL,
  proficiency TEXT NOT NULL DEFAULT 'intermediate',
  years_of_experience REAL,
  verified INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_member_skills_member_id ON member_skills(member_id);

-- Member certifications (CSWA, CSWP, FEA cert, etc.)
CREATE TABLE member_certifications (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_profiles(id),
  title TEXT NOT NULL,
  issuer TEXT,
  issued_date INTEGER,
  expiry_date INTEGER,
  certificate_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_member_certifications_member_id ON member_certifications(member_id);

-- Member achievements (badges, recognition)
CREATE TABLE member_achievements (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_profiles(id),
  badge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  earned_at INTEGER NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_member_achievements_member_id ON member_achievements(member_id);
CREATE INDEX idx_member_achievements_badge_type ON member_achievements(badge_type);

-- Member project assignments (tracks which projects members are on)
CREATE TABLE member_projects (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES member_profiles(id),
  project_id TEXT NOT NULL,
  role TEXT,
  joined_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_member_projects_member_id ON member_projects(member_id);
CREATE INDEX idx_member_projects_project_id ON member_projects(project_id);
