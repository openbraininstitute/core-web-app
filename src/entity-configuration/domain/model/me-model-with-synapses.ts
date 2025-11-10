import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const MEModelWithSynapsesCircuit: EntityCoreTypeConfig<ICircuit> = {
  group: EntityTypeGroup.Models,
  title: 'Synaptome (beta)',
  extendedType: ExtendedEntitiesTypeDict.MEModelWithSynapses,
  type: EntityTypeDict.Circuit,
  slug: EntitySlug.Circuit,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (...params) => {
        return getCircuits({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: { ...params[0].filters, scale__in: [CircuitScaleDictionary.Single] },
        });
      },
      one: getCircuit,
    },
  },
  explore: {
    basePrefix: 'model',
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.RelatedPublications,
    DetailViewSectionsDict.RelatedArtifacts,
  ],
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
