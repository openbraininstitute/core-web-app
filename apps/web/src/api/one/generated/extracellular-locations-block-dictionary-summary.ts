import { obioneApi } from '@/api/one/utils';

import type { WorkspaceContext } from '@/types/common';

const baseUri = '/declared/extracellular-locations/block_dictionary_summary';

/** World-coordinate electrode point from obi-one summary responses. */
export type ElectrodeLocationPoint = [number, number, number];

/**
 * Summary for one named electrode-location block.
 * Overlay rendering only needs `locations`; other fields are left loose.
 */
export interface ElectrodeLocationsBlockSummary {
  locations: ElectrodeLocationPoint[];
  origin_x?: number;
  origin_y?: number;
  origin_z?: number;
  [key: string]: unknown;
}

/** Dictionary summary keyed by block name (additionalProperties on staging). */
export type TElectrodeLocationsDictionarySummary = Record<string, ElectrodeLocationsBlockSummary>;

/**
 * Resolve world-coordinate electrode positions for a full
 * `electrode_locations` block dictionary.
 */
export async function extracellularLocationsBlockDictionarySummary({
  ctx,
  payload,
}: {
  ctx: WorkspaceContext;
  payload: Record<string, unknown>;
}): Promise<TElectrodeLocationsDictionarySummary> {
  const api = await obioneApi();
  return await api.post<TElectrodeLocationsDictionarySummary>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'virtual-lab-id': ctx?.virtualLabId,
      'project-id': ctx?.projectId,
    },
    body: payload,
  });
}
