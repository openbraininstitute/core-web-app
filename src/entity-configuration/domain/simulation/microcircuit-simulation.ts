import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import {
  createSimulationCampaign,
  getSimulationCampaign,
} from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import {
  count,
  listByScale,
  rows as listSimulationRows,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

const SCALE = CircuitScaleDictionary.Microcircuit;
const list = listByScale(SCALE);

export async function resolveSimulationByCampaignId({
  id,
  context,
  populate = ['entity', 'config'],
}: {
  id: string;
  context?: WorkspaceContext | null;
  populate?: Array<string>;
}) {
  const campaign = await getSimulationCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No campaign with id ${id} found`);
  }

  const source = await getSimulations({
    context,
    filters: { simulation_campaign_id: id },
  });

  const simulation = source.data.at(0);
  const assets = campaign?.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) throw Error('No campaign config asset found');

  let config = null;
  let entity: ICircuit | null = null;

  if (simulation?.entity_id && populate.includes('entity')) {
    entity = await getCircuit({ id: simulation?.entity_id, context });
  }

  if (populate.includes('config')) {
    const rawConfig = await downloadAsset({
      entityId: campaign.id,
      entityType: EntityTypeDict.SimulationCampaign,
      id: configAsset?.id,
      ctx: context,
      asRawResponse: true,
    });
    config = await rawConfig.json();
  }

  return {
    campaign,
    simulation,
    entity,
    config,
  };
}
type TResolvedSimulationByCampaign = Awaited<ReturnType<typeof resolveSimulationByCampaignId>>;
type TResolvedSimulationByCampaigns = Awaited<ReturnType<typeof list>>;

export const MicrocircuitSimulation: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Microcircuit (beta)',
  extendedType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  type: EntityTypeDict.SimulationCampaign,
  discriminator: { key: 'scale', value: [SCALE] },
  slug: EntitySlug.MicrocircuitSimulation,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: count({ circuit__scale: SCALE }),
      list,
      one: getSimulationCampaign,
      resolve: resolveSimulationByCampaignId,
      create: createSimulationCampaign,
    },
    expandRow: (record, context) => listSimulationRows({ id: record.id, context }),
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: true,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
