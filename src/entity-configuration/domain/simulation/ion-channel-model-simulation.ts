import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createSimulationCampaign,
  getSimulationCampaign,
} from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import {
  type ICircuitSimulationCampaign,
  SimulationCampaignEntityTypeDict,
} from '@/api/entitycore/types/entities/simulation-campaign';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import { count, listByEntityType, rows as listSimulationRows } from './simulation-campaign';
import { migrateConfig } from './utils';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

const ENTITY_TYPE = SimulationCampaignEntityTypeDict.IonChannelModel;

const list = listByEntityType(ENTITY_TYPE);

export async function resolveSimulationByCampaignId({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | undefined | null;
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

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
    entityType: EntityTypeDict.SimulationCampaign,
    id: configAsset?.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  migrateConfig(config);

  return {
    campaign,
    simulation,
    config,
  };
}

export type TResolvedSimulationByCampaign = Awaited<
  ReturnType<typeof resolveSimulationByCampaignId>
>;
export type TResolvedSimulationByCampaigns = Awaited<ReturnType<typeof list>>;

export const IonChannelModelSimulation: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Ion channel (beta)',
  extendedType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.IonChannelModelSimulation,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: count({ entity__type: ENTITY_TYPE }),
      list,
      one: getSimulationCampaign,
      create: createSimulationCampaign,
      resolve: resolveSimulationByCampaignId,
    },
    expandRow: (record, context) => listSimulationRows({ id: record.id, context }),
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: false,
  isDownloadable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
