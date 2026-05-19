import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity, SchemaMappingKeyDict } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { scanConfigEntityQueries } from '@/features/scan-config/workflow/entity-queries';

export const simulateCircuitWorkflow = defineScanConfigWorkflow({
  id: 'simulate-circuit',
  activity: ScanConfigActivity.Simulate,
  entity: {
    mode: 'route-id',
    query: scanConfigEntityQueries.circuit,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  editor: {
    schemaMappingKey: SchemaMappingKeyDict.Circuit,
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
