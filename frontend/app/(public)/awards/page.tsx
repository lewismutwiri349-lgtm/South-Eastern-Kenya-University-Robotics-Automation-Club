import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

// Same reasoning as News/Events/Projects: award data changes
// independently of deploys, so this must render per-request.
export const dynamic = "force-dynamic";

type AwardSummary = {
  id: string;
  title: string;
  slug: string;
  recipientName: string;
  category: string | null;
  awardedAt: string;
  coverImageUrl: string | null;
};

type ListResponse = {
  data: AwardSummary[];
  meta: { nextCursor: string | null };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default async function AwardsPage() {
  let awards: AwardSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ListResponse>("/api/awards?limit=20");
    awards = result.data;
  } catch {
    error = "Couldn't load awards right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>RECOGNITION</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Awards</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && awards.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            No awards published yet — check back soon.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {awards.map((award) => (
            <Link key={award.id} href={`/awards/${award.slug}`} style={{ textDecoration: "none" }}>
              <Card>
                <Designator>
                  {formatDate(award.awardedAt)}
                  {award.category ? ` · ${award.category}` : ""}
                </Designator>
                <h3 style={{ fontSize: 20, marginTop: "var(--space-2)" }}>{award.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {award.recipientName}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
