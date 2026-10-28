import { fetchCircuitViz } from '@/api/one/circuit-visualization';
import { SectionsArraySchema } from '@/features/scan-config/types';

import type { QueryClient } from '@tanstack/react-query';
import type { Sections } from '@/features/scan-config/types';

/** Where one morphology's sections are read: a `/circuit/viz` or `/memodel/viz` path, in a workspace. */
export type SectionsRequest = { path: string; virtualLabId: string; projectId: string };

const KEPT_FOR_MS = 60 * 60 * 1000;

/**
 * A morphology's sections, parsed, kept in `client` an hour once read. Rejects where they cannot be read or parsed,
 * and is then read again the next time, so a retry reads them anew.
 */
export function loadSections(
  client: QueryClient,
  { path, virtualLabId, projectId }: SectionsRequest
): Promise<Sections> {
  return client.fetchQuery({
    queryKey: ['circuit-morphology-sections', virtualLabId, projectId, path],
    queryFn: () =>
      fetchCircuitViz(path, { virtualLabId, projectId }).then((json) =>
        SectionsArraySchema.parse(json)
      ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: KEPT_FOR_MS,
    retry: false,
  });
}
