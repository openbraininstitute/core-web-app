import { includes, isArray, without } from 'es-toolkit/compat';

import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ICircuit,
  ICircuitFilter,
  TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const circuitScaleFilter = {
  scale__in: without(Object.values(CircuitScaleDictionary), CircuitScaleDictionary.Single),
};

function narrowFilters(filters?: ICircuitFilter) {
  const safeFilters = filters;
  const selectedScaleIn = isArray(safeFilters?.scale__in)
    ? (safeFilters?.scale__in as TCircuitScaleDictionary[])
    : [];

  return {
    ...safeFilters,
    scale__in: without(
      selectedScaleIn.length > 0 ? selectedScaleIn : circuitScaleFilter.scale__in,
      CircuitScaleDictionary.Single
    ),
  };
}

export const Circuit: EntityCoreTypeConfig<ICircuit> = {
  group: EntityTypeGroup.Models,
  title: 'Circuit',
  extendedType: ExtendedEntitiesTypeDict.Circuit,
  type: EntityTypeDict.Circuit,
  slug: EntitySlug.Circuit,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: circuitScaleFilter,
    },
    query: {
      list: (...params) => {
        const mergedFilters = narrowFilters(params[0].filters);
        return getCircuits({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: mergedFilters,
          // Needed for the "Derivation type" column (issue #517): load each circuit's
          // incoming derivations so the column can show how the circuit was derived.
          expand: 'generated_from_derivations',
        });
      },
      one: getCircuit,
    },
  },
  asset: { extension: 'application/json' },
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.Analysis,
    DetailViewSectionsDict.RelatedPublications,
    DetailViewSectionsDict.RelatedArtifacts,
  ],
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: (entity: ICircuit) =>
    // LearningEngine (INAIT) circuits are simulatable regardless of biophysical models.
    entity.target_simulator === 'LearningEngine' ||
    (entity.has_electrical_cell_models &&
      includes(
        [
          CircuitScaleDictionary.Single,
          CircuitScaleDictionary.PairNeuron,
          CircuitScaleDictionary.SmallMicrocircuit,
          CircuitScaleDictionary.Microcircuit,
          CircuitScaleDictionary.Region,
          CircuitScaleDictionary.WholeBrain,
        ],
        entity.scale
      )),
} as const;
