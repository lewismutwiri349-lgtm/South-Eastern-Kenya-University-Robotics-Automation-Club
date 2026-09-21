import { D1Database } from "@cloudflare/workers-types";
import { generateId } from "../../lib/id-generator";

/**
 * Member skills service — Phase 4
 * Add, list, and remove member skills.
 */

export interface Skill {
  id: string;
  memberId: string;
  skill: string;
  proficiency: string;
  yearsOfExperience: number | null;
  verified: number;
  createdAt: number;
}

export async function addSkill(
  db: D1Database,
  memberId: string,
  data: {
    skill: string;
    proficiency?: string;
    yearsOfExperience?: number;
  }
): Promise<Skill> {
  const now = Math.floor(Date.now() / 1000);
  const id = generateId();
  const proficiency = data.proficiency || "intermediate";

  const stmt = db.prepare(
    `INSERT INTO member_skills (id, member_id, skill, proficiency, years_of_experience, verified, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  );

  await stmt
    .bind(
      id,
      memberId,
      data.skill,
      proficiency,
      data.yearsOfExperience || null,
      now
    )
    .run();

  return {
    id,
    memberId,
    skill: data.skill,
    proficiency,
    yearsOfExperience: data.yearsOfExperience || null,
    verified: 0,
    createdAt: now,
  };
}

export async function getSkills(db: D1Database, memberId: string): Promise<Skill[]> {
  const stmt = db.prepare(
    "SELECT * FROM member_skills WHERE member_id = ? ORDER BY created_at DESC"
  );
  return (await stmt.bind(memberId).all()) as any;
}

export async function removeSkill(
  db: D1Database,
  skillId: string,
  memberId: string
): Promise<void> {
  // Verify ownership
  const checkStmt = db.prepare(
    "SELECT * FROM member_skills WHERE id = ? LIMIT 1"
  );
  const skill = await checkStmt.bind(skillId).first();

  if (!skill || (skill as any).member_id !== memberId) {
    throw new Error("Skill not found or unauthorized");
  }

  const deleteStmt = db.prepare("DELETE FROM member_skills WHERE id = ?");
  await deleteStmt.bind(skillId).run();
}

export async function updateSkill(
  db: D1Database,
  skillId: string,
  memberId: string,
  data: {
    proficiency?: string;
    yearsOfExperience?: number;
  }
): Promise<Skill | null> {
  // Verify ownership
  const checkStmt = db.prepare(
    "SELECT * FROM member_skills WHERE id = ? LIMIT 1"
  );
  const skill = await checkStmt.bind(skillId).first();

  if (!skill || (skill as any).member_id !== memberId) {
    throw new Error("Skill not found or unauthorized");
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (data.proficiency !== undefined) {
    updates.push("proficiency = ?");
    values.push(data.proficiency);
  }
  if (data.yearsOfExperience !== undefined) {
    updates.push("years_of_experience = ?");
    values.push(data.yearsOfExperience);
  }

  if (updates.length === 0) return skill as any;

  values.push(skillId);

  const updateStmt = db.prepare(
    `UPDATE member_skills SET ${updates.join(", ")} WHERE id = ? RETURNING *`
  );

  const result = await updateStmt.bind(...values).first();
  return result as any;
}
