/** Converts a title into a URL-friendly slug. Not domain-specific — any
 * future domain needing slugs (Events, Projects) reuses this rather than
 * re-implementing it, per docs/02_Engineering_Principles.md §2. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

/** Appends a short random suffix to disambiguate a slug collision. */
export function disambiguateSlug(baseSlug: string): string {
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${baseSlug}-${suffix}`;
}
