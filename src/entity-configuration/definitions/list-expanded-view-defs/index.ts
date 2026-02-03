import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  memodelCircuitSimulationExpandedViewConfig,
  microcircuitSimulationExpandedViewConfig,
  pairedNeuronsCircuitSimulationExpandedViewConfig,
  singleNeuronCircuitSimulationExpandedViewConfig,
  smallMicrocircuitSimulationExpandedViewConfig,
} from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';

import type { ListExpandedViewRegistry } from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export * from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';
export * from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export const listExpandedViewRegistry: ListExpandedViewRegistry = {
  [ExtendedEntitiesTypeDict.MemodelCircuitSimulation]: memodelCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.MicrocircuitSimulation]: microcircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]:
    pairedNeuronsCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation]:
    singleNeuronCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]:
    smallMicrocircuitSimulationExpandedViewConfig,
};
