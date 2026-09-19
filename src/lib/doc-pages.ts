export const PAGE_BREAK = '<hr class="page-break">';

const BREAK_RE = /<hr[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi;

/** Split a document's HTML into individual page HTML strings. */
export function splitPages(html: string): string[] {
  const parts = (html || "").split(BREAK_RE).map((p) => p.trim());
  const pages = parts.filter((p, i) => p.length > 0 || i === 0);
  return pages.length > 0 ? pages : [""];
}

/** Join page HTML strings back into one document. */
export function joinPages(pages: string[]): string {
  return pages.join(`\n${PAGE_BREAK}\n`);
}
