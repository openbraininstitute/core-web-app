import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateSmallMicrocircuitWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-small-microcircuit',
  resolve: resolveSimulationByCampaignId,
});
