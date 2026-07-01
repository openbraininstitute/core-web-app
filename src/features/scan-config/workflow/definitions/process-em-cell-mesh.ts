import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const processEmCellMeshWorkflow = defineScanConfigWorkflow({
  id: 'process-em-cell-mesh',
  activity: ScanConfigActivity.Process,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      return await SkeletonizationCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.Skeletonization,
    configGeneration: TaskActivityType.SkeletonizationConfigGeneration,
    execution: TaskActivityType.SkeletonizationExecution,
    config: TaskConfigType.SkeletonizationConfig,
  },
});
