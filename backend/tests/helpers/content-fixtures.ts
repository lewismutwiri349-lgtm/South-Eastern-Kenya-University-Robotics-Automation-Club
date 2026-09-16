import { env, createTestSession, createTestUser, sessionCookieHeader } from "./identity-fixtures";
import {
  galleryItems,
  resources,
  contactMessages,
  identityRateLimits,
} from "../../../database/schema";
import { createDb } from "../../src/db/client";

/**
 * Fixtures shared by the Gallery, Resources and Contact test suites.
 *
 * Kept separate from `identity-fixtures.ts` rather than appended to it: the
 * Identity fixtures are about accounts and sessions, these are about
 * content rows, and merging them would mean every content test file pulls
 * in the whole Identity surface. The account helpers are re-exported so a
 * test file needs only one import.
 */
export { env, createTestUser, createTestSession, sessionCookieHeader };

/**
 * The Workers test pool gives each test *file* a clean D1, not each `it()`
 * — same constraint documented in `identity-fixtures.ts`. Every test that
 * writes rows calls this first so ordering never matters.
 *
 * `identityRateLimits` is cleared too: the Contact submission endpoint
 * shares that table (see `middleware/rate-limit.ts`), so a leftover counter
 * from a previous test would produce a spurious 429.
 */
export async function resetContentTables(): Promise<void> {
  const db = createDb(env);
  await db.delete(galleryItems);
  await db.delete(resources);
  await db.delete(contactMessages);
  await db.delete(identityRateLimits);
}

/**
 * A role that is authenticated but NOT permitted to author content, used
 * for the 403 leg of every permission test. `member` is deliberate: it is
 * the role most likely to be wrongly granted authoring rights by a future
 * change, so it is the one worth pinning.
 */
export const UNPRIVILEGED_ROLE = "member" as const;

/** A role that IS permitted to author content. */
export const AUTHOR_ROLE = "secretary" as const;

/** Creates an author account and returns a ready-to-use Cookie header. */
export async function authorCookie(): Promise<string> {
  const user = await createTestUser({ role: AUTHOR_ROLE });
  return sessionCookieHeader(await createTestSession(user.id));
}

/** Creates a signed-in but unprivileged account and returns its Cookie header. */
export async function unprivilegedCookie(): Promise<string> {
  const user = await createTestUser({ role: UNPRIVILEGED_ROLE });
  return sessionCookieHeader(await createTestSession(user.id));
}

export const VALID_GALLERY_ITEM = {
  title: "Chassis assembly, round two",
  caption: "Second iteration of the drivetrain chassis after the tolerance fix.",
  imageUrl: "https://example.com/photos/chassis.jpg",
  category: "Build Log",
  capturedAt: "2026-03-14T10:00:00.000Z",
};

export const VALID_RESOURCE = {
  title: "STM32F4 reference manual",
  description: "Register-level reference for the controller board's MCU.",
  url: "https://example.com/docs/stm32f4.pdf",
  category: "Datasheet",
};

export const VALID_CONTACT_MESSAGE = {
  name: "Jane Mutua",
  email: "jane@example.com",
  subject: "Sponsorship enquiry",
  message: "We'd like to talk about sponsoring the club's competition season.",
};
