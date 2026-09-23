import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

// Same reasoning as News/Events/Gallery: project data changes independently
// of deploys, so this must render per-request rather than being baked into
// the static build.
export const dynamic = "force-dynamic";

type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  category: string | null;
  githubUrl: string | null;
  tags: string[];
  publishedAt: string;
};

type ListResponse = {
  data: ProjectSummary[];
  meta: { nextCursor: string | null };
};

type Facets = {
  categories: { value: string; count: number }[];
  tags: { value: string; count: number }[];
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const { q, category, tag } = await searchParams;

  let projects: ProjectSummary[] = [];
  let facets: Facets = { categories: [], tags: [] };
  let error: string | null = null;

  try {
    const params = new URLSearchParams({ limit: "20" });
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);

    const [list, facetResult] = await Promise.all([
      apiFetch<ListResponse>(`/api/projects?${params.toString()}`),
      apiFetch<{ data: Facets }>("/api/projects/facets"),
    ]);
    projects = list.data;
    facets = facetResult.data;
  } catch {
    error = "Couldn't load projects right now.";
  }

  const hasFilters = Boolean(q || category || tag);

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>WHAT WE BUILD</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Projects</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && (
          <form
            action="/projects"
            style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", flexWrap: "wrap" }}
          >
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search projects…"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                minWidth: 220,
              }}
            />
            {category && <input type="hidden" name="category" value={category} />}
            {tag && <input type="hidden" name="tag" value={tag} />}
            <button
              type="submit"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
        )}

        {!error && facets.categories.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
            <FilterChip href={buildHref({ q })} label="All categories" active={!category} />
            {facets.categories.map((c) => (
              <FilterChip
                key={c.value}
                href={buildHref({ q, category: c.value, tag })}
                label={`${c.value} (${c.count})`}
                active={category === c.value}
              />
            ))}
          </div>
        )}

        {!error && facets.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            {facets.tags.slice(0, 15).map((t) => (
              <FilterChip
                key={t.value}
                href={buildHref({ q, category, tag: tag === t.value ? undefined : t.value })}
                label={`#${t.value}`}
                active={tag === t.value}
                small
              />
            ))}
          </div>
        )}

        {!error && projects.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            {hasFilters ? "No projects match those filters." : "No published projects yet — check back soon."}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`} style={{ textDecoration: "none" }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-3)" }}>
                  <h3 style={{ fontSize: 20 }}>{project.title}</h3>
                  {project.category && <Designator>{project.category.toUpperCase()}</Designator>}
                </div>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {project.summary}
                </p>
                {project.tags.length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                    {project.tags.map((t) => `#${t}`).join("  ")}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}

function buildHref(params: { q?: string; category?: string; tag?: string }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.tag) search.set("tag", params.tag);
  const qs = search.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

function FilterChip({
  href,
  label,
  active,
  small,
}: {
  href: string;
  label: string;
  active: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: small ? 12 : 13,
        textDecoration: "none",
        padding: small ? "4px 10px" : "6px 14px",
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
