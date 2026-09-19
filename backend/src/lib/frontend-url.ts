import type { Env } from "../types/env";

/**
 * The frontend origin, normalised (no trailing slash). Single source for
 * both the CORS allow-list and every link the API puts in an email, so a
 * stray "/" in `FRONTEND_URL` can't break one and not the other.
 *
 * Throws when the var is unset instead of producing links like
 * "undefined/verify-email?token=..." — wrangler does not inherit `[vars]`
 * into `[env.*]` blocks, so a missing value is a real deployment mistake
 * that should be loud.
 */
export function frontendOrigin(env: Pick<Env, "FRONTEND_URL">): string {
  const value = env.FRONTEND_URL?.trim();
  if (!value) {
    throw new Error("FRONTEND_URL is not configured for this environment");
  }
  return value.replace(/\/+$/, "");
}

/** Absolute frontend URL for `path` (must start with "/"), e.g. an emailed link. */
export function frontendUrl(env: Pick<Env, "FRONTEND_URL">, path: string): string {
  return `${frontendOrigin(env)}${path}`;
}
