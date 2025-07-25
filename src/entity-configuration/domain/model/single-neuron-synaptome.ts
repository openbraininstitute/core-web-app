import {
  getSingleNeuronSynaptome,
  getSingleNeuronSynaptomes,
  createSingleNeuronSynaptome,
  getSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { getMEModel } from '@/api/entitycore/queries';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export const apiQueryExpand = {
  memodel: (source: ISingleNeuronSynaptome, context: WorkspaceContext | undefined) =>
    getMEModel({ id: source.me_model.id, context }),
  config: (source: ISingleNeuronSynaptome, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptomeConfiguration(source, context),
};

export const SingleNeuronSynaptome: EntityCoreTypeConfig<ISingleNeuronSynaptome> = {
  group: 'models',
  title: 'Synaptome',
  legacyType: DataType.SingleNeuronSynaptome,
  type: EntityTypeEnum.SingleNeuronSynaptome,
  slug: EntitySlug.SingleNeuronSynaptome,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getSingleNeuronSynaptomes,
      one: getSingleNeuronSynaptome,
      create: createSingleNeuronSynaptome,
    },
    expand: apiQueryExpand,
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
    configfile: AssetLabel.single_neuron_synaptome_config,
  },
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: true,
} as const;
