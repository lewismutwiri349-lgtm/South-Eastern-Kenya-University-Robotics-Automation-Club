/**
 * Generate a unique UUID v4 identifier.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
