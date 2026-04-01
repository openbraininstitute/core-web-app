// Matches: /{prefix}/{prefix}/{uuid}/{uuid}/{...rest}
// e.g. /app/virtual-lab/uuid/uuid/get-started/tutorials
const SECTION_REGEX = /^\/?[^/]+\/[^/]+\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}(?:\/(.*))?/;

/**
 * Extracts the full remaining path after the two UUIDs.
 * e.g. "/app/virtual-lab/uuid/uuid/get-started/tutorials" → "get-started/tutorials"
 */
function getPathAfterWorkspace(pathname: string): string {
  const match = pathname.match(SECTION_REGEX);
  return match?.[1] ?? '';
}

/**
 * Returns the active section for a given pathname.
 *
 * Without `section`: returns the top-level section (first segment after UUIDs).
 *   e.g. "/app/virtual-lab/uuid/uuid/get-started/tutorials" → "get-started"
 *
 * With `section`: checks if that segment exists in the path after the UUIDs.
 *   e.g. getActiveSection(pathname, "tutorials") → "tutorials" when on /…/get-started/tutorials
 */
export function getActiveSection(pathname: string, section?: string): string | undefined {
  const remainingPath = getPathAfterWorkspace(pathname);

  if (!section) {
    const slashIndex = remainingPath.indexOf('/');
    return slashIndex === -1 ? remainingPath : remainingPath.slice(0, slashIndex);
  }

  const segments = remainingPath.split('/').filter(Boolean);
  return segments.includes(section) ? section : undefined;
}
