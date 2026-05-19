import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity, SchemaMappingKeyDict } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';

export const simulateIonChannelWorkflow = defineScanConfigWorkflow({
  id: 'simulate-ion-channel-model',
  activity: ScanConfigActivity.Simulate,
  entity: {
    mode: 'static-type',
    entityType: ExtendedEntitiesTypeDict.IonChannelModel,
  },
  campaign: {
    resolve: resolveSimulationByCampaignId,
  },
  editor: {
    schemaMappingKey: SchemaMappingKeyDict.IonChannelModel,
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    className: 'px-4',
  },
});
