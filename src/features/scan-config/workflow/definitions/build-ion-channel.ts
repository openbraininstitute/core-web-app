import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { IonChannelBuildCampaign } from '@/entity-configuration/domain/model/ion-channel-build-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/**
 * Ion channel build, from obi-one's `IonChannelFittingScanConfig`: obi-one generates the
 * `ion_channel_modeling__*` task configs, the small-scale simulator fits each one.
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
      return await IonChannelBuildCampaign.api.query.resolve!({ id, context });
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
