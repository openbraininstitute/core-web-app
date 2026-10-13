import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

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

/** An MEModel's morphology, in the same `Sections` shape as {@link circuitMorphologyPath}. */
export function memodelMorphologyPath(memodelId: string): string {
  return `/memodel/viz/${encodeURIComponent(memodelId)}/morphology`;
}

/**
 * The URL and headers of a circuit's morphology pack, for a worker to fetch: every morphology at the finest level of
 * at most `maxSegments` segments, which OBI-One builds while the request waits.
 */
export async function buildCircuitMorphologyPackRequest(
  circuitId: string,
  maxSegments: number,
  ctx: WorkspaceContext | null
): Promise<{ url: string; headers: Record<string, string> }> {
  const session = await getSession();
  const headers: Record<string, string> = { ...getEntityCoreContext(ctx).headers };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const url = `${config.OBI_ONE_URL}/circuit/viz/${circuitId}/morphology-pack?max_segments=${maxSegments}`;
  return { url, headers };
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
