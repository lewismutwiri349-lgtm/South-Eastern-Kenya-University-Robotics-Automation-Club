import { z } from "zod";

// Password policy per docs/08_Security_Standards.md §6 — minimum length
// enforced here, server-side, not just in the frontend.
export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(255),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// Same password policy as registration — matches docs/08_Security_Standards.md §6.
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
