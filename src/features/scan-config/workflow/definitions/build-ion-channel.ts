import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { IonChannelModelingCampaign } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/**
 * Ion channel build, from obi-one's `IonChannelFittingScanConfig`. Replaced the bespoke RJSF
 * build page, which rendered the same schema itself and submitted to the small-scale
 * simulator rather than to a generate-grid endpoint.
 */
export const buildIonChannelWorkflow = defineScanConfigWorkflow({
  id: 'build-ion-channel',
  activity: ScanConfigActivity.Build,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
      return await IonChannelModelingCampaign.api.query.resolve!({ id, context });
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.IonChannelFitting,
    configGeneration: TaskActivityType.IonChannelModelingConfigGeneration,
    execution: TaskActivityType.IonChannelModelingExecution,
    config: TaskConfigType.IonChannelModelingConfig,
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Build,
      id: BuildScanConfigTabs.configuration,
    },
  },
});
