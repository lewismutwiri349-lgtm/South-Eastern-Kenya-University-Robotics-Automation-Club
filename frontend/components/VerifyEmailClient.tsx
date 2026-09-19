"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { FormError } from "./form";
import { ResendVerification } from "./ResendVerification";

type Status =
  | { kind: "verifying" }
  | { kind: "verified" }
  // `canResend`: the token itself was the problem, so a fresh link helps.
  // False for transient failures, where the same link is still good.
  | { kind: "error"; message: string; canResend: boolean };

function describeFailure(err: unknown): { message: string; canResend: boolean } {
  if (err instanceof ApiError && err.code === "TOKEN_EXPIRED") {
    return { message: "This verification link has expired.", canResend: true };
  }
  if (err instanceof ApiError && (err.code === "INVALID_TOKEN" || err.status === 400)) {
    // Tokens are single-use, so a second click on an already-used link (or
    // an email client pre-fetching it) lands here even though the account
    // is verified — say so instead of implying something is broken.
    return {
      message: "This verification link is invalid or has already been used.",
      canResend: true,
    };
  }
  return {
    message: "Couldn't verify your email right now. Please refresh this page to try again.",
    canResend: false,
  };
}

/**
 * The verification link in the email lands here with `?token=...`. The API
 * expects that token in a POST body, not a GET query, so this component
 * does the exchange on mount.
 *
 * `hasRun` guards against React 18 StrictMode's deliberate double-invoke of
 * effects in development, which would otherwise fire two POSTs — the second
 * landing after the token is consumed and rendering a spurious "invalid
 * link" to a user whose email verified fine.
 */
export function VerifyEmailClient({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>({ kind: "verifying" });
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setStatus({
        kind: "error",
        message: "This verification link is missing its token.",
        canResend: true,
      });
      return;
    }

    apiFetch<{ data: { verified: boolean } }>("/api/identity/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus({ kind: "verified" }))
      .catch((err: unknown) => setStatus({ kind: "error", ...describeFailure(err) }));
  }, [token]);

  if (status.kind === "verifying") {
    return (
      <p role="status" style={{ color: "var(--text-secondary)", fontSize: 15, margin: 0 }}>
        Verifying your email…
      </p>
    );
  }

  if (status.kind === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <FormError>{status.message}</FormError>
        {status.canResend && (
          <>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              Already verified? <Link href="/login">Sign in</Link>. Otherwise, request a new link:
            </p>
            <ResendVerification />
          </>
        )}
      </div>
    );
  }

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
      <h3 style={{ fontSize: 18 }}>Email verified</h3>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
        Your account is ready. <Link href="/login">Sign in</Link> to continue.
      </p>
    </div>
  );
}
