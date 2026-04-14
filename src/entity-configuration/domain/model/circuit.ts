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
  description:
    'A neuronal network of interconnected neurons that work together to process information and generate specific outputs or behaviors. Circuits in the data base are in [SONATA format](https://sonata-extension.readthedocs.io/en/latest/). This is a representation of a neuronal network as a directed multi-graph, where nodes correspond to brain cells (neurons or virtual input sources) and edges represent their connections (such as synapses or other forms of contact). Where multiple synapses exist between neurons, they are represented as multiple edges. Nodes and edges are organized into populations for convenience, and can be described with extensive, user-defined attributes. The entire circuit, including its structure, cell and synapse properties, is encoded using standardized, efficient file formats (CSV, HDF5, and JSON) to support large-scale, reproducible computational modeling and simulation of brain networks. We categorize circuits into different types:\\n**Whole brain (whole_brain)**: Circuit representing an entire brain.\\n**Brain region (region)**: Atlas-based continuous volume of an entire brain region or a set of continuous sub-regions.\\n**System (system)**: Non-continuous circuit consisting of at least two microcircuits or regions that are connected by inter-region connectivity.\\n**Microcircuit (microcircuit)**: Any circuit larger than 20 neurons but not being a region, system, or whole-brain circuit.\\n**Small microcircuit (small)**: Circuit with 3-20 neurons together with synapses coming from inside and outside its volume (usually called intrinsic and extrinsic synapses respectively).',
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
  isSimulatable: (scale: TCircuitScaleDictionary) =>
    includes([CircuitScaleDictionary.SmallMicrocircuit, CircuitScaleDictionary.PairNeuron], scale),
  isContributable: true,
  isSingleContributeSupport: false,
  isMultipleContributeSupport: false,
} as const;
