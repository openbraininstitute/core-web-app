import {
  getSingleNeuronSynaptomeSimulationIOResult,
  createSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulations,
} from '@/api/entitycore/queries/simulation/single-neuron-synaptome-simulation';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { getMEModel } from '@/api/entitycore/queries/model/me-model';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type {
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

export const singleNeuronSynaptomeSimulationApiQueryExpand = {
  synaptome: (source: ISingleNeuronSynaptomeSimulation, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptome({ id: source.synaptome.id, context }),
  memodel: (
    _: ISingleNeuronSynaptomeSimulation,
    context: WorkspaceContext | undefined,
    synaptome: ISingleNeuronSynaptome
  ) => getMEModel({ id: synaptome.me_model.id, context }),
  config: (source: ISingleNeuronSynaptomeSimulation, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptomeSimulationIOResult(source, context),
};

export async function resolveSingleNeuronSynaptomeSimulation(
  id: string,
  context: WorkspaceContext | undefined
) {
  const source = await getSingleNeuronSynaptomeSimulation({ id, context });
  const synaptome = await singleNeuronSynaptomeSimulationApiQueryExpand.synaptome(source, context);
  const memodel = await singleNeuronSynaptomeSimulationApiQueryExpand.memodel(
    source,
    context,
    synaptome
  );

  return { source, synaptome, memodel };
}

export const SingleNeuronSynaptomeSimulation: EntityCoreTypeConfig<ISingleNeuronSynaptomeSimulation> =
  {
    group: 'simulations',
    title: 'Single Neuron Synaptome Simulation',
    legacyType: DataType.SingleNeuronSynaptomeSimulation,
    type: EntityTypeEnum.SingleNeuronSynaptomeSimulation,
    slug: EntitySlug.SingleNeuronSynaptomeSimulation,
    api: {
      config: {
        allowedFacets: true,
      },
      query: {
        list: getSingleNeuronSynaptomeSimulations,
        one: getSingleNeuronSynaptomeSimulation,
        create: createSingleNeuronSynaptomeSimulation,
      },
      expand: singleNeuronSynaptomeSimulationApiQueryExpand,
    },
    explore: {
      basePrefix: 'simulate',
      routePrefix: 'simulate',
    },
    asset: {
      extension: 'application/json',
      configfile: AssetLabel.single_neuron_synaptome_simulation_data,
    },
    isBookmarkable: true,
    isDownloadable: false,
    isCopyable: true,
    isSimulatable: false,
  } as const;
