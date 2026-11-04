import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import {
  spikeSortingKilosort4Workflow,
  spikeSortingLupinWorkflow,
  spikeSortingPreprocessingWorkflow,
  spikeSortingSpykingCircus2Workflow,
} from '@/features/scan-config/workflow/definitions/spike-sorting';

import {
  ScanConfigGeneratedApiPath,
  spikeSortingPreprocessingConfigureBinding,
  spikeSortingSorterConfigureBinding,
} from '../scan-config-binding';
import {
  WorkflowBrowseDefaults,
  WorkflowConfigureRoutingDict,
  WorkflowStagePresets,
} from '../types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { SchemaName } from '@/features/scan-config/types';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';
import type { IWorkflowDescriptor } from '../types';

/** one workflow per sorter: the input is a task result picked in the editor, so source = target */
function sorterWorkflow({
  campaignType,
  label,
  definition,
  schemaName,
  generatedApiPath,
}: {
  campaignType: TExtendedEntitiesTypeDict;
  label: string;
  definition: TScanConfigWorkflowDefinition;
  schemaName: SchemaName;
  generatedApiPath: string;
}): IWorkflowDescriptor {
  return {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfigInEditorSelection,
    sourceType: campaignType,
    targetType: campaignType,
    breadcrumb: { root: `Spike sorting: ${label}` },
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
    scanConfig: {
      definition,
      schemaName,
      configureBinding: spikeSortingSorterConfigureBinding(generatedApiPath),
    },
    label,
    disabled: false,
  };
}

export const SpikeSortingWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.ExtracellularRecording,
    targetType: ExtendedEntitiesTypeDict.AindEphysPreprocessingCampaign,
    breadcrumb: {
      root: 'Spike sorting: Preprocessing',
      steps: { selection: 'Select recording' },
    },
    scanConfig: {
      definition: spikeSortingPreprocessingWorkflow,
      schemaName: SchemaNameDict.AINDEPhysPreprocessingScanConfig,
      configureBinding: spikeSortingPreprocessingConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.ExtracellularRecording }],
    label: 'Preprocessing',
    disabled: false,
  },
  sorterWorkflow({
    campaignType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingSpykingCircus2Campaign,
    label: 'SpykingCircus2',
    definition: spikeSortingSpykingCircus2Workflow,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingSpykingCircus2ScanConfig,
    generatedApiPath: ScanConfigGeneratedApiPath.AindEphysSpikeSortingSpykingCircus2,
  }),
  sorterWorkflow({
    campaignType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingKilosort4Campaign,
    label: 'Kilosort4',
    definition: spikeSortingKilosort4Workflow,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingKilosort4ScanConfig,
    generatedApiPath: ScanConfigGeneratedApiPath.AindEphysSpikeSortingKilosort4,
  }),
  sorterWorkflow({
    campaignType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingLupinCampaign,
    label: 'Lupin',
    definition: spikeSortingLupinWorkflow,
    schemaName: SchemaNameDict.AINDEPhysSpikeSortingLupinScanConfig,
    generatedApiPath: ScanConfigGeneratedApiPath.AindEphysSpikeSortingLupin,
  }),
];
