import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Container, Designator } from "@/components/ui";

// Same reasoning as News/Events/Projects/Awards: gallery content changes
// independently of deploys, so this must render per-request.
export const dynamic = "force-dynamic";

type GalleryItemSummary = {
  id: string;
  title: string;
  slug: string;
  caption: string;
  imageUrl: string;
  category: string | null;
  capturedAt: string;
};

type ListResponse = {
  data: GalleryItemSummary[];
  meta: { nextCursor: string | null };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  let items: GalleryItemSummary[] = [];
  let categories: string[] = [];
  let error: string | null = null;

  try {
    const query = category ? `&category=${encodeURIComponent(category)}` : "";
    const [list, categoryList] = await Promise.all([
      apiFetch<ListResponse>(`/api/gallery?limit=24${query}`),
      apiFetch<{ data: string[] }>("/api/gallery/categories"),
    ]);
    items = list.data;
    categories = categoryList.data;
  } catch {
    error = "Couldn't load the gallery right now.";
  }

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>GALLERY</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Gallery</h1>

        {error && <p style={{ color: "var(--danger)", marginTop: "var(--space-6)" }}>{error}</p>}

        {!error && categories.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              marginTop: "var(--space-6)",
            }}
          >
            <CategoryChip href="/gallery" label="All" active={!category} />
            {categories.map((name) => (
              <CategoryChip
                key={name}
                href={`/gallery?category=${encodeURIComponent(name)}`}
                label={name}
                active={category === name}
              />
            ))}
          </div>
        )}

        {!error && items.length === 0 && (
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-6)" }}>
            {category
              ? "Nothing in this category yet."
              : "No photos published yet — check back after the next build session."}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "var(--space-4)",
            marginTop: "var(--space-10)",
          }}
        >
          {items.map((item) => (
            <Link key={item.id} href={`/gallery/${item.slug}`} style={{ textDecoration: "none" }}>
              <figure
                style={{
                  margin: 0,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                {/* Plain <img>, not next/image: these are arbitrary external
                    URLs entered by staff, and next/image would require every
                    possible host to be whitelisted in next.config.js. Phase 5
                    moves these to R2, at which point a single known host makes
                    next/image the right call. See docs/modules/gallery.md §4. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    background: "var(--border)",
                  }}
                />
                <figcaption style={{ padding: "var(--space-4)" }}>
                  <Designator>
                    {formatDate(item.capturedAt)}
                    {item.category ? ` · ${item.category}` : ""}
                  </Designator>
                  <h3 style={{ fontSize: 17, marginTop: "var(--space-2)" }}>{item.title}</h3>
                </figcaption>
              </figure>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        textDecoration: "none",
        padding: "6px 14px",
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
