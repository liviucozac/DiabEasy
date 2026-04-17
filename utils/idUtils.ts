/**
 * Generates a locally unique ID combining a timestamp and random suffix.
 * Collision-safe for all practical local use — two IDs generated in the
 * same millisecond will still differ due to the random component.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
