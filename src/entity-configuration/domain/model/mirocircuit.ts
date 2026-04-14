import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const circuitScaleFilter = {
  scale__in: [CircuitScaleDictionary.Microcircuit],
};
export const Microcircuit: EntityCoreTypeConfig<ICircuit> = {
  group: EntityTypeGroup.Models,
  title: 'Microcircuit',
  extendedType: ExtendedEntitiesTypeDict.Microcircuit,
  type: EntityTypeDict.Circuit,
  slug: EntitySlug.Microcircuit,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: (...params) => {
        return getCircuits({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: {
            ...circuitScaleFilter,
            ...params[0].filters,
          },
        });
      },
      one: getCircuit,
    },
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
  isContributable: false,
  isSingleContributeSupport: false,
  isMultipleContributeSupport: false,
} as const;
