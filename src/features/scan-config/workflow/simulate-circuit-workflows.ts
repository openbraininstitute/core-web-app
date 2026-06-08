import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { simulateMEModelWithSynapsesCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-me-model-with-synapses-circuit';
import { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
import { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
import { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
import { simulateSingleNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-single-neuron-circuit';
import { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
import { simulateWholeBrainCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-whole-brain-circuit';

import type { TCircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';

/** model types browsed before simulate configure (matches `SimulateWorkflows` source types) */
export const SIMULATE_CIRCUIT_SOURCE_TYPES = [
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  ExtendedEntitiesTypeDict.SmallMicrocircuit,
  ExtendedEntitiesTypeDict.Microcircuit,
  ExtendedEntitiesTypeDict.BrainRegion,
  ExtendedEntitiesTypeDict.MEModelWithSynapses,
  ExtendedEntitiesTypeDict.WholeBrain,
] as const;

export type TSimulateCircuitSourceType = (typeof SIMULATE_CIRCUIT_SOURCE_TYPES)[number];

export const simulateCircuitWorkflowBySourceType = {
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: simulateSingleNeuronCircuitWorkflow,
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: simulatePairedNeuronCircuitWorkflow,
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: simulateSmallMicrocircuitWorkflow,
  [ExtendedEntitiesTypeDict.Microcircuit]: simulateMicrocircuitWorkflow,
  [ExtendedEntitiesTypeDict.BrainRegion]: simulateRegionCircuitWorkflow,
  [ExtendedEntitiesTypeDict.MEModelWithSynapses]: simulateMEModelWithSynapsesCircuitWorkflow,
  [ExtendedEntitiesTypeDict.WholeBrain]: simulateWholeBrainCircuitWorkflow,
} as const satisfies Record<TSimulateCircuitSourceType, TScanConfigWorkflowDefinition>;

export function isSimulateCircuitSourceType(
  sourceType: TExtendedEntitiesTypeDict
): sourceType is TSimulateCircuitSourceType {
  return sourceType in simulateCircuitWorkflowBySourceType;
}

export function getSimulateCircuitWorkflow(
  sourceType: TExtendedEntitiesTypeDict
): TScanConfigWorkflowDefinition | null {
  if (!isSimulateCircuitSourceType(sourceType)) {
    return null;
  }

  return simulateCircuitWorkflowBySourceType[sourceType];
}

/**
 * Maps a base `Circuit` entity's `scale` to its simulate-workflow `dataType`. Used when the user
 * lands on the base `/data/view/circuit/{id}` detail page (which doesn't carry a scale-specific
 * extended type) and triggers Simulate.
 */
export function getSimulateCircuitSourceTypeByScale(
  scale: TCircuitScaleDictionary
): TSimulateCircuitSourceType | null {
  switch (scale) {
    case CircuitScaleDictionary.Single:
      return ExtendedEntitiesTypeDict.MEModelWithSynapses;
    case CircuitScaleDictionary.PairNeuron:
      return ExtendedEntitiesTypeDict.PairedNeuronCircuit;
    case CircuitScaleDictionary.SmallMicrocircuit:
      return ExtendedEntitiesTypeDict.SmallMicrocircuit;
    case CircuitScaleDictionary.Microcircuit:
      return ExtendedEntitiesTypeDict.Microcircuit;
    case CircuitScaleDictionary.Region:
      return ExtendedEntitiesTypeDict.BrainRegion;
    case CircuitScaleDictionary.WholeBrain:
      return ExtendedEntitiesTypeDict.WholeBrain;
    default:
      return null;
  }
}
