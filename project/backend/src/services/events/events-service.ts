import { eq, and, isNull, gt, or, asc } from "drizzle-orm";
import { events } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { slugify, disambiguateSlug } from "../../lib/slug";
import type { Env } from "../../types/env";
import type { CreateEventInput, UpdateEventInput } from "../../schemas/events";

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

export async function createEvent(
  env: Env,
  organizerId: string,
  input: CreateEventInput
): Promise<{ id: string; slug: string }> {
  const db = createDb(env);
  const now = new Date();
  const id = crypto.randomUUID();

  const baseSlug = slugify(input.title);
  const existing = await db.select().from(events).where(eq(events.slug, baseSlug));
  const slug = existing.length > 0 ? disambiguateSlug(baseSlug) : baseSlug;

  await db.insert(events).values({
    id,
    title: input.title,
    slug,
    description: input.description,
    location: input.location,
    startAt: input.startAt,
    endAt: input.endAt,
    organizerId,
    status: "draft",
    capacity: input.capacity ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, slug };
}

export async function updateEvent(env: Env, eventId: string, input: UpdateEventInput): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
  if (!existing) throw new EventNotFoundError();

  // Cross-field startAt/endAt ordering is validated in the zod schema only
  // for fields present in this request. A request that updates just one of
  // the two against the other's existing stored value isn't re-validated
  // here — same limitation noted in docs/modules/events.md §8.
  await db
    .update(events)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(events.id, eventId));
}

export async function publishEvent(env: Env, eventId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
  if (!existing) throw new EventNotFoundError();

  const now = new Date();
  await db
    .update(events)
    .set({ status: "published", publishedAt: existing.publishedAt ?? now, updatedAt: now })
    .where(eq(events.id, eventId));
}

export async function deleteEvent(env: Env, eventId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)));
  if (!existing) throw new EventNotFoundError();

  await db
    .update(events)
    .set({ deletedAt: new Date() })
    .where(eq(events.id, eventId));
}

const PUBLISHED = and(eq(events.status, "published"), isNull(events.deletedAt));

export async function getPublishedEventBySlug(env: Env, slug: string) {
  const db = createDb(env);
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), PUBLISHED));
  return event ?? null;
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (startAt, id) ascending (soonest-first), unlike News's newest-first order,
 * since the natural public query here is "what's coming up". Both fields
 * are used in the cursor to keep ordering stable if two events share a
 * startAt.
 */
export async function listUpcomingEvents(
  env: Env,
  { limit, cursor }: { limit: number; cursor?: string }
): Promise<{ events: (typeof events.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  const whereClause = cursorCondition
    ? and(
        PUBLISHED,
        or(
          gt(events.startAt, cursorCondition.startAt),
          and(eq(events.startAt, cursorCondition.startAt), gt(events.id, cursorCondition.id))
        )
      )
    : PUBLISHED;

  const rows = await db
    .select()
    .from(events)
    .where(whereClause)
    .orderBy(asc(events.startAt), asc(events.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.startAt, last.id) : null;

  return { events: result, nextCursor };
}

function encodeCursor(startAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ startAt: startAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { startAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { startAt: new Date(decoded.startAt), id: decoded.id };
}
