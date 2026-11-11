import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateMEModelWithSynapsesCircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-me-model-with-synapses-circuit',
  resolve: resolveSimulationByCampaignId,
});
