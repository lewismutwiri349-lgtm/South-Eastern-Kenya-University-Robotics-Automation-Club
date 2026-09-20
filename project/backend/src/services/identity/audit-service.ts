import { identityAuditLogs } from "../../../../database/schema";
import { createDb } from "../../db/client";
import type { Env } from "../../types/env";

export type IdentityAuditAction =
  | "account_registered"
  | "email_verified"
  | "login_succeeded"
  | "login_failed"
  | "account_locked"
  | "logout"
  | "password_reset";

/** Records an immutable Identity security event without storing credentials or tokens. */
export async function recordIdentityAuditEvent(
  env: Env,
  event: {
    action: IdentityAuditAction;
    actorUserId?: string;
    targetUserId?: string;
    metadata?: Record<string, string>;
  }
): Promise<void> {
  const db = createDb(env);
  await db.insert(identityAuditLogs).values({
    id: crypto.randomUUID(),
    action: event.action,
    actorUserId: event.actorUserId,
    targetUserId: event.targetUserId,
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    createdAt: new Date(),
  });
}
