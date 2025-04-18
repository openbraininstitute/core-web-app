import { DataType } from '@/constants/explore-section/list-views';
import { EntityType } from '@/entity-configuration/domain/types';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const SynapsePerConnection: EntityCoreTypeConfig<IExperimentalSynapsesPerConnection> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalSynapsePerConnection,
  type: EntityType.ExperimentalSynapsesPerConnection,
  slug: 'synapse-per-connection',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: entitycore.getExperimentalSynapsesPerConnections,
      one: entitycore.getExperimentalSynapsesPerConnection,
    },
  },
  explore: {
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
