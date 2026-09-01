import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const simulateIonChannelWorkflow = defineScanConfigWorkflow({
  id: 'simulate-ion-channel-model',
  activity: ScanConfigActivity.Simulate,
  entity: {
    // the editor picks its own ion channel models, so configure opens on a session that may be
    // empty (hub entry) or carry the model from a detail page's Simulate action
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  editor: {
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
