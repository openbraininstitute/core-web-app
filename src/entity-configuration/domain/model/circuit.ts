import { includes, without } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ICircuit, TCircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const circuitScaleFilter = {
  scale__in: without(Object.values(CircuitScaleDictionary), CircuitScaleDictionary.Single),
};

export const Circuit: EntityCoreTypeConfig<ICircuit> = {
  group: EntityTypeGroup.Models,
  title: 'Circuit',
  extendedType: ExtendedEntitiesTypeDict.Circuit,
  type: EntityTypeDict.Circuit,
  slug: EntitySlug.Circuit,
  api: {
    config: { allowedFacets: true },
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
  isSimulatable: (scale: TCircuitScaleDictionary) =>
    includes([CircuitScaleDictionary.SmallMicrocircuit, CircuitScaleDictionary.PairNeuron], scale),
} as const;
