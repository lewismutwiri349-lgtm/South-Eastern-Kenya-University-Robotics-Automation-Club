import type { CookieOptions } from "hono/utils/cookie";
import type { Env } from "../../types/env";

export const SESSION_COOKIE_NAME = "session_token";

/**
 * Attributes for the session cookie, shared by login (set) and logout
 * (delete) so the two always match — a browser only removes a cookie when
 * the deleting Set-Cookie carries the same scope attributes.
 *
 * The frontend and the API are separate Workers on different origins
 * (e.g. `*-frontend-production.<sub>.workers.dev` vs
 * `*-api-production.<sub>.workers.dev`). `workers.dev` is on the Public
 * Suffix List, so those are cross-SITE, not just cross-origin. A
 * `SameSite=Lax` cookie is rejected by the browser when it arrives on a
 * cross-site fetch() response, which made every login "succeed" and then
 * bounce straight back to /login because `/api/identity/me` never saw a
 * session. Deployed environments therefore need `SameSite=None; Secure`.
 *
 * Local development (`localhost:3000` -> `localhost:8787`) is same-site
 * over plain http, where `Secure` cookies would be dropped, so it keeps
 * `Lax`.
 *
 * CSRF is covered by the Origin allow-list in `middleware/require-origin.ts`
 * plus the JSON-only, CORS-preflighted API.
 */
export function sessionCookieOptions(env: Env): CookieOptions {
  const deployed = env.ENVIRONMENT !== "development";
  return {
    httpOnly: true,
    secure: deployed,
    sameSite: deployed ? "None" : "Lax",
    path: "/",
  };
}
