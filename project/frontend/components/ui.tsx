import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  borderRadius: "var(--radius-md)",
  padding: "10px 20px",
  border: "1px solid transparent",
  cursor: "pointer",
};

const buttonVariants: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderColor: "var(--accent)",
  },
  secondary: {
    background: "transparent",
    color: "var(--text-primary)",
    borderColor: "var(--border-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
  },
};

export function Button({
  href,
  variant = "primary",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link href={href} style={{ ...buttonBase, ...buttonVariants[variant] }} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Schematic-style reference designator, e.g. "DIV.01" — used for genuinely
 * enumerable content (divisions, projects), not decoration. See
 * docs/06_UI_Design_System.md and the Module 3 design plan. */
export function Designator({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--secondary)",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
  );
}

export function Container({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 var(--space-6)", ...style }}>
      {children}
    </div>
  );
}
