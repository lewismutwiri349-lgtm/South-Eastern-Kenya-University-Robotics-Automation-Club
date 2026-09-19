import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

type Event = {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string | null;
  publishedAt: string;
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

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event: Event;
  try {
    const result = await apiFetch<{ data: Event }>(`/api/events/${encodeURIComponent(slug)}`);
    event = result.data;
  } catch {
    notFound();
  }

  const when = event.endAt
    ? `${formatDateTime(event.startAt)} – ${formatDateTime(event.endAt)}`
    : formatDateTime(event.startAt);

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)", maxWidth: 720 }}>
        <Designator>{when}</Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{event.title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-3)" }}>
          {event.location}
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-6)", lineHeight: 1.8 }}>
          {event.description}
        </p>
      </Container>
    </main>
  );
}
