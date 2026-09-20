import type { UserRole } from "../../../database/schema";

/** Cloudflare Worker bindings available to every route/service. */
export type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FRONTEND_URL: string;
  /**
   * Optional sender, e.g. `Robotics Club <no-reply@your-verified-domain>`.
   * Unset falls back to Resend's sandbox sender, which only delivers to the
   * Resend account owner. Set it as a var once a domain is verified in Resend.
   */
  EMAIL_FROM?: string;
  ENVIRONMENT: "development" | "staging" | "production";
};

/** Auth context attached to the request by requireAuth middleware. */
export type AuthVariables = {
  userId: string;
  role: UserRole;
};
