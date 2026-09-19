import { Resend } from "resend";

/**
 * Fallback sender: Resend's shared sandbox address, which only delivers to
 * the Resend account owner's own verified email. Real users will not
 * receive anything until a sending domain is verified in Resend and
 * `EMAIL_FROM` is set (wrangler var) — see docs/modules/identity-auth.md.
 */
const DEFAULT_FROM_ADDRESS = "Robotics Club <onboarding@resend.dev>";

/** User-supplied text (first name) is interpolated into HTML emails. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(params: {
  apiKey: string;
  from?: string;
  to: string;
  firstName: string;
  verificationUrl: string;
}): Promise<void> {
  const resend = new Resend(params.apiKey);
  const url = escapeHtml(params.verificationUrl);

  const { error } = await resend.emails.send({
    from: params.from || DEFAULT_FROM_ADDRESS,
    to: params.to,
    subject: "Verify your email — Robotics Club",
    html: `
      <p>Hi ${escapeHtml(params.firstName)},</p>
      <p>Thanks for registering. Please verify your email address:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(params: {
  apiKey: string;
  from?: string;
  to: string;
  firstName: string;
  resetUrl: string;
}): Promise<void> {
  const resend = new Resend(params.apiKey);
  const url = escapeHtml(params.resetUrl);

  const { error } = await resend.emails.send({
    from: params.from || DEFAULT_FROM_ADDRESS,
    to: params.to,
    subject: "Reset your password — Robotics Club",
    html: `
      <p>Hi ${escapeHtml(params.firstName)},</p>
      <p>We received a request to reset your password. If this was you, click below:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
