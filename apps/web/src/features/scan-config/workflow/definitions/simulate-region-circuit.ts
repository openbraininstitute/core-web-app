import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/region-circuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateRegionCircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-region-circuit',
  resolve: resolveSimulationByCampaignId,
});
