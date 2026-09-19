"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Field, FormError, SubmitButton, fieldStyle } from "./form";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string };

/**
 * Error copy maps the API's documented status codes (see
 * `backend/src/routes/identity/login.ts`):
 *   401 INVALID_CREDENTIALS · 403 EMAIL_NOT_VERIFIED · 429 ACCOUNT_LOCKED
 *        or RATE_LIMITED
 *
 * 429 is deliberately ambiguous in the message. The API returns it both for
 * a locked account and for per-IP rate limiting, and those are indeed
 * indistinguishable from outside — telling someone "this account is locked"
 * would confirm the account exists, which is exactly the enumeration leak
 * the rest of the Identity module is careful to avoid.
 */
function messageFor(err: unknown): string {
  const text = err instanceof Error ? err.message : "";
  if (text.includes("401")) return "That email and password don't match.";
  if (text.includes("403")) return "Please verify your email address before signing in.";
  if (text.includes("429")) return "Too many attempts. Please wait a while and try again.";
  return "Couldn't sign in right now. Please try again in a moment.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { userId: string; role: string } }>("/api/identity/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // The session is an httpOnly cookie set by the API, so there is
      // nothing to store client-side. `refresh()` makes the server
      // components re-render with the new cookie in play.
      router.push("/account");
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: messageFor(err) });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field id="login-email" label="EMAIL">
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          maxLength={255}
          disabled={sending}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field id="login-password" label="PASSWORD">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          maxLength={128}
          disabled={sending}
          onChange={(e) => setPassword(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      {status.kind === "error" && <FormError>{status.message}</FormError>}

      <div>
        <SubmitButton onClick={handleSubmit} disabled={sending || !email || !password}>
          {sending ? "Signing in…" : "Sign in"}
        </SubmitButton>
      </div>
    </div>
  );
}
