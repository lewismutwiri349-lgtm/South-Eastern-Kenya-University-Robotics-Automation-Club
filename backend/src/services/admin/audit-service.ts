import { adminAuditLogs, type AdminAuditAction } from "../../../../database/schema";
import { createDb } from "../../db/client";
import type { Env } from "../../types/env";

/**
 * Records an immutable Administration domain event (role grant, applicant
 * decision, and future project/content moderation actions). Kept separate
 * from Identity's `recordIdentityAuditEvent` — see
 * database/schema/administration.ts's doc comment for why this is its own
 * table rather than a shared one.
 */
export async function recordAdminAuditEvent(
  env: Env,
  event: {
    action: AdminAuditAction;
    actorUserId: string;
    targetUserId?: string;
    metadata?: Record<string, string>;
  }
): Promise<void> {
  const db = createDb(env);
  await db.insert(adminAuditLogs).values({
    id: crypto.randomUUID(),
    action: event.action,
    actorUserId: event.actorUserId,
    targetUserId: event.targetUserId,
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    createdAt: new Date(),
  });
}
