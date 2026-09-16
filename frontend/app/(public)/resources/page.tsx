import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

export const dynamic = "force-dynamic";

type ResourceSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  url: string;
  category: string | null;
  publishedAt: string;
};

type ListResponse = {
  data: ResourceSummary[];
  meta: { nextCursor: string | null };
};

/** Shows the reader where a link goes before they click it. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  let resources: ResourceSummary[] = [];
  let categories: string[] = [];
  let error: string | null = null;

  try {
    const query = category ? `&category=${encodeURIComponent(category)}` : "";
    const [list, categoryList] = await Promise.all([
      apiFetch<ListResponse>(`/api/resources?limit=20${query}`),
      apiFetch<{ data: string[] }>("/api/resources/categories"),
    ]);
    resources = list.data;
    categories = categoryList.data;
  } catch {
    error = "Couldn't load resources right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>LIBRARY</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Resources</h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            marginTop: "var(--space-3)",
            maxWidth: 620,
          }}
        >
          Datasheets, tutorials, toolchains and standards the club recommends.
        </p>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && categories.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              marginTop: "var(--space-6)",
            }}
          >
            <CategoryChip href="/resources" label="All" active={!category} />
            {categories.map((name) => (
              <CategoryChip
                key={name}
                href={`/resources?category=${encodeURIComponent(name)}`}
                label={name}
                active={category === name}
              />
            ))}
          </div>
        )}

        {!error && resources.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            {category ? "Nothing in this category yet." : "No resources published yet."}
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            marginTop: "var(--space-10)",
          }}
        >
          {resources.map((resource) => (
            <Card key={resource.id}>
              <Designator>{resource.category ?? "GENERAL"}</Designator>
              <h3 style={{ fontSize: 20, marginTop: "var(--space-2)" }}>
                <Link href={`/resources/${resource.slug}`} style={{ textDecoration: "none" }}>
                  {resource.title}
                </Link>
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginTop: "var(--space-2)",
                }}
              >
                {resource.description}
              </p>
              <p style={{ marginTop: "var(--space-3)" }}>
                {/* rel="noopener noreferrer" on every outbound link — these
                    URLs are staff-entered but point off-site, so the new tab
                    must not get a handle on window.opener. */}
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--secondary)",
                  }}
                >
                  Open ↗ {hostOf(resource.url)}
                </a>
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        textDecoration: "none",
        padding: "6px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-contrast)" : "var(--text-secondary)",
      }}
    >
      {label}
    </Link>
  );
}
