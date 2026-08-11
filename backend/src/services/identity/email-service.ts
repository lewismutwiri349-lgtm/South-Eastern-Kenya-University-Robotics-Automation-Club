import { Resend } from "resend";

/**
 * NOTE: "from" address below uses Resend's shared sandbox domain
 * (onboarding@resend.dev), which only delivers to the account owner's own
 * verified email in Resend's test mode. A real sending domain must be
 * verified in Resend and this address updated before this reaches staging
 * — flagged here rather than silently shipped as if production-ready.
 */
const FROM_ADDRESS = "Robotics Club <onboarding@resend.dev>";

export async function sendVerificationEmail(params: {
  apiKey: string;
  to: string;
  firstName: string;
  verificationUrl: string;
}): Promise<void> {
  const resend = new Resend(params.apiKey);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Verify your email — Robotics Club",
    html: `
      <p>Hi ${params.firstName},</p>
      <p>Thanks for registering. Please verify your email address:</p>
      <p><a href="${params.verificationUrl}">${params.verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(params: {
  apiKey: string;
  to: string;
  firstName: string;
  resetUrl: string;
}): Promise<void> {
  const resend = new Resend(params.apiKey);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Reset your password — Robotics Club",
    html: `
      <p>Hi ${params.firstName},</p>
      <p>We received a request to reset your password. If this was you, click below:</p>
      <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
