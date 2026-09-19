import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

type Award = {
  id: string;
  title: string;
  slug: string;
  description: string;
  recipientName: string;
  category: string | null;
  awardedAt: string;
  coverImageUrl: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default async function AwardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let award: Award;
  try {
    const result = await apiFetch<{ data: Award }>(`/api/awards/${encodeURIComponent(slug)}`);
    award = result.data;
  } catch {
    notFound();
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)", maxWidth: 720 }}>
        <Designator>
          {formatDate(award.awardedAt)}
          {award.category ? ` · ${award.category}` : ""}
        </Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{award.title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-3)" }}>
          Awarded to {award.recipientName}
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-6)", lineHeight: 1.8 }}>
          {award.description}
        </p>
      </Container>
    </main>
  );
}
