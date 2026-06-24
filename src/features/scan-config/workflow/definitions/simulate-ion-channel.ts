import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const simulateIonChannelWorkflow = defineScanConfigWorkflow({
  id: 'simulate-ion-channel-model',
  activity: ScanConfigActivity.Simulate,
  entity: {
    mode: ScanConfigEntitySourceMode.StaticType,
    entityType: ExtendedEntitiesTypeDict.IonChannelModel,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  editor: {
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
