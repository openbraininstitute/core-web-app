import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { BuildSynaptomeCampaign } from '@/entity-configuration/domain/model/build-synaptome-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

/**
 * Configure route for obi-one's `BuildSynaptomeScanConfig` (form groups: Info, ME-model,
 * Synaptic physiology, Synapse groups).
 *
 * `taskTypeBindings` reference placeholder entitycore/obi-one task types: obi-one currently
 * ships the ScanConfig only (no campaign task-config type, no launchable task), so the results
 * tab has nothing to poll until that lands. The workflow is gated by `buildSynaptomeFlag`.
 */
export const buildSynaptomeWorkflow = defineScanConfigWorkflow({
  id: 'build-synaptome',
  activity: ScanConfigActivity.Build,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
      return await BuildSynaptomeCampaign.api.query.resolve!({ id, context });
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.BuildSynaptome,
    configGeneration: TaskActivityType.BuildSynaptomeConfigGeneration,
    execution: TaskActivityType.BuildSynaptomeExecution,
    config: TaskConfigType.BuildSynaptomeConfig,
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
