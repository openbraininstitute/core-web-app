import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/single-neuron-circuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateSingleNeuronCircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-single-neuron-circuit',
  resolve: resolveSimulationByCampaignId,
});
