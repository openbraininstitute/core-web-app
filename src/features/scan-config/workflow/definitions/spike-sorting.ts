import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ObiOneTaskTypeDict, type TObiOneTaskType } from '@/api/one/types/task';
import {
  AindEphysPreprocessingCampaign,
  AindEphysSpikeSortingKilosort4Campaign,
  AindEphysSpikeSortingLupinCampaign,
  AindEphysSpikeSortingSpykingCircus2Campaign,
} from '@/entity-configuration/domain/extraction/aind-ephys-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity, SpikeSortingScanConfigTabs } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

const editor = {
  campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
  defaultTab: {
    __activity: ScanConfigActivity.SpikeSorting,
    id: SpikeSortingScanConfigTabs.configuration,
  },
} as const;

export const spikeSortingPreprocessingWorkflow = defineScanConfigWorkflow({
  id: 'spike-sorting-preprocessing',
  activity: ScanConfigActivity.SpikeSorting,
  entity: {
    mode: ScanConfigEntitySourceMode.Session,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: resolve is defined on this domain config
      return await AindEphysPreprocessingCampaign.api.query.resolve!({ id, context });
    },
  },
  editor,
  taskTypeBindings: {
    obiOne: ObiOneTaskTypeDict.AindEphysPreprocessing,
    configGeneration: TaskActivityType.AindEphysPreprocessingConfigGeneration,
    execution: TaskActivityType.AindEphysPreprocessingExecution,
    config: TaskConfigType.AindEphysPreprocessingConfig,
  },
});

function defineSorterWorkflow({
  id,
  campaign,
  obiOne,
}: {
  id: string;
  campaign: typeof AindEphysSpikeSortingSpykingCircus2Campaign;
  obiOne: TObiOneTaskType;
}) {
  return defineScanConfigWorkflow({
    id,
    activity: ScanConfigActivity.SpikeSorting,
    entity: {
      // the preprocessing result is picked in the editor's task result selector
      mode: ScanConfigEntitySourceMode.Session,
      picksEntitiesInEditor: true,
    },
    campaign: {
      resolve: async (args) => {
        // biome-ignore lint/style/noNonNullAssertion: resolve is defined on this domain config
        return await campaign.api.query.resolve!(args);
      },
      formTypeNamesWorkflow: true,
    },
    editor,
    taskTypeBindings: {
      obiOne,
      configGeneration: TaskActivityType.AindEphysSpikeSortingConfigGeneration,
      execution: TaskActivityType.AindEphysSpikeSortingExecution,
      config: TaskConfigType.AindEphysSpikeSortingConfig,
    },
  });
}

export const spikeSortingSpykingCircus2Workflow = defineSorterWorkflow({
  id: 'spike-sorting-spykingcircus2',
  campaign: AindEphysSpikeSortingSpykingCircus2Campaign,
  obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingSpykingCircus2,
});

export const spikeSortingKilosort4Workflow = defineSorterWorkflow({
  id: 'spike-sorting-kilosort4',
  campaign: AindEphysSpikeSortingKilosort4Campaign,
  obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingKilosort4,
});

export const spikeSortingLupinWorkflow = defineSorterWorkflow({
  id: 'spike-sorting-lupin',
  campaign: AindEphysSpikeSortingLupinCampaign,
  obiOne: ObiOneTaskTypeDict.AindEphysSpikeSortingLupin,
});
