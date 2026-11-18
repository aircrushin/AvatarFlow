/**
 * Builds a URL slug from an event name.
 *
 * Latin names are slugified in place ("2026 Spring Brand" → "2026-spring-brand").
 * Names without enough ASCII, such as Chinese titles, get a stable `event-`
 * id derived from the text, so the field fills as the user types and does not
 * reshuffle on every keystroke.
 */
export function slugFromName(name: string): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

  if (ascii.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ascii)) return ascii;

  const trimmed = name.trim();
  if (!trimmed) return '';

  let hash = 2166136261;
  for (const ch of trimmed) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  const id = (hash >>> 0).toString(36).padStart(6, '0').slice(0, 6);
  return `event-${id}`;
}
