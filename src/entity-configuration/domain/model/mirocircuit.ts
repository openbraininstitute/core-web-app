import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';

export const Microcircuit: EntityCoreTypeConfig<ICircuit> = {
  group: EntityTypeGroup.Models,
  title: 'Microcircuit',
  extendedType: ExtendedEntitiesTypeDict.Microcircuit,
  type: EntityTypeDict.Circuit,
  slug: EntitySlug.Microcircuit,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (...params) =>
        getCircuits({
          ...params,
          filters: { ...params[0].filters, scale__in: [CircuitScaleDictionary.Microcircuit] },
        }),
      one: getCircuit,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: ['overview', 'analysis', 'related-publications', 'related-artifacts'],
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
