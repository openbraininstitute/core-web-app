import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ionChannelSimulationExpandedViewConfig,
  memodelCircuitSimulationExpandedViewConfig,
  microcircuitSimulationExpandedViewConfig,
  pairedNeuronsCircuitSimulationExpandedViewConfig,
  regionCircuitSimulationExpandedViewConfig,
  singleNeuronCircuitSimulationExpandedViewConfig,
  smallMicrocircuitSimulationExpandedViewConfig,
  wholeBrainCircuitSimulationExpandedViewConfig,
} from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';
import { TaskViewConfig } from '@/features/task-runner/expanded-view';

import { skeletonizationCampaignExpandedViewConfig } from './processing';

import type { ListExpandedViewRegistry } from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export * from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';
export * from '@/entity-configuration/definitions/list-expanded-view-defs/types';

export const listExpandedViewRegistry: ListExpandedViewRegistry = {
  [ExtendedEntitiesTypeDict.CircuitExtractionCampaign]: TaskViewConfig,
  [ExtendedEntitiesTypeDict.MemodelCircuitSimulation]: memodelCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.MicrocircuitSimulation]: microcircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]:
    pairedNeuronsCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation]:
    singleNeuronCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]:
    smallMicrocircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.SkeletonizationCampaign]: skeletonizationCampaignExpandedViewConfig,
  [ExtendedEntitiesTypeDict.IonChannelModelSimulation]: ionChannelSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.RegionCircuitSimulation]: regionCircuitSimulationExpandedViewConfig,
  [ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation]:
    wholeBrainCircuitSimulationExpandedViewConfig,
};
