import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

import type { TCampaignResolver } from '@/features/scan-config/workflow/types';

export function defineSimulateCircuitScanConfigWorkflow({
  id,
  resolve,
}: {
  id: string;
  resolve: TCampaignResolver;
}) {
  return defineScanConfigWorkflow({
    id,
    activity: ScanConfigActivity.Simulate,
    entity: {
      mode: ScanConfigEntitySourceMode.Session,
    },
    campaign: { resolve },
    editor: {
      campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
      className: 'px-4',
    },
    taskTypeBindings: ({ entity }) => ({
      obiOne:
        entity && 'target_simulator' in entity && entity.target_simulator === 'Brian2'
          ? ObiOneTaskTypeDict.CircuitSimulationBrian2
          : ObiOneTaskTypeDict.CircuitSimulation,
      configGeneration: TaskActivityType.CircuitSimulationConfigGeneration,
      execution: TaskActivityType.CircuitSimulationExecution,
      config: TaskConfigType.CircuitSimulationConfig,
    }),
  });
}

export { buildEmSynapseMappingWorkflow } from '@/features/scan-config/workflow/definitions/build-em-synapse-mapping';
export { createExtracellularRecordingArrayWorkflow } from '@/features/scan-config/workflow/definitions/create-extracellular-recording-array';
export { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';
export { extractEFeaturesWorkflow } from '@/features/scan-config/workflow/definitions/extract-efeatures';
export { processEmCellMeshWorkflow } from '@/features/scan-config/workflow/definitions/process-em-cell-mesh';
export { simulateIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/simulate-ion-channel';
export { simulateMEModelWithSynapsesCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-me-model-with-synapses-circuit';
export { simulateMemodelCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-memodel-circuit';
export { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
export { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
export { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
export { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
export { simulateWholeBrainCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-whole-brain-circuit';
