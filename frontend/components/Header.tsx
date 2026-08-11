import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/divisions", label: "Divisions" },
  { href: "/projects", label: "Projects" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/awards", label: "Awards" },
  { href: "/gallery", label: "Gallery" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-3) var(--space-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            textDecoration: "none",
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          RASC<span style={{ color: "var(--accent)" }}>.</span>
        </Link>

        <nav
          style={{
            display: "flex",
            gap: "var(--space-6)",
            flexWrap: "wrap",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ textDecoration: "none", color: "var(--text-secondary)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <ThemeToggle />
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              textDecoration: "none",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              padding: "6px 14px",
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
