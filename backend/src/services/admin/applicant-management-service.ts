import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { applications, users, type ApplicationStatus } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { createMemberProfile } from "../members/member-service";
import { recordAdminAuditEvent } from "./audit-service";
import type { Env } from "../../types/env";

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
    this.name = "ApplicationNotFoundError";
  }
}

/** Thrown when a decision is attempted from a status that doesn't allow it. */
export class InvalidApplicationStatusError extends Error {
  constructor(current: string, allowed: readonly string[]) {
    super(`Application status must be one of [${allowed.join(", ")}], got '${current}'`);
    this.name = "InvalidApplicationStatusError";
  }
}

type ApplicationRow = typeof applications.$inferSelect;

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4, same pattern as
 * `listUsers`. Unlike the applicant's own `GET /api/applications/:id`, this
 * is not scoped to `deleted_at IS NULL` filtering being the caller's
 * problem — soft-deleted applications are excluded here too, since a
 * deleted application isn't something admin should act on.
 */
export async function listApplications(
  env: Env,
  { limit, cursor, status }: { limit: number; cursor?: string; status?: ApplicationStatus }
): Promise<{ applications: ApplicationRow[]; nextCursor: string | null }> {
  const db = createDb(env);

  const conditions = [isNull(applications.deletedAt)];
  if (status) conditions.push(eq(applications.status, status));

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  if (cursorCondition) {
    const pageCondition = or(
      lt(applications.createdAt, cursorCondition.createdAt),
      and(eq(applications.createdAt, cursorCondition.createdAt), lt(applications.id, cursorCondition.id))
    );
    if (pageCondition) conditions.push(pageCondition);
  }

  const rows = await db
    .select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(desc(applications.createdAt), desc(applications.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return { applications: page, nextCursor };
}

export async function getApplicationById(env: Env, applicationId: string): Promise<ApplicationRow | null> {
  const db = createDb(env);
  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, applicationId), isNull(applications.deletedAt)));
  return row ?? null;
}

const ACCEPT_FROM_STATUSES: readonly ApplicationStatus[] = ["interviewed"];
// Rejection is allowed from either point in the pipeline where a "no"
// decision is realistic — failing the aptitude test, or after interview.
// Documented explicitly (rather than left implicit) per
// docs/18_AI_Operating_Manual.md §2: this is a business-rule assumption,
// not a requirement Lewis stated — see docs/modules/admin-dashboard.md.
const REJECT_FROM_STATUSES: readonly ApplicationStatus[] = ["interviewed", "test_failed"];

/**
 * Accepts an application: advances its status, promotes the underlying
 * account from `applicant` to `member`, and creates the member profile row
 * the Member Portal (`GET /api/members/me`) requires — without this, a
 * newly-accepted member would hit a 404 on first login, per
 * `backend/src/services/members/member-service.ts`'s `createMemberProfile`.
 *
 * Known limitation: these three writes are sequential, not a single D1
 * transaction (no other service in this codebase batches across tables
 * either — see docs/modules/admin-dashboard.md for the follow-up note).
 */
export async function acceptApplication(
  env: Env,
  { actorUserId, applicationId }: { actorUserId: string; applicationId: string }
): Promise<ApplicationRow> {
  const application = await requireApplicationStatus(env, applicationId, ACCEPT_FROM_STATUSES);
  const db = createDb(env);
  const now = new Date();

  const [updatedApplication] = await db
    .update(applications)
    .set({ status: "accepted", updatedAt: now })
    .where(eq(applications.id, applicationId))
    .returning();

  await db.update(users).set({ role: "member", updatedAt: now }).where(eq(users.id, application.userId));

  await createMemberProfile(env.DB, application.userId, {
    division: application.divisionPreferencePrimary ?? undefined,
  });

  await recordAdminAuditEvent(env, {
    action: "application_accepted",
    actorUserId,
    targetUserId: application.userId,
    metadata: { applicationId },
  });

  return updatedApplication;
}

export async function rejectApplication(
  env: Env,
  { actorUserId, applicationId, reason }: { actorUserId: string; applicationId: string; reason?: string }
): Promise<ApplicationRow> {
  const application = await requireApplicationStatus(env, applicationId, REJECT_FROM_STATUSES);
  const db = createDb(env);

  const [updatedApplication] = await db
    .update(applications)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(applications.id, applicationId))
    .returning();

  await recordAdminAuditEvent(env, {
    action: "application_rejected",
    actorUserId,
    targetUserId: application.userId,
    metadata: reason ? { applicationId, reason } : { applicationId },
  });

  return updatedApplication;
}

async function requireApplicationStatus(
  env: Env,
  applicationId: string,
  allowed: readonly ApplicationStatus[]
): Promise<ApplicationRow> {
  const application = await getApplicationById(env, applicationId);
  if (!application) throw new ApplicationNotFoundError();
  if (!allowed.includes(application.status as ApplicationStatus)) {
    throw new InvalidApplicationStatusError(application.status, allowed);
  }
  return application;
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { createdAt: new Date(decoded.createdAt), id: decoded.id };
}
