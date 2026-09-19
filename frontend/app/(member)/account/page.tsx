"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { ApiError, apiFetch } from "@/lib/api";

type Me = { firstName: string; lastName: string; email: string; role: string };

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Me }>("/api/identity/me")
      .then((res) => setMe(res.data))
      .catch((err: unknown) => {
        // Only an authentication failure means "signed out". A network
        // error or a 5xx must not bounce a signed-in member to /login.
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setLoadError(true);
        }
      });
  }, [router]);

  async function signOut() {
    try {
      await apiFetch("/api/identity/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <AuthShell designator="MEMBER PORTAL" title={me ? `Welcome, ${me.firstName}` : loadError ? "Something went wrong" : "Loading…"}>
      {loadError && (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>
          Couldn&apos;t load your account right now. Please refresh the page.
        </p>
      )}
      {me && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {me.firstName} {me.lastName} · {me.email}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            Role: {me.role}
          </p>
          <button
            type="button"
            onClick={signOut}
            style={{ alignSelf: "flex-start", fontFamily: "var(--font-mono)", fontSize: 13 }}
          >
            Sign out
          </button>
        </div>
      )}
    </AuthShell>
  );
}