import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  efeatureExtractionActivityFlag,
  extractionActivityFlag,
} from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';
import { extractEFeaturesWorkflow } from '@/features/scan-config/workflow/definitions/extract-efeatures';

import {
  extractCircuitConfigureBinding,
  extractEFeaturesConfigureBinding,
} from '../scan-config-binding';
import {
  WorkflowBrowseDefaults,
  WorkflowConfigureRoutingDict,
  WorkflowStagePresets,
} from '../types';

import type { IWorkflowDescriptor } from '../types';

export const ExtractionWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    breadcrumb: {
      root: 'Circuit extraction',
      steps: { selection: 'Select circuit' },
    },
    scanConfig: {
      definition: extractCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitExtractionScanConfig,
      configureBinding: extractCircuitConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfigInEditorSelection,
    sourceType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
    targetType: ExtendedEntitiesTypeDict.EFeatureExtractionCampaign,
    breadcrumb: {
      root: 'Intracellular EFeatures',
    },
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
    scanConfig: {
      definition: extractEFeaturesWorkflow,
      schemaName: SchemaNameDict.EModelEFeatureExtractionScanConfig,
      configureBinding: extractEFeaturesConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.ElectricalCellRecording }],
    label: 'Intracellular EFeatures',
    disabled: false,
    requiredFeatures: [efeatureExtractionActivityFlag.key],
  },
];
