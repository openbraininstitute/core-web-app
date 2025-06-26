import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import {
  createSimulationCampaign,
  getSimulationCampaign,
  getSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/campaign';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { ISimulationCampaign } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

export async function resolveSimulationCampaign(context: WorkspaceContext | undefined) {
  const source = await getSimulationCampaigns({ context });
  return source;
}

export const SimulationCampaign: EntityCoreTypeConfig<ISimulationCampaign> = {
  group: 'simulations',
  title: 'Simulation Campaign',
  legacyType: DataType.SimulationCampaign,
  type: EntityTypeEnum.SimulationCampaign,
  slug: EntitySlug.SimulationCampaign,
  isBookmarkable: true,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: resolveSimulationCampaign,
      one: getSimulationCampaign,
      create: createSimulationCampaign,
    },
  },
  explore: {
    basePrefix: 'simulate',
    routePrefix: 'simulate',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
