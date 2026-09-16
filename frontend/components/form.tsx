"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Form primitives shared by the Contact form and the Identity (auth) forms.
 * Extracted so field styling lives in exactly one place — the project uses
 * inline styles driven by the CSS custom properties in `app/globals.css`
 * (see docs/06_UI_Design_System.md), so without this every form would
 * re-declare the same six style objects and they would drift.
 */

export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  color: "var(--text-primary)",
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-md)",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-secondary)",
  marginBottom: "var(--space-2)",
  letterSpacing: "0.05em",
};

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: "var(--space-2)",
            marginBottom: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ color: "var(--danger)", fontSize: 14, margin: 0 }}>
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
      {children}
    </p>
  );
}

/**
 * Deliberately a <button type="button"> with an onClick handler rather than
 * a <form onSubmit>. Every one of these posts JSON through `lib/api.ts` and
 * never does a native form submission, so a real <form> would only add a
 * full-page-navigation failure mode if the JS handler ever threw.
 */
export function SubmitButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 500,
        padding: "10px 20px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--accent)",
        background: "var(--accent)",
        color: "var(--accent-contrast)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
