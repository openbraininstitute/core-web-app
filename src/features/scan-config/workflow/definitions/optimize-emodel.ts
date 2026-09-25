import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { EModelOptimizationCampaign } from '@/entity-configuration/domain/optimization/emodel-optimization-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { OptimizeScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const optimizeEModelWorkflow = defineScanConfigWorkflow({
  id: 'optimize-emodel',
  activity: ScanConfigActivity.Optimize,
  entity: {
    // the e-model optimization scan-config has no `model_identifier` field, so configure
    // opens on an empty session with nothing pre-selected
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on this domain config
      return await EModelOptimizationCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Optimize,
      id: OptimizeScanConfigTabs.configuration,
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.EModelOptimization,
    configGeneration: TaskActivityType.EModelOptimizationConfigGeneration,
    execution: TaskActivityType.EModelOptimizationExecution,
    config: TaskConfigType.EModelOptimizationConfig,
  },
});
