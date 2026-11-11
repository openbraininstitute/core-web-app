import { z } from 'zod';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

const MorphologyLocationsPreviewSchema = z.object({
  locations: z.array(z.object({ section_id: z.number(), offset: z.number() })),
});

export type TPreviewedMorphologyLocation = z.infer<
  typeof MorphologyLocationsPreviewSchema
>['locations'][number];

/**
 * The locations one `morphology_locations` block would generate on an entity's morphology.
 *
 * Stateless: nothing is stored and no workflow runs. Rejects with a 422 when the block holds a
 * parameter sweep or is invalid.
 *
 * @param options.entityId - MEModel, single-neuron circuit, or cell morphology to sample
 * @param options.block - The block exactly as the config holds it
 * @returns `(section_id, offset)` pairs in the `compartment_sets.json` format
 */
export async function previewMorphologyLocations({
  ctx,
  entityId,
  block,
  signal,
}: {
  ctx: WorkspaceContext;
  entityId: string;
  block: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<TPreviewedMorphologyLocation[]> {
  const api = await obioneApi();
  const json = await api.post<unknown>(
    `/declared/morphology-locations/preview/${encodeURIComponent(entityId)}`,
    {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: block,
      signal,
    }
  );
  return MorphologyLocationsPreviewSchema.parse(json).locations;
}
