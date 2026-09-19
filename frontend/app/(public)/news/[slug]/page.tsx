import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  publishedAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let article: Article;
  try {
    const result = await apiFetch<{ data: Article }>(`/api/news/${encodeURIComponent(slug)}`);
    article = result.data;
  } catch {
    notFound();
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)", maxWidth: 720 }}>
        <Designator>{formatDate(article.publishedAt)}</Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{article.title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-6)", lineHeight: 1.8 }}>
          {article.body}
        </p>
      </Container>
    </main>
  );
}
