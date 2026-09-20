import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { listEventsQuerySchema } from "../../schemas/events";
import { listUpcomingEvents } from "../../services/events/events-service";
import type { Env } from "../../types/env";

export const listEventsRoute = new Hono<{ Bindings: Env }>();

listEventsRoute.get("/", zValidator("query", listEventsQuerySchema), async (c) => {
  const { limit, cursor } = c.req.valid("query");
  const { events: results, nextCursor } = await listUpcomingEvents(c.env, { limit, cursor });

  return c.json({
    data: results.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      location: e.location,
      startAt: e.startAt,
      endAt: e.endAt,
    })),
    meta: { nextCursor },
  });
});
