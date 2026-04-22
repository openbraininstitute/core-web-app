import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import {
  createSingleNeuronSimulation,
  getSingleNeuronSimulation,
  getSingleNeuronSimulationIOResult,
  getSingleNeuronSimulations,
} from '@/api/entitycore/queries/simulation/single-neuron-simulation';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ISingleNeuronSimulation } from '@/api/entitycore/types';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export const singleNeuronSimulationApiQueryExpand = {
  memodel: (source: ISingleNeuronSimulation, context: WorkspaceContext | undefined) =>
    getMEModel({ id: source.me_model.id, context }),
  config: (source: ISingleNeuronSimulation, context: WorkspaceContext | undefined) => {
    return getSingleNeuronSimulationIOResult(source, context);
  },
};

export async function resolveSingleNeuronSimulation(
  id: string,
  context: WorkspaceContext | undefined
) {
  const source = await getSingleNeuronSimulation({ id, context });
  const memodel = await singleNeuronSimulationApiQueryExpand.memodel(source, context);

  return { source, memodel };
}

export const SingleNeuronSimulation: EntityCoreTypeConfig<ISingleNeuronSimulation> = {
  group: EntityTypeGroup.Simulations,
  title: 'Single neuron',
  extendedType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  type: EntityTypeDict.SingleNeuronSimulation,
  slug: EntitySlug.SingleNeuronSimulation,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      count: (...params) => {
        const filters = discardBrainRegionQueryParams(params[0].filters);
        return getSingleNeuronSimulations({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: {
            ...filters,
            page: 1,
            page_size: 1,
          },
        }).then((response) => response.pagination.total_items);
      },
      list: getSingleNeuronSimulations,
      one: getSingleNeuronSimulation,
      create: createSingleNeuronSimulation,
    },
    expand: singleNeuronSimulationApiQueryExpand,
  },
  asset: {
    extension: 'application/json',
    configfile: AssetLabel.single_neuron_simulation_data,
  },
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.Configuration,
    DetailViewSectionsDict.Results,
  ],
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
