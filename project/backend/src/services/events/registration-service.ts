import { eq, and, asc, gt, or, isNull } from "drizzle-orm";
import { events, eventRegistrations } from "../../../../database/schema";
import { createDb } from "../../db/client";
import type { Env } from "../../types/env";
import type { RegistrationStatus } from "../../../../database/schema/events";
import { EventNotFoundError } from "./events-service";

export class AlreadyRegisteredError extends Error {
  constructor() {
    super("Already registered for this event");
    this.name = "AlreadyRegisteredError";
  }
}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("No active registration found for this event");
    this.name = "RegistrationNotFoundError";
  }
}

/**
 * Registers the caller for an event, waitlisting if the event is at
 * capacity. Confirmed with Lewis 2026-08-14: any authenticated user may
 * register (no role restriction — unlike content management, this isn't
 * gated to organizer roles).
 *
 * KNOWN LIMITATION (documented, not silently accepted as correct — see
 * docs/modules/events.md §10): the capacity check is read-then-write, not
 * atomic. D1/SQLite serializes individual statements but not this
 * multi-step flow across a Worker's async round trips, so two concurrent
 * registrations for the last open seat could both read the same
 * under-capacity count and both be seated, overfilling by a small margin
 * in a genuine race. Acceptable for club-scale traffic (registrations
 * arrive one at a time in practice); flagged as a Future Improvement
 * rather than solved with a heavier locking scheme up front.
 */
export async function registerForEvent(
  env: Env,
  eventId: string,
  userId: string
): Promise<{ status: RegistrationStatus }> {
  const db = createDb(env);

  const event = await getRegistrableEvent(env, eventId);
  if (!event) throw new EventNotFoundError();

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));

  if (existing && existing.status !== "cancelled") {
    throw new AlreadyRegisteredError();
  }

  const status = await resolveRegistrationStatus(env, eventId, event.capacity);
  const now = new Date();

  if (existing) {
    // Re-registering after a prior cancellation — update the existing row
    // rather than inserting a new one, per database/schema/events.ts.
    await db
      .update(eventRegistrations)
      .set({ status, registeredAt: now, cancelledAt: null, updatedAt: now })
      .where(eq(eventRegistrations.id, existing.id));
  } else {
    await db.insert(eventRegistrations).values({
      id: crypto.randomUUID(),
      eventId,
      userId,
      status,
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { status };
}

/**
 * Cancels the caller's own registration and, if a seat just opened up,
 * promotes the longest-waiting waitlisted registrant (FIFO by
 * `registeredAt`). This is the one place promotion happens — there's no
 * separate sweep/cron, so a seat only actually frees up for someone else
 * at the moment a cancellation triggers it.
 */
export async function cancelRegistration(env: Env, eventId: string, userId: string): Promise<void> {
  const db = createDb(env);

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));

  if (!existing || existing.status === "cancelled") {
    throw new RegistrationNotFoundError();
  }

  const now = new Date();
  await db
    .update(eventRegistrations)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(eq(eventRegistrations.id, existing.id));

  if (existing.status === "registered") {
    await promoteNextWaitlisted(env, eventId);
  }
}

async function promoteNextWaitlisted(env: Env, eventId: string): Promise<void> {
  const db = createDb(env);
  const [nextInLine] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "waitlisted")))
    .orderBy(asc(eventRegistrations.registeredAt))
    .limit(1);

  if (!nextInLine) return;

  await db
    .update(eventRegistrations)
    .set({ status: "registered", updatedAt: new Date() })
    .where(eq(eventRegistrations.id, nextInLine.id));
}

export async function getMyRegistration(
  env: Env,
  eventId: string,
  userId: string
): Promise<{ status: RegistrationStatus } | null> {
  const db = createDb(env);
  const [row] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
  return row ? { status: row.status as RegistrationStatus } : null;
}

/**
 * Organizer-facing roster. Cursor-based pagination per
 * docs/05_API_Standards.md §4, ordered by (registeredAt, id) ascending —
 * registration order, matching the waitlist's own FIFO ordering. Returns
 * every status (registered/waitlisted/cancelled); no filter param in this
 * slice.
 */
export async function listRegistrations(
  env: Env,
  eventId: string,
  { limit, cursor }: { limit: number; cursor?: string }
) {
  const db = createDb(env);

  const event = await getEventById(env, eventId);
  if (!event) throw new EventNotFoundError();

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const baseCondition = eq(eventRegistrations.eventId, eventId);
  const whereClause = cursorCondition
    ? and(
        baseCondition,
        or(
          gt(eventRegistrations.registeredAt, cursorCondition.registeredAt),
          and(
            eq(eventRegistrations.registeredAt, cursorCondition.registeredAt),
            gt(eventRegistrations.id, cursorCondition.id)
          )
        )
      )
    : baseCondition;

  const rows = await db
    .select()
    .from(eventRegistrations)
    .where(whereClause)
    .orderBy(asc(eventRegistrations.registeredAt), asc(eventRegistrations.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.registeredAt, last.id) : null;

  return { registrations: result, nextCursor };
}

async function resolveRegistrationStatus(
  env: Env,
  eventId: string,
  capacity: number | null
): Promise<RegistrationStatus> {
  if (capacity === null) return "registered";

  const db = createDb(env);
  const registeredCount = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));

  return registeredCount.length < capacity ? "registered" : "waitlisted";
}

async function getRegistrableEvent(env: Env, eventId: string) {
  const db = createDb(env);
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.status, "published"), isNull(events.deletedAt)));
  return event ?? null;
}

// Organizer-facing lookup — unlike getRegistrableEvent, doesn't require
// "published" (an organizer can view the roster of their own draft event).
async function getEventById(env: Env, eventId: string) {
  const db = createDb(env);
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
  return event ?? null;
}

function encodeCursor(registeredAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ registeredAt: registeredAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { registeredAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { registeredAt: new Date(decoded.registeredAt), id: decoded.id };
}
