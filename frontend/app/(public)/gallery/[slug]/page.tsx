import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

export const dynamic = "force-dynamic";

type GalleryItem = {
  id: string;
  title: string;
  slug: string;
  caption: string;
  imageUrl: string;
  category: string | null;
  capturedAt: string;
  publishedAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function GalleryItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let item: GalleryItem;
  try {
    const result = await apiFetch<{ data: GalleryItem }>(`/api/gallery/${slug}`);
    item = result.data;
  } catch {
    notFound();
  }

  return (
    <main>
      <Container
        style={{
          paddingTop: "var(--space-12)",
          paddingBottom: "var(--space-16)",
          maxWidth: 860,
        }}
      >
        <Designator>
          {formatDate(item.capturedAt)}
          {item.category ? ` · ${item.category}` : ""}
        </Designator>
        <h1 style={{ fontSize: 36, marginTop: "var(--space-3)" }}>{item.title}</h1>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{
            display: "block",
            width: "100%",
            marginTop: "var(--space-8)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--border)",
          }}
        />

        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            marginTop: "var(--space-6)",
            lineHeight: 1.8,
          }}
        >
          {item.caption}
        </p>

        <p style={{ marginTop: "var(--space-8)" }}>
          <Link
            href="/gallery"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            ← Back to gallery
          </Link>
        </p>
      </Container>
    </main>
  );
}
