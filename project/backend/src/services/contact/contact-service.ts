import { eq, and, isNull, lt, or, desc } from "drizzle-orm";
import { contactMessages } from "../../../../database/schema";
import { createDb } from "../../db/client";
import { hashToken } from "../identity/tokens";
import type { Env } from "../../types/env";
import type { CreateContactMessageInput } from "../../schemas/contact";

export class ContactMessageNotFoundError extends Error {
  constructor() {
    super("Contact message not found");
    this.name = "ContactMessageNotFoundError";
  }
}

/**
 * `submitterIp` is hashed before storage per docs/08_Security_Standards.md —
 * enough to correlate repeat abuse from one source without retaining a raw
 * identifier for an otherwise anonymous member of the public. Reuses
 * Identity's `hashToken` (plain SHA-256) rather than a second hashing
 * helper, so there is exactly one hashing implementation in the codebase.
 */
export async function createContactMessage(
  env: Env,
  input: CreateContactMessageInput,
  submitterIp: string | null
): Promise<{ id: string }> {
  const db = createDb(env);
  const id = crypto.randomUUID();

  await db.insert(contactMessages).values({
    id,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    submitterIpHash: submitterIp ? await hashToken(submitterIp) : null,
    createdAt: new Date(),
  });

  return { id };
}

export async function markContactMessageHandled(env: Env, messageId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(contactMessages)
    .where(and(eq(contactMessages.id, messageId), isNull(contactMessages.deletedAt)));
  if (!existing) throw new ContactMessageNotFoundError();

  // Idempotent: re-marking an already-handled message keeps the original
  // timestamp rather than resetting it, so "when was this dealt with?"
  // stays answerable.
  if (existing.handledAt) return;

  await db
    .update(contactMessages)
    .set({ handledAt: new Date() })
    .where(eq(contactMessages.id, messageId));
}

export async function deleteContactMessage(env: Env, messageId: string): Promise<void> {
  const db = createDb(env);
  const [existing] = await db
    .select()
    .from(contactMessages)
    .where(and(eq(contactMessages.id, messageId), isNull(contactMessages.deletedAt)));
  if (!existing) throw new ContactMessageNotFoundError();

  await db
    .update(contactMessages)
    .set({ deletedAt: new Date() })
    .where(eq(contactMessages.id, messageId));
}

/**
 * Cursor-based pagination per docs/05_API_Standards.md §4 — ordered by
 * (createdAt, id) descending, newest first. Staff-only: there is no public
 * read path for this table at all.
 */
export async function listContactMessages(
  env: Env,
  { limit, cursor, handled }: { limit: number; cursor?: string; handled: "unhandled" | "all" }
): Promise<{ messages: (typeof contactMessages.$inferSelect)[]; nextCursor: string | null }> {
  const db = createDb(env);

  const filters = [isNull(contactMessages.deletedAt)];

  if (handled === "unhandled") {
    filters.push(isNull(contactMessages.handledAt));
  }

  const cursorCondition = cursor ? decodeCursor(cursor) : null;
  if (cursorCondition) {
    const pageCondition = or(
      lt(contactMessages.createdAt, cursorCondition.createdAt),
      and(
        eq(contactMessages.createdAt, cursorCondition.createdAt),
        lt(contactMessages.id, cursorCondition.id)
      )
    );
    if (pageCondition) filters.push(pageCondition);
  }

  const rows = await db
    .select()
    .from(contactMessages)
    .where(and(...filters))
    .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
    .limit(limit + 1); // fetch one extra to know if there's a next page

  const hasMore = rows.length > limit;
  const messages = hasMore ? rows.slice(0, limit) : rows;
  const last = messages[messages.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return { messages, nextCursor };
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.getTime(), id })).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
  return { createdAt: new Date(decoded.createdAt), id: decoded.id };
}
