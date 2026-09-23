/**
 * Opaque unique ID for rows created via raw D1 statements (Phase 3+ services).
 * Same scheme as the Drizzle-based services (crypto.randomUUID()).
 */
export function generateId(): string {
  return crypto.randomUUID();
}
