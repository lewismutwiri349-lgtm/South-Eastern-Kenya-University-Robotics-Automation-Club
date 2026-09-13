import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { healthRoute } from "./routes/health";
import { identityRoutes } from "./routes/identity";
import { newsRoutes } from "./routes/news";
import { eventsRoutes } from "./routes/events";

const app = new Hono<{ Bindings: Env }>();

// CORS per docs/08_Security_Standards.md §5 — whitelist only, no wildcard.
// Reads the allowed origin from the FRONTEND_URL var (set per-environment
// in wrangler.toml) rather than a hardcoded localhost origin, so this
// works correctly once real staging/production frontend URLs exist —
// previously hardcoded to "http://localhost:3000" only, which would have
// silently blocked every real cross-origin browser request once deployed.
app.use(
  "*",
  cors({
    origin: (origin, c) => (origin === c.env.FRONTEND_URL ? origin : null),
    credentials: true,
  })
);

app.route("/api/health", healthRoute);
app.route("/api/identity", identityRoutes);
app.route("/api/news", newsRoutes);
app.route("/api/events", eventsRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error({ level: "error", message: err.message, stack: err.stack });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
