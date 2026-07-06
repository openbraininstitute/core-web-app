import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { ExtracellularRecordingArrayCampaign } from '@/entity-configuration/domain/model/extracellular-recording-array-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const createExtracellularRecordingArrayWorkflow = defineScanConfigWorkflow({
  id: 'create-extracellular-recording-array',
  activity: ScanConfigActivity.Build,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
      return await ExtracellularRecordingArrayCampaign.api.query.resolve!({ id, context });
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.ExtracellularRecordingWeightsCalculation,
    configGeneration: TaskActivityType.ExtracellularRecordingWeightsCalculationConfigGeneration,
    execution: TaskActivityType.ExtracellularRecordingWeightsCalculationExecution,
    config: TaskConfigType.ExtracellularRecordingWeightsCalculationConfig,
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
