import { Hono } from "hono";
import type { Env } from "../types/env";

/**
 * Health check route. No domain ownership (infrastructure-level), so it
 * lives outside the domain folder structure described in
 * docs/03_Technical_Architecture.md §6.
 *
 * Confirms the Worker is running and, once D1 is wired to a real database,
 * that the database connection is reachable.
 */
export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "robotics-club-api",
    timestamp: new Date().toISOString(),
  });
});
