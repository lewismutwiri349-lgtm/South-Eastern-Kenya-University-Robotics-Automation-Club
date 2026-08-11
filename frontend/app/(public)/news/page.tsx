import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

// News content changes independently of deploys — this must be rendered
// per-request, not baked into the static build. Without this, `next build`
// would prerender a single snapshot (or an error state, if the backend
// wasn't reachable at build time) and serve it forever. Caught during
// Module 3b validation (2026-08-09).
export const dynamic = "force-dynamic";


type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
};

type ListResponse = {
  data: ArticleSummary[];
  meta: { nextCursor: string | null };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function NewsPage() {
  let articles: ArticleSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ListResponse>("/api/news?limit=20");
    articles = result.data;
  } catch {
    error = "Couldn't load news right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>CLUB NEWS</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>News</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && articles.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            No news yet — check back after the next division update.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {articles.map((article) => (
            <Link key={article.id} href={`/news/${article.slug}`} style={{ textDecoration: "none" }}>
              <Card>
                <Designator>{formatDate(article.publishedAt)}</Designator>
                <h3 style={{ fontSize: 20, marginTop: "var(--space-2)" }}>{article.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {article.excerpt}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
