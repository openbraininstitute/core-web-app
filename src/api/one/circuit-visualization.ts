import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

/**
 * The sections of one morphology, as OBI-One numbers them.
 *
 * Doubles as a cache key, so the name stays in the path rather than being passed separately:
 * two cells of the same circuit can share a file and differ only by it.
 */
export function circuitMorphologyPath(circuitId: string, file: string, name?: string): string {
  const nameParam = name ? `?name=${encodeURIComponent(name)}` : '';
  return `/circuit/viz/${circuitId}/morphologies/${encodeURIComponent(file)}${nameParam}`;
}

/**
 * GET a `/circuit/viz` resource as JSON.
 *
 * Returns `unknown`: every caller parses the body with the zod schema for that endpoint, so
 * typing it here would only be a claim nothing checks.
 *
 * @param path - Route below the OBI-One base URL, from one of the helpers above.
 * @param ctx - Workspace the request is made in; OBI-One scopes circuit assets by it.
 */
export async function fetchCircuitViz(path: string, ctx: WorkspaceContext): Promise<unknown> {
  const api = await obioneApi();

  return api.get<unknown>(path, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      accept: 'application/json',
    },
  });
}
