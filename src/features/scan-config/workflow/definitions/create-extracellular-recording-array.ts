import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/**
 * Build workflow that creates an extracellular recording array from a circuit, via the obi-one
 * `create-extracellular-recording-array-scan-config-generate-grid` endpoint.
 *
 * NOTE: the obi-one "create recording array" task has no dedicated entitycore TaskConfig campaign
 * type (unlike EM synapse mapping), so there is no saved campaign config to resolve back into the
 * editor yet. `campaign.resolve` therefore returns `null` — the create flow (browse → configure →
 * generate) works fully; re-opening a generated campaign's saved config is pending backend
 * confirmation of what the generate-grid endpoint returns. See the plan's open backend item.
 */
export const createExtracellularRecordingArrayWorkflow = defineScanConfigWorkflow({
  id: 'create-extracellular-recording-array',
  activity: ScanConfigActivity.Build,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async () => null,
  },
  // The scan generation runs the local-only `create_extracellular_recording_array` obi-one task;
  // launching/executing the generated configs uses the launchable
  // `extracellular_recording_weights_calculation` task, which is also the entitycore task family
  // (there is no dedicated `create_extracellular_recording_array` entitycore task type).
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
