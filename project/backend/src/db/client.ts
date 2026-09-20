import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../../database/schema";
import type { Env } from "../types/env";

/** Single point of D1 access — every service goes through this. */
export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}
