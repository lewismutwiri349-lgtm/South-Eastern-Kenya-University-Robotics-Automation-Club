import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { healthRoute } from "./routes/health";
import { identityRoutes } from "./routes/identity";
import { newsRoutes } from "./routes/news";
import { eventsRoutes } from "./routes/events";
import { projectsRoutes } from "./routes/projects";
import { awardsRoutes } from "./routes/awards";

const app = new Hono<{ Bindings: Env }>();

// CORS per docs/08_Security_Standards.md §5 — whitelist only, no wildcard.
// Origins list is a placeholder until real staging/production frontend
// domains exist; local dev origin included so frontend/ can call this
// during scaffolding testing.
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.route("/api/health", healthRoute);
app.route("/api/identity", identityRoutes);
// `/api/news` was defined (backend/src/routes/news/) but never mounted here
// — flagged and fixed 2026-08-14 while wiring up `/api/events` in the same
// file; see docs/modules/events.md §9 for details.
app.route("/api/news", newsRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/projects", projectsRoutes);
app.route("/api/awards", awardsRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error({ level: "error", message: err.message, stack: err.stack });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
