/**
 * Display-cases a stored name like SQL `initcap(lower(name))`:
 * lowercases everything, then capitalizes the first letter of each word.
 * Only for display — never feed the result back into the API.
 */
export function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/(^|[^a-z0-9])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
