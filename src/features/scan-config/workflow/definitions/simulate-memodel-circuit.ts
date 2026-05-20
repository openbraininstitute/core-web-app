import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { scanConfigEntityQueries } from '@/features/scan-config/workflow/entity-queries';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const simulateMemodelCircuitWorkflow = defineScanConfigWorkflow({
  id: 'simulate-memodel-circuit',
  activity: ScanConfigActivity.Simulate,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
    query: scanConfigEntityQueries.meModel,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  editor: {
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
