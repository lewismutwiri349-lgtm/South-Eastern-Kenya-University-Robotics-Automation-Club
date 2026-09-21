import { Hono } from "hono";
import type { Env, AuthVariables } from "../../types/env";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import * as memberService from "../../services/members/member-service";
import * as skillsService from "../../services/members/skills-service";
import * as achievementsService from "../../services/members/achievements-service";

/**
 * Member Portal Routes — Phase 4
 * All routes require authentication with role="member".
 */

const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  division: z.string().max(100).optional(),
  profileImageUrl: z.string().url().optional(),
});

const addSkillSchema = z.object({
  skill: z.string().min(1).max(100),
  proficiency: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .optional()
    .default("intermediate"),
  yearsOfExperience: z.number().positive().optional(),
});

export const membersRouter = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET /api/members/me — Get current member profile
membersRouter.get("/me", requireAuth, requireRole("member"), async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;

  try {
    const profile = await memberService.getMemberProfile(db, userId);
    if (!profile) {
      return c.json({ error: { message: "Member profile not found" } }, 404);
    }
    return c.json({ data: profile }, 200);
  } catch (err) {
    console.error("Error fetching member profile:", err);
    return c.json({ error: { message: "Failed to fetch member profile" } }, 500);
  }
});

// PUT /api/members/me — Update member profile
membersRouter.put(
  "/me",
  requireAuth,
  requireRole("member"),
  zValidator("json", updateProfileSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.env.DB;
    const data = c.req.valid("json");

    try {
      const updated = await memberService.updateMemberProfile(db, userId, data);
      if (!updated) {
        return c.json({ error: { message: "Member profile not found" } }, 404);
      }
      return c.json({ data: updated, message: "Profile updated successfully" }, 200);
    } catch (err) {
      console.error("Error updating member profile:", err);
      return c.json({ error: { message: "Failed to update profile" } }, 500);
    }
  }
);

// GET /api/members/me/skills — Get member skills
membersRouter.get("/me/skills", requireAuth, requireRole("member"), async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;

  try {
    const profile = await memberService.getMemberProfile(db, userId);
    if (!profile) {
      return c.json({ error: { message: "Member profile not found" } }, 404);
    }
    const skills = await skillsService.getSkills(db, profile.id);
    return c.json({ data: skills }, 200);
  } catch (err) {
    console.error("Error fetching skills:", err);
    return c.json({ error: { message: "Failed to fetch skills" } }, 500);
  }
});

// POST /api/members/me/skills — Add skill
membersRouter.post(
  "/me/skills",
  requireAuth,
  requireRole("member"),
  zValidator("json", addSkillSchema),
  async (c) => {
    const userId = c.get("userId");
    const db = c.env.DB;
    const data = c.req.valid("json");

    try {
      const profile = await memberService.getMemberProfile(db, userId);
      if (!profile) {
        return c.json({ error: { message: "Member profile not found" } }, 404);
      }
      const skill = await skillsService.addSkill(db, profile.id, data);
      return c.json({ data: skill, message: "Skill added successfully" }, 201);
    } catch (err) {
      console.error("Error adding skill:", err);
      return c.json({ error: { message: "Failed to add skill" } }, 500);
    }
  }
);

// DELETE /api/members/me/skills/:skillId — Remove skill
membersRouter.delete("/me/skills/:skillId", requireAuth, requireRole("member"), async (c) => {
  const userId = c.get("userId");
  const skillId = c.req.param("skillId");
  const db = c.env.DB;

  try {
    const profile = await memberService.getMemberProfile(db, userId);
    if (!profile) {
      return c.json({ error: { message: "Member profile not found" } }, 404);
    }
    await skillsService.removeSkill(db, skillId, profile.id);
    return c.json({ message: "Skill removed successfully" }, 200);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    if (errorMsg.includes("unauthorized")) {
      return c.json({ error: { message: "Unauthorized" } }, 403);
    }
    console.error("Error removing skill:", err);
    return c.json({ error: { message: "Failed to remove skill" } }, 500);
  }
});

// GET /api/members/me/achievements — Get member achievements
membersRouter.get("/me/achievements", requireAuth, requireRole("member"), async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit") as string) : 10;

  try {
    const profile = await memberService.getMemberProfile(db, userId);
    if (!profile) {
      return c.json({ error: { message: "Member profile not found" } }, 404);
    }
    const achievements = await achievementsService.getAchievements(db, profile.id, limit);
    return c.json({ data: achievements, count: achievements.length }, 200);
  } catch (err) {
    console.error("Error fetching achievements:", err);
    return c.json({ error: { message: "Failed to fetch achievements" } }, 500);
  }
});

// GET /api/members/me/card — Get full membership card
membersRouter.get("/me/card", requireAuth, requireRole("member"), async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;

  try {
    const card = await memberService.getMemberCard(db, userId);
    if (!card) {
      return c.json({ error: { message: "Member profile not found" } }, 404);
    }
    return c.json({ data: card }, 200);
  } catch (err) {
    console.error("Error fetching member card:", err);
    return c.json({ error: { message: "Failed to fetch membership card" } }, 500);
  }
});
