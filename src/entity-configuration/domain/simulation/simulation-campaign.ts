import keyBy from 'lodash/keyBy';

import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import {
  createSimulationCampaign,
  getSimulationCampaign,
  getSimulationCampaigns,
} from '@/api/entitycore/queries/simulation/campaign';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type {
  ISimulationCampaign,
  ISimulationCampaignFilter,
} from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';
import { getCircuits } from '@/api/entitycore/queries/model/circuit';
import {
  transformFiltersToQuery,
  transformQueryParamsArrayToString,
} from '@/api/entitycore/transformers';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';

export async function resolveSimulationCampaign({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<ISimulationCampaignFilter>;
}) {
  const source = await getSimulationCampaigns({ context, withFacets, filters });
  const circuits = await getCircuits({
    context,
    filters: {
      ...transformQueryParamsArrayToString(
        transformFiltersToQuery([
          {
            constraint: 'id__in',
            field: EntityCoreFields.ID,
            type: CoreFieldFilterTypeEnum.WithinList,
            value: source.data.map((l) => l.entity_id),
          },
        ])
      ),
    },
  });
  const circuitMap = keyBy(circuits.data, 'id');
  const result = source.data.map((entity) => ({
    ...entity,
    circuit: circuitMap[entity.entity_id] || null,
  }));

  return {
    data: result,
    pagination: source.pagination,
    facets: source.facets,
  };
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
