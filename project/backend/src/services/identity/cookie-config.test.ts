import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./cookie-config";
import type { Env } from "../../types/env";

function envFor(environment: Env["ENVIRONMENT"]): Env {
  return { ENVIRONMENT: environment } as Env;
}

describe("sessionCookieOptions", () => {
  it("development: Lax and not Secure, so plain-http localhost works", () => {
    const options = sessionCookieOptions(envFor("development"));
    expect(options.sameSite).toBe("Lax");
    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
  });

  it.each(["staging", "production"] as const)(
    "%s: SameSite=None + Secure so the cookie survives the cross-site frontend -> API fetch",
    (environment) => {
      const options = sessionCookieOptions(envFor(environment));
      expect(options.sameSite).toBe("None");
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
    }
  );

  it("logout's delete header carries the same attributes as login's set header", async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.get("/set", (c) => {
      setCookie(c, SESSION_COOKIE_NAME, "x", sessionCookieOptions(c.env));
      return c.text("ok");
    });
    app.get("/delete", (c) => {
      deleteCookie(c, SESSION_COOKIE_NAME, sessionCookieOptions(c.env));
      return c.text("ok");
    });

    const env = envFor("production");
    const set = (await app.request("/set", {}, env)).headers.get("set-cookie") ?? "";
    const del = (await app.request("/delete", {}, env)).headers.get("set-cookie") ?? "";

    for (const header of [set, del]) {
      expect(header).toContain("SameSite=None");
      expect(header).toContain("Secure");
      expect(header).toContain("Path=/");
    }
  });
});
