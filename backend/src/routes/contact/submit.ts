import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createContactMessageSchema } from "../../schemas/contact";
import { createContactMessage } from "../../services/contact/contact-service";
import { createRateLimit } from "../../middleware/rate-limit";
import type { Env } from "../../types/env";

export const submitContactMessageRoute = new Hono<{ Bindings: Env }>();

/**
 * Deliberately stricter than Identity's 5-per-15-minutes: a person
 * legitimately contacting the club sends one message and waits, whereas a
 * failed login is plausibly retried several times in a row. 5 per hour
 * still leaves room for an honest correction-and-resend without making the
 * endpoint a usable spam channel. Keyed per route path, so this window is
 * independent of the Identity endpoints' window.
 */
const contactRateLimit = createRateLimit({
  maxRequests: 5,
  windowMs: 1000 * 60 * 60,
});

submitContactMessageRoute.post(
  "/",
  contactRateLimit,
  zValidator("json", createContactMessageSchema),
  async (c) => {
    const input = c.req.valid("json");
    const submitterIp = c.req.header("CF-Connecting-IP") ?? null;
    const result = await createContactMessage(c.env, input, submitterIp);

    // Returns only the id — never echoes the submitted content back. The
    // caller already has it, and echoing user-supplied text is how a stored
    // value becomes a reflected one.
    return c.json({ data: { id: result.id } }, 201);
  }
);
