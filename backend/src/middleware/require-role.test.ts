import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireRole } from "./require-role";
import type { Env, AuthVariables } from "../types/env";
import type { UserRole } from "../../../database/schema";

/** Builds a tiny app with a fake auth layer, so requireRole is tested in
 * isolation from real sessions/D1 — it only cares about `role` in context. */
function buildTestApp(role: UserRole) {
  const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
  app.use("*", async (c, next) => {
    c.set("userId", "test-user-id");
    c.set("role", role);
    await next();
  });
  app.get("/admin-only", requireRole("super_admin", "chairperson"), (c) =>
    c.json({ data: "ok" })
  );
  return app;
}

describe("requireRole middleware", () => {
  it("allows a request from an explicitly allowed role", async () => {
    const app = buildTestApp("super_admin");
    const res = await app.request("/admin-only");
    expect(res.status).toBe(200);
  });

  it("allows a request from a second allowed role", async () => {
    const app = buildTestApp("chairperson");
    const res = await app.request("/admin-only");
    expect(res.status).toBe(200);
  });

  it("rejects a request from a role not in the allowed list", async () => {
    const app = buildTestApp("member");
    const res = await app.request("/admin-only");
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects the default 'applicant' role from an admin-only route", async () => {
    const app = buildTestApp("applicant");
    const res = await app.request("/admin-only");
    expect(res.status).toBe(403);
  });
});
