import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

export const dynamic = "force-dynamic";

type Resource = {
  id: string;
  title: string;
  slug: string;
  description: string;
  url: string;
  category: string | null;
  publishedAt: string;
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let resource: Resource;
  try {
    const result = await apiFetch<{ data: Resource }>(`/api/resources/${slug}`);
    resource = result.data;
  } catch {
    notFound();
  }

  return (
    <main>
      <Container
        style={{
          paddingTop: "var(--space-12)",
          paddingBottom: "var(--space-16)",
          maxWidth: 720,
        }}
      >
        <Designator>{resource.category ?? "RESOURCE"}</Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{resource.title}</h1>

        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            marginTop: "var(--space-6)",
            lineHeight: 1.8,
          }}
        >
          {resource.description}
        </p>

        <div style={{ marginTop: "var(--space-8)" }}>
          {/* Not the shared <Button>, which renders a next/link and is for
              in-app navigation. This is an outbound link and needs
              target/rel, which next/link would carry to a client-side route. */}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "1px solid var(--accent)",
            }}
          >
            Open resource ↗
          </a>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: "var(--space-3)",
            }}
          >
            {hostOf(resource.url)}
          </p>
        </div>

        <p style={{ marginTop: "var(--space-8)" }}>
          <Link
            href="/resources"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            ← Back to resources
          </Link>
        </p>
      </Container>
    </main>
  );
}
