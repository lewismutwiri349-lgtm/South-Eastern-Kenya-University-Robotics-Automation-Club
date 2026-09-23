import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  category: string | null;
  githubUrl: string | null;
  tags: string[];
  publishedAt: string;
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let project: Project;
  try {
    const result = await apiFetch<{ data: Project }>(`/api/projects/${encodeURIComponent(slug)}`);
    project = result.data;
  } catch {
    notFound();
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)", maxWidth: 720 }}>
        <Designator>{project.category ? project.category.toUpperCase() : "PROJECT"}</Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{project.title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-3)" }}>
          {project.summary}
        </p>
        {project.githubUrl && (
          <p style={{ fontSize: 14, marginTop: "var(--space-3)" }}>
            <a href={project.githubUrl} style={{ color: "var(--accent)" }} target="_blank" rel="noreferrer">
              View source on GitHub →
            </a>
          </p>
        )}
        {project.tags.length > 0 && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: "var(--space-3)" }}>
            {project.tags.map((t) => `#${t}`).join("  ")}
          </p>
        )}
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-6)", lineHeight: 1.8 }}>
          {project.body}
        </p>
      </Container>
    </main>
  );
}
