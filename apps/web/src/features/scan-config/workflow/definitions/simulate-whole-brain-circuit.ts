import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/whole-brain-circuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateWholeBrainCircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-whole-brain-circuit',
  resolve: resolveSimulationByCampaignId,
});
