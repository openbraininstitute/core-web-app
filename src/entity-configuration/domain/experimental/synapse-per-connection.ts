import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';
import {
  getExperimentalSynapsesPerConnections,
  getExperimentalSynapsesPerConnection,
} from '@/api/entitycore/queries/experimental/synapses-per-connection';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const SynapsePerConnection: EntityCoreTypeConfig<IExperimentalSynapsesPerConnection> = {
  group: 'experimental',
  title: 'Synapse per connection',
  legacyType: DataType.ExperimentalSynapsePerConnection,
  type: EntityTypeEnum.ExperimentalSynapsesPerConnection,
  slug: EntitySlug.ExperimentalSynapsesPerConnection,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getExperimentalSynapsesPerConnections,
      one: getExperimentalSynapsesPerConnection,
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
