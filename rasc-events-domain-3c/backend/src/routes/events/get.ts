import { Hono } from "hono";
import { getPublishedEventBySlug } from "../../services/events/events-service";
import type { Env } from "../../types/env";

export const getEventRoute = new Hono<{ Bindings: Env }>();

getEventRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const event = await getPublishedEventBySlug(c.env, slug);

  if (!event) {
    return c.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, 404);
  }

  return c.json({
    data: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      publishedAt: event.publishedAt,
    },
  });
});
