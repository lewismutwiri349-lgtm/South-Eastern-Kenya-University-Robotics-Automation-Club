import { D1Database } from "@cloudflare/workers-types";
import { generateId } from "../../lib/id-generator";

/**
 * Member achievements service — Phase 4
 * Track badges and recognitions earned by members.
 * (Admin/system only — members cannot self-assign achievements)
 */

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

export async function awardAchievement(
  db: D1Database,
  memberId: string,
  data: {
    badgeType: string;
    title: string;
    description?: string;
    iconUrl?: string;
    reason?: string;
  }
): Promise<Achievement> {
  const now = Math.floor(Date.now() / 1000);
  const id = generateId();

  const stmt = db.prepare(
    `INSERT INTO member_achievements (id, member_id, badge_type, title, description, icon_url, earned_at, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await stmt
    .bind(
      id,
      memberId,
      data.badgeType,
      data.title,
      data.description || null,
      data.iconUrl || null,
      now,
      data.reason || null,
      now
    )
    .run();

  return {
    id,
    memberId,
    badgeType: data.badgeType,
    title: data.title,
    description: data.description || null,
    iconUrl: data.iconUrl || null,
    earnedAt: now,
    reason: data.reason || null,
    createdAt: now,
  };
}

export async function getAchievements(
  db: D1Database,
  memberId: string,
  limit = 10
): Promise<Achievement[]> {
  const stmt = db.prepare(
    `SELECT * FROM member_achievements WHERE member_id = ? ORDER BY earned_at DESC LIMIT ?`
  );
  return (await stmt.bind(memberId, limit).all()) as any;
}

export async function getAchievementByType(
  db: D1Database,
  memberId: string,
  badgeType: string
): Promise<Achievement | null> {
  const stmt = db.prepare(
    `SELECT * FROM member_achievements WHERE member_id = ? AND badge_type = ? LIMIT 1`
  );
  const result = await stmt.bind(memberId, badgeType).first();
  return result as Achievement | null;
}

export async function removeAchievement(
  db: D1Database,
  achievementId: string,
  memberId: string
): Promise<void> {
  // Verify ownership
  const checkStmt = db.prepare(
    "SELECT * FROM member_achievements WHERE id = ? LIMIT 1"
  );
  const achievement = await checkStmt.bind(achievementId).first();

  if (!achievement || (achievement as any).member_id !== memberId) {
    throw new Error("Achievement not found or unauthorized");
  }

  const deleteStmt = db.prepare("DELETE FROM member_achievements WHERE id = ?");
  await deleteStmt.bind(achievementId).run();
}

/**
 * Predefined badge types (can be extended)
 */
export const BADGE_TYPES = {
  PROJECT_LEAD: "project_lead",
  MENTOR: "mentor",
  INNOVATOR: "innovator",
  TEAM_PLAYER: "team_player",
  ENGINEER_OF_MONTH: "engineer_of_month",
  CERTIFIED_EXPERT: "certified_expert",
  FIRST_PROJECT: "first_project",
  POWER_USER: "power_user",
} as const;
