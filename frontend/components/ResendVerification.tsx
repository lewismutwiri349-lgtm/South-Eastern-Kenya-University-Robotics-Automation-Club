"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { Field, FormError, SubmitButton, fieldStyle } from "./form";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/**
 * Requests a fresh verification link via `POST /api/identity/resend-verification`.
 *
 * The API answers identically whether or not the address is registered (and
 * whether or not it is already verified), so the success state never
 * confirms that an account exists.
 */
export function ResendVerification({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { message: string } }>("/api/identity/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus({ kind: "sent" });
    } catch (err) {
      const rateLimited = err instanceof ApiError && err.status === 429;
      setStatus({
        kind: "error",
        message: rateLimited
          ? "Too many requests. Please wait a while and try again."
          : "Couldn't send a new link right now. Please try again in a moment.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <p role="status" style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
        If that address has an unverified account, a new verification link is on its way.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field id="resend-email" label="EMAIL">
        <input
          id="resend-email"
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
          {sending ? "Sending…" : "Send a new verification link"}
        </SubmitButton>
      </div>
    </div>
  );
}
