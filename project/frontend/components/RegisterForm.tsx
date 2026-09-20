"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Field, FormError, SubmitButton, fieldStyle } from "./form";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "registered" }
  | { kind: "error"; message: string };

// Mirrors `registerSchema` in backend/src/schemas/identity.ts, which is the
// authority. Repeated here only so the person typing finds out before they
// submit, per docs/08_Security_Standards.md §6.
const MIN_PASSWORD_LENGTH = 10;

function messageFor(err: unknown): string {
  const text = err instanceof Error ? err.message : "";
  if (text.includes("409")) return "That email is already registered. Try signing in instead.";
  if (text.includes("429")) return "Too many attempts. Please wait a while and try again.";
  if (text.includes("400")) return "Please check the details above and try again.";
  return "Couldn't create your account right now. Please try again in a moment.";
}

export function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const incomplete =
    !firstName || !lastName || !email || password.length < MIN_PASSWORD_LENGTH;

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { userId: string } }>("/api/identity/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      setStatus({ kind: "registered" });
    } catch (err) {
      setStatus({ kind: "error", message: messageFor(err) });
    }
  }

  if (status.kind === "registered") {
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
          We&apos;ve sent a verification link. You&apos;ll need to open it before you can sign in.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <div style={{ flex: 1 }}>
          <Field id="register-first-name" label="FIRST NAME">
            <input
              id="register-first-name"
              autoComplete="given-name"
              value={firstName}
              maxLength={100}
              disabled={sending}
              onChange={(e) => setFirstName(e.target.value)}
              style={fieldStyle}
            />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field id="register-last-name" label="LAST NAME">
            <input
              id="register-last-name"
              autoComplete="family-name"
              value={lastName}
              maxLength={100}
              disabled={sending}
              onChange={(e) => setLastName(e.target.value)}
              style={fieldStyle}
            />
          </Field>
        </div>
      </div>

      <Field id="register-email" label="EMAIL">
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          maxLength={255}
          disabled={sending}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field
        id="register-password"
        label="PASSWORD"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      >
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          maxLength={128}
          disabled={sending}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            ...fieldStyle,
            borderColor: passwordTooShort ? "var(--danger)" : "var(--border-strong)",
          }}
        />
      </Field>

      {status.kind === "error" && <FormError>{status.message}</FormError>}

      <div>
        <SubmitButton onClick={handleSubmit} disabled={sending || incomplete}>
          {sending ? "Creating account…" : "Create account"}
        </SubmitButton>
      </div>
    </div>
  );
}
