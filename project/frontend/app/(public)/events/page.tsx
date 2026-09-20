import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, Container, Designator } from "@/components/ui";

// Same reasoning as News (frontend/app/(public)/news/page.tsx): event data
// changes independently of deploys, so this must render per-request rather
// than being baked into the static build.
export const dynamic = "force-dynamic";

type EventSummary = {
  id: string;
  title: string;
  slug: string;
  location: string;
  startAt: string;
  endAt: string | null;
};

type ListResponse = {
  data: EventSummary[];
  meta: { nextCursor: string | null };
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventsPage() {
  let events: EventSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ListResponse>("/api/events?limit=20");
    events = result.data;
  } catch {
    error = "Couldn't load events right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>UPCOMING</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Events</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && events.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            No upcoming events right now — check back soon.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.slug}`} style={{ textDecoration: "none" }}>
              <Card>
                <Designator>{formatDateTime(event.startAt)}</Designator>
                <h3 style={{ fontSize: 20, marginTop: "var(--space-2)" }}>{event.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {event.location}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
