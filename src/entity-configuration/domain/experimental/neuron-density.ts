import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getExperimentalNeuronDensities,
  getExperimentalNeuronDensity,
} from '@/api/entitycore/queries/experimental/neuron-density';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const NeuronDensity: EntityCoreTypeConfig<IExperimentalNeuronDensity> = {
  group: 'experimental',
  title: 'Neuron density',
  legacyType: DataType.ExperimentalNeuronDensity,
  type: EntityTypeEnum.ExperimentalNeuronDensity,
  slug: EntitySlug.ExperimentalNeuronDensity,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getExperimentalNeuronDensities,
      one: getExperimentalNeuronDensity,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
