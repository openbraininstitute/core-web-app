import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { EFeatureExtractionCampaign } from '@/entity-configuration/domain/extraction/efeature-extraction-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ExtractScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const extractEFeaturesWorkflow = defineScanConfigWorkflow({
  id: 'extract-efeatures',
  activity: ScanConfigActivity.Extract,
  entity: {
    // recordings are picked in the editor's own browse widget, so configure opens on an
    // empty session instead of being routed through `/new` first
    mode: ScanConfigEntitySourceMode.Session,
    picksEntitiesInEditor: true,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      return await EFeatureExtractionCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Extract,
      id: ExtractScanConfigTabs.configuration,
    },
  },
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.EFeatureExtraction,
    configGeneration: TaskActivityType.EFeatureExtractionConfigGeneration,
    execution: TaskActivityType.EFeatureExtractionExecution,
    config: TaskConfigType.EFeatureExtractionConfig,
  },
});
