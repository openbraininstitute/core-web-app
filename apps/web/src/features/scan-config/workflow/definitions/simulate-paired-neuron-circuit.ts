import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulatePairedNeuronCircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-paired-neuron-circuit',
  resolve: resolveSimulationByCampaignId,
});
