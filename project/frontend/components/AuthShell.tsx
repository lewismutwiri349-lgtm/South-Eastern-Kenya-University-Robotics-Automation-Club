import type { ReactNode } from "react";
import { Container, Designator } from "@/components/ui";

/**
 * All five Identity pages (login, register, forgot/reset password, verify
 * email) share one narrow, centred shell. Kept as a component rather than
 * an `(auth)/layout.tsx` so each page can still set its own metadata and
 * choose its own designator line.
 */
export function AuthShell({
  designator,
  title,
  intro,
  children,
  footer,
}: {
  designator: string;
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main>
      <Container
        style={{
          paddingTop: "var(--space-16)",
          paddingBottom: "var(--space-16)",
          maxWidth: 440,
        }}
      >
        <Designator>{designator}</Designator>
        <h1 style={{ fontSize: 30, marginTop: "var(--space-3)" }}>{title}</h1>

        {intro && (
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              marginTop: "var(--space-3)",
            }}
          >
            {intro}
          </p>
        )}

        <div style={{ marginTop: "var(--space-8)" }}>{children}</div>

        {footer && (
          <div
            style={{
              marginTop: "var(--space-8)",
              paddingTop: "var(--space-6)",
              borderTop: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {footer}
          </div>
        )}
      </Container>
    </main>
  );
}
