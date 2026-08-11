import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { healthRoute } from "./routes/health";
import { identityRoutes } from "./routes/identity";

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

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error({ level: "error", message: err.message, stack: err.stack });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
