import type { UserRole } from "../../../database/schema";

/** Cloudflare Worker bindings available to every route/service. */
export type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FRONTEND_URL: string;
  ENVIRONMENT: "development" | "staging" | "production";
};

/** Auth context attached to the request by requireAuth middleware. */
export type AuthVariables = {
  userId: string;
  role: UserRole;
};
