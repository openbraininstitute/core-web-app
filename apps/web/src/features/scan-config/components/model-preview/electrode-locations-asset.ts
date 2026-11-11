import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';

import type { TElectrodeLocationsDictionarySummary } from '@/api/one/generated/extracellular-locations-block-dictionary-summary';
import type { WorkspaceContext } from '@/types/common';

export function findElectrodeLocationsAsset(assets: IAsset[] | undefined): IAsset | null {
  return getAsset({ assets: assets ?? [], label: AssetLabel.electrode_locations }).getOneOrNull();
}

/**
 * Download and parse a stored `electrode_locations` asset.
 *
 * Read as a raw `Response`: the storage layer does not always label the
 * download `application/json`, and the api client would then hand back an
 * ArrayBuffer instead of the parsed dictionary.
 *
 * @param options.entityType - Owning entity type; defaults to the recording array
 * @returns The same dictionary shape Obi-One returns for a live summary
 */
export async function downloadElectrodeLocations({
  ctx,
  entityId,
  assetId,
  entityType = EntityTypeDict.SimulatableExtracellularRecordingArray,
}: {
  ctx: WorkspaceContext;
  entityId: string;
  assetId: string;
  entityType?: TEntityTypeDict;
}): Promise<TElectrodeLocationsDictionarySummary> {
  const response = await downloadAsset({
    ctx,
    entityType,
    entityId,
    id: assetId,
    asRawResponse: true,
  });
  return (await response.json()) as TElectrodeLocationsDictionarySummary;
}
