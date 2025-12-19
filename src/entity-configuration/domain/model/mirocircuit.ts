import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

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
          filters: {
            ...params[0].filters,
            scale__in: [CircuitScaleDictionary.Microcircuit],
          },
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
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.Analysis,
    DetailViewSectionsDict.RelatedPublications,
    DetailViewSectionsDict.RelatedArtifacts,
  ],

  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
