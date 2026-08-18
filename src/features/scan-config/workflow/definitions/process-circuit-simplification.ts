import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { CircuitSimplificationCampaign } from '@/entity-configuration/domain/processing/circuit-simplification-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ProcessScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const processCircuitSimplificationWorkflow = defineScanConfigWorkflow({
  id: 'process-circuit-simplification',
  activity: ScanConfigActivity.Process,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      return await CircuitSimplificationCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Process,
      id: ProcessScanConfigTabs.configuration,
    },
  },
  i18n: {
    resultsTab: 'simplifications',
    generate: 'Generate simplification(s)',
    new: 'New circuit simplification campaign',
    copyCampaignId: 'Copy circuit simplification campaign ID',
    launch: 'Launch simplifications',
    workflowLabel: 'simplifications',
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.CircuitSimplification,
    configGeneration: TaskActivityType.CircuitSimplificationConfigGeneration,
    execution: TaskActivityType.CircuitSimplificationExecution,
    config: TaskConfigType.CircuitSimplificationConfig,
  },
});
