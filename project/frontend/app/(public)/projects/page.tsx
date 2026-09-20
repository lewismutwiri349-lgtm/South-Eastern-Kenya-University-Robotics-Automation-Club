import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

// Same reasoning as News/Events: project data changes independently of
// deploys, so this must render per-request rather than being baked into
// the static build.
export const dynamic = "force-dynamic";

type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  publishedAt: string;
};

type ListResponse = {
  data: ProjectSummary[];
  meta: { nextCursor: string | null };
};

export default async function ProjectsPage() {
  let projects: ProjectSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ListResponse>("/api/projects?limit=20");
    projects = result.data;
  } catch {
    error = "Couldn't load projects right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>WHAT WE BUILD</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Projects</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && projects.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            No published projects yet — check back soon.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`} style={{ textDecoration: "none" }}>
              <Card>
                <h3 style={{ fontSize: 20 }}>{project.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {project.summary}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
