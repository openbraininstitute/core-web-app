/**
 * Ion-channel (and similar) labels may carry IUPHAR HTML, e.g. `K<SUB>v</SUB>10.1`.
 * Facet buckets expose that markup as the label; filter wire values and plain-text
 * surfaces need the tag-stripped form (`Kv10.1`), while pickers render safe sub/sup.
 */

const SUB_SUP_TOKEN = /(<\/?(?:sub|sup)>)/gi;

/** Remove every HTML tag; used for API `__in` values and plain-text summaries. */
export function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, '');
}

/**
 * Keep only `<sub>` / `<sup>` (any case), escape everything else, normalize tags
 * to lowercase. Safe to feed into `dangerouslySetInnerHTML`.
 */
export function sanitizeSubSupHtml(input: string): string {
  return input
    .split(SUB_SUP_TOKEN)
    .map((part) => {
      if (/^<\/?(?:sub|sup)>$/i.test(part)) return part.toLowerCase();
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    })
    .join('');
}

export function hasSubSupMarkup(input: string): boolean {
  return /<\/?(?:sub|sup)>/i.test(input);
}
