import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { requireAllowedOrigin } from "./require-origin";
import type { Env } from "../types/env";

const env = { FRONTEND_URL: "https://app.example.dev" } as Env;

function makeApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", requireAllowedOrigin);
  app.all("/x", (c) => c.text("ok"));
  return app;
}

describe("requireAllowedOrigin", () => {
  it("allows a state-changing request from the configured frontend origin", async () => {
    const res = await makeApp().request("/x", { method: "POST", headers: { Origin: "https://app.example.dev" } }, env);
    expect(res.status).toBe(200);
  });

  it("rejects a state-changing request from any other browser origin", async () => {
    const res = await makeApp().request("/x", { method: "POST", headers: { Origin: "https://evil.example" } }, env);
    expect(res.status).toBe(403);
  });

  it("does not restrict safe methods", async () => {
    const res = await makeApp().request("/x", { method: "GET", headers: { Origin: "https://evil.example" } }, env);
    expect(res.status).toBe(200);
  });

  it("lets non-browser callers (no Origin header) through", async () => {
    const res = await makeApp().request("/x", { method: "POST" }, env);
    expect(res.status).toBe(200);
  });
});
