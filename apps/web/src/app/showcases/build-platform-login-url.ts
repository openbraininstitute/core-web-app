/**
 * Login URL that, after auth, runs `/app/virtual-lab/sync` which resolves the user's
 * virtual lab + project and redirects to `.../reports/obi-showcase/{slug}?section=...`.
 */
export function buildPlatformLoginUrl(slug: string, section: string = 'description'): string {
  return `/app/virtual-lab/sync?showcaseSlug=${encodeURIComponent(slug)}&showcaseSection=${encodeURIComponent(section)}`;
}
