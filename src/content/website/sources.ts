/** Only these public pages remain managed in Sanity. All other website content is checked into this directory. */
export const SANITY_PAGES = ['news', 'privacy', 'terms', 'financing', 'releasing-soon'] as const;

export function websiteSlug(slug: string): string {
  return slug.split('/').filter(Boolean).join('/') || '/';
}

export function usesSanityContent(slug: string): boolean {
  const page = websiteSlug(slug).split('/')[0];
  return SANITY_PAGES.some((allowed) => allowed === page);
}
