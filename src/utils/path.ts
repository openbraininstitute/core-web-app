import { split, trimStart } from 'es-toolkit/compat';
// adjust imports if path is elsewhere in your build

/**
 * Extracts all route parts after the projectId given a full pathname.
 * @param fullPath – e.g. "/app/virtual-lab/{virtualLabId}/{projectId}/workflows/view/..."
 * @param ROOT_PATH – e.g. "/app/virtual-lab"
 * @returns string[] – array of segments after projectId (or empty array if invalid)
 */
export function getRouteSegmentsAfterWorkspace(fullPath: string, ROOT_PATH: string): string[] {
  // remove root prefix
  // use trimStart to strip possible leading slash after removal
  const withoutRoot = trimStart(fullPath.replace(ROOT_PATH, ''), '/');

  // split into segments
  const segments = split(withoutRoot, '/').filter((seg) => seg.length > 0);

  // we expect: [ virtualLabId, projectId, segment1, segment2, ... ]
  if (segments.length < 3) {
    return [];
  }

  // return everything after the first two
  return segments.slice(2);
}
