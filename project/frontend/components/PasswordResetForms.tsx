"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Field, FormError, SubmitButton, fieldStyle } from "./form";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const MIN_PASSWORD_LENGTH = 10;

/**
 * Requests a reset link.
 *
 * The API deliberately returns the same generic response whether or not the
 * email is registered, to avoid account enumeration. This component mirrors
 * that: the success state never confirms an account exists.
 */
export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { message: string } }>("/api/identity/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus({ kind: "done" });
    } catch (err) {
      const rateLimited = err instanceof Error && err.message.includes("429");
      setStatus({
        kind: "error",
        message: rateLimited
          ? "Too many requests. Please wait a while and try again."
          : "Couldn't send the reset link right now. Please try again in a moment.",
      });
    }
  }

  if (status.kind === "done") {
    return (
      <div
        role="status"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <h3 style={{ fontSize: 18 }}>Check your email</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
          If that address is registered, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field id="forgot-email" label="EMAIL">
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          maxLength={255}
          disabled={sending}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      {status.kind === "error" && <FormError>{status.message}</FormError>}

      <div>
        <SubmitButton onClick={handleSubmit} disabled={sending || !email}>
          {sending ? "Sending…" : "Send reset link"}
        </SubmitButton>
      </div>
    </div>
  );
}

/** Consumes a reset token from the emailed link and sets a new password. */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  if (!token) {
    return (
      <FormError>
        This reset link is missing its token. Request a new link from the forgot-password page.
      </FormError>
    );
  }

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { reset: boolean } }>("/api/identity/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setStatus({ kind: "done" });
    } catch (err) {
      // The API returns 400 for both INVALID_TOKEN and TOKEN_EXPIRED. Both
      // have the same remedy — request a fresh link — so they share copy
      // rather than guessing which one it was.
      const badToken = err instanceof Error && err.message.includes("400");
      setStatus({
        kind: "error",
        message: badToken
          ? "This reset link is invalid or has expired. Request a new one."
          : "Couldn't reset your password right now. Please try again in a moment.",
      });
    }
  }

  if (status.kind === "done") {
    return (
      <div
        role="status"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <h3 style={{ fontSize: 18 }}>Password updated</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
          You can now sign in with your new password.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field
        id="reset-password"
        label="NEW PASSWORD"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      >
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          maxLength={128}
          disabled={sending}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            ...fieldStyle,
            borderColor: tooShort ? "var(--danger)" : "var(--border-strong)",
          }}
        />
      </Field>

      {status.kind === "error" && <FormError>{status.message}</FormError>}

      <div>
        <SubmitButton
          onClick={handleSubmit}
          disabled={sending || password.length < MIN_PASSWORD_LENGTH}
        >
          {sending ? "Updating…" : "Set new password"}
        </SubmitButton>
      </div>
    </div>
  );
}
