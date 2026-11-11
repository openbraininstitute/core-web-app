import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/microcircuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateMicrocircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-microcircuit',
  resolve: resolveSimulationByCampaignId,
});
