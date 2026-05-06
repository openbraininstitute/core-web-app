import { keyBy } from 'es-toolkit/compat';

import { getMEModel, getMEModels } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createSimulationCampaign,
  getSimulationCampaign,
  getSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import {
  type ICircuitSimulationCampaign,
  type ISimulationCampaignFilter,
  SimulationCampaignEntityTypeDict,
} from '@/api/entitycore/types/entities/simulation-campaign';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import { count, rows as listSimulationRows } from './simulation-campaign';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

const ENTITY_TYPE = SimulationCampaignEntityTypeDict.Memodel;

async function list({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ISimulationCampaignFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);
  const source = await getSimulationCampaigns({
    context,
    withFacets,
    filters: { ...filters, entity__type: ENTITY_TYPE },
  });

  const memodels = await getMEModels({
    context,
    filters: { id__in: source.data.map((l) => l.entity_id) },
  });
  const memodelMap = keyBy(memodels.data, 'id');
  const result = source.data.map((entity) => ({
    ...entity,
    circuit: memodelMap[entity.entity_id] || null,
  }));

  return {
    data: result,
    pagination: source.pagination,
    facets: source.facets,
  };
}

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
  let entity: IMEModel | null = null;

  if (simulation?.entity_id && populate.includes('entity')) {
    entity = await getMEModel({ id: simulation?.entity_id, context });
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

export const MEModelCircuitSimulation: EntityCoreTypeConfig<
  ICircuitSimulationCampaign,
  TResolvedSimulationByCampaign,
  TResolvedSimulationByCampaigns
> = {
  group: EntityTypeGroup.Simulations,
  title: 'Single neuron (beta)',
  extendedType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  discriminator: { key: 'entity__type', value: [ENTITY_TYPE] },
  type: EntityTypeDict.SimulationCampaign,
  slug: EntitySlug.MEModelCircuitSimulation,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: count({ entity__type: ENTITY_TYPE }),
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
