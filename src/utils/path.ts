import { split, trimStart } from 'es-toolkit/compat';

/**
 * get all route parts after the projectId given a full pathname.
 * @param fullPath – e.g. "/app/virtual-lab/{virtualLabId}/{projectId}/workflows/view/..."
 * @param ROOT_PATH – e.g. "/app/virtual-lab"
 * @returns string[] – array of segments after projectId (or empty array if invalid)
 */
export function getRouteSegmentsAfterWorkspace(fullPath: string, ROOT_PATH: string): string[] {
  const withoutRoot = trimStart(fullPath.replace(ROOT_PATH, ''), '/');
  const segments = split(withoutRoot, '/').filter((seg) => seg.length > 0);

  if (segments.length < 3) {
    return [];
  }

  return segments.slice(2);
}
