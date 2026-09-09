import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { IonChannelModelingCampaign } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/**
 * Ion channel build through the generic scan-config editor, from obi-one's
 * `IonChannelFittingBetaScanConfig`.
 *
 * Runs alongside the bespoke RJSF build page, which stays on
 * `IonChannelFittingScanConfig`; the two produce the same `IonChannelModelingCampaign`
 * entity, so this one is keyed on a target type of its own to get its own route.
 */
export const buildIonChannelBetaWorkflow = defineScanConfigWorkflow({
  id: 'build-ion-channel-beta',
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
    obiOne: ObiOneTaskTypeDict.IonChannelFittingBeta,
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
