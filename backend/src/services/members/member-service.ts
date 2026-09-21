import { D1Database } from "@cloudflare/workers-types";
import { generateId } from "../../lib/id-generator";

/**
 * Member profile service — Phase 4
 * Handles member profile CRUD and profile retrieval for authenticated users.
 */

export interface MemberProfile {
  id: string;
  userId: string;
  bio: string | null;
  division: string | null;
  joinedAt: number;
  profileImageUrl: string | null;
  yearsInClub: number;
  createdAt: number;
  updatedAt: number;
}

export interface Skill {
  id: string;
  memberId: string;
  skill: string;
  proficiency: string;
  yearsOfExperience: number | null;
  verified: number;
  createdAt: number;
}

export interface Certification {
  id: string;
  memberId: string;
  title: string;
  issuer: string | null;
  issuedDate: number | null;
  expiryDate: number | null;
  certificateUrl: string | null;
  createdAt: number;
}

export interface Achievement {
  id: string;
  memberId: string;
  badgeType: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  earnedAt: number;
  reason: string | null;
  createdAt: number;
}

export async function getMemberProfile(
  db: D1Database,
  userId: string
): Promise<MemberProfile | null> {
  const stmt = db.prepare(
    "SELECT * FROM member_profiles WHERE user_id = ? LIMIT 1"
  );
  const result = await stmt.bind(userId).first();
  return result as MemberProfile | null;
}

export async function createMemberProfile(
  db: D1Database,
  userId: string,
  data: {
    bio?: string;
    division?: string;
    profileImageUrl?: string;
  }
): Promise<MemberProfile> {
  const now = Math.floor(Date.now() / 1000);
  const id = generateId();

  const stmt = db.prepare(
    `INSERT INTO member_profiles (id, user_id, bio, division, joined_at, profile_image_url, years_in_club, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );

  await stmt
    .bind(
      id,
      userId,
      data.bio || null,
      data.division || null,
      now,
      data.profileImageUrl || null,
      now,
      now
    )
    .run();

  return {
    id,
    userId,
    bio: data.bio || null,
    division: data.division || null,
    joinedAt: now,
    profileImageUrl: data.profileImageUrl || null,
    yearsInClub: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateMemberProfile(
  db: D1Database,
  userId: string,
  data: {
    bio?: string;
    division?: string;
    profileImageUrl?: string;
    yearsInClub?: number;
  }
): Promise<MemberProfile | null> {
  const now = Math.floor(Date.now() / 1000);
  const updates: string[] = ["updated_at = ?"];
  const values: any[] = [now];

  if (data.bio !== undefined) {
    updates.push("bio = ?");
    values.push(data.bio);
  }
  if (data.division !== undefined) {
    updates.push("division = ?");
    values.push(data.division);
  }
  if (data.profileImageUrl !== undefined) {
    updates.push("profile_image_url = ?");
    values.push(data.profileImageUrl);
  }
  if (data.yearsInClub !== undefined) {
    updates.push("years_in_club = ?");
    values.push(data.yearsInClub);
  }

  values.push(userId);

  const stmt = db.prepare(
    `UPDATE member_profiles SET ${updates.join(", ")} WHERE user_id = ? RETURNING *`
  );

  const result = await stmt.bind(...values).first();
  return result as MemberProfile | null;
}

export async function getOrCreateMemberProfile(
  db: D1Database,
  userId: string
): Promise<MemberProfile> {
  let profile = await getMemberProfile(db, userId);
  if (!profile) {
    profile = await createMemberProfile(db, userId, {});
  }
  return profile;
}

/**
 * Get full member card data (all skills, certifications, achievements)
 */
export async function getMemberCard(
  db: D1Database,
  userId: string
): Promise<{
  profile: MemberProfile;
  skills: Skill[];
  certifications: Certification[];
  achievements: Achievement[];
} | null> {
  const profile = await getMemberProfile(db, userId);
  if (!profile) return null;

  const skillsStmt = db.prepare(
    "SELECT * FROM member_skills WHERE member_id = ?"
  );
  const skills = (await skillsStmt.bind(profile.id).all()) as any;

  const certsStmt = db.prepare(
    "SELECT * FROM member_certifications WHERE member_id = ?"
  );
  const certifications = (await certsStmt.bind(profile.id).all()) as any;

  const achStmt = db.prepare(
    "SELECT * FROM member_achievements WHERE member_id = ? ORDER BY earned_at DESC LIMIT 10"
  );
  const achievements = (await achStmt.bind(profile.id).all()) as any;

  return {
    profile,
    skills,
    certifications,
    achievements,
  };
}

/**
 * Get member by ID (for public profiles if needed later)
 */
export async function getMemberById(
  db: D1Database,
  memberId: string
): Promise<MemberProfile | null> {
  const stmt = db.prepare(
    "SELECT * FROM member_profiles WHERE id = ? LIMIT 1"
  );
  const result = await stmt.bind(memberId).first();
  return result as MemberProfile | null;
}
