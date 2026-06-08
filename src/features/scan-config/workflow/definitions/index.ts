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
  });
}

export { buildEmSynapseMappingWorkflow } from '@/features/scan-config/workflow/definitions/build-em-synapse-mapping';
export { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';
export { processEmCellMeshWorkflow } from '@/features/scan-config/workflow/definitions/process-em-cell-mesh';
export { simulateIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/simulate-ion-channel';
export { simulateMEModelWithSynapsesCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-me-model-with-synapses-circuit';
export { simulateMemodelCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-memodel-circuit';
export { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
export { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
export { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
export { simulateSingleNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-single-neuron-circuit';
export { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
export { simulateWholeBrainCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-whole-brain-circuit';
