"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { FormError } from "./form";

type Status = { kind: "verifying" } | { kind: "verified" } | { kind: "error"; message: string };

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
      });
      return;
    }

    apiFetch<{ data: { verified: boolean } }>("/api/identity/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus({ kind: "verified" }))
      .catch((err: unknown) => {
        const badToken = err instanceof Error && err.message.includes("400");
        setStatus({
          kind: "error",
          message: badToken
            ? "This verification link is invalid or has expired."
            : "Couldn't verify your email right now. Please try again in a moment.",
        });
      });
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
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, margin: 0 }}>
          <Link href="/register">Register again</Link> to get a fresh link.
        </p>
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
