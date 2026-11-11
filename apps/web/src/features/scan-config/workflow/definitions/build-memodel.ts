import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { MEModelBuildCampaign } from '@/entity-configuration/domain/model/memodel-build-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const buildMEModelWorkflow = defineScanConfigWorkflow({
  id: 'build-memodel',
  activity: ScanConfigActivity.Build,
  entity: {
    // the morphology and the e-model are both picked in the editor, so configure opens on an
    // empty session
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
      return await MEModelBuildCampaign.api.query.resolve!({ id, context });
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.MEModelBuild,
    configGeneration: TaskActivityType.MEModelBuildConfigGeneration,
    execution: TaskActivityType.MEModelBuildExecution,
    config: TaskConfigType.MEModelBuildConfig,
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
