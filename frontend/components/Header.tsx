"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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

/**
 * Became a client component when the mobile nav was added (2026-09-16) —
 * nine links do not fit on a phone, and the previous version rendered them
 * all in a wrapping row that pushed the sign-in button off screen. The
 * responsive rules live in `app/globals.css` (`.site-nav-*`) because inline
 * styles can't express media queries.
 */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ firstName: string } | null>(null);

  useEffect(() => {
    apiFetch<{ data: { firstName: string } }>("/api/identity/me")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, [pathname]);

  // Close the panel on navigation — without this it stays open over the new
  // page, since client-side routing doesn't remount the header.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

        <nav className="site-nav-desktop">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              style={{
                textDecoration: "none",
                color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <ThemeToggle />

          <Link
            href={me ? "/account" : "/login"}
            style={{
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              textDecoration: "none",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              padding: "6px 14px",
              whiteSpace: "nowrap",
            }}
          >
            {me ? me.firstName : "Sign in"}
          </Link>

          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav-mobile"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              {open ? (
                <path
                  d="M3 3 L15 15 M15 3 L3 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M2 4.5 H16 M2 9 H16 M2 13.5 H16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <nav id="site-nav-mobile" className="site-nav-mobile" data-open={open}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
            style={{
              textDecoration: "none",
              color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
