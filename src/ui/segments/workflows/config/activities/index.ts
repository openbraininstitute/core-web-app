import { WorkflowActivityDictValue } from '@/constants';
import { extractionActivityFlag } from '@/features/feature-flags/flags';

import { BuildWorkflows } from './build';
import { ExtractBrowseWorkflows, ExtractConfigureWorkflows } from './extract';
import { SimulateWorkflows } from './simulate';

import type { TActivityEntry, TActivityValue } from '../types';

export const ActivityRegistry: Record<TActivityValue, TActivityEntry> = {
  [WorkflowActivityDictValue.build]: {
    value: WorkflowActivityDictValue.build,
    label: 'Build',
    name: 'Build',
    disabled: false,
    workflows: BuildWorkflows,
  },
  [WorkflowActivityDictValue.simulate]: {
    value: WorkflowActivityDictValue.simulate,
    label: 'Simulate',
    name: 'Simulation',
    disabled: false,
    workflows: SimulateWorkflows,
  },
  [WorkflowActivityDictValue.extract]: {
    value: WorkflowActivityDictValue.extract,
    label: 'Extract',
    name: 'Extraction',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
    workflows: ExtractConfigureWorkflows,
    browseWorkflows: ExtractBrowseWorkflows,
  },
  [WorkflowActivityDictValue.optimize]: {
    value: WorkflowActivityDictValue.optimize,
    label: 'Optimize',
    name: 'Optimization',
    disabled: true,
    workflows: [],
  },
  [WorkflowActivityDictValue.validate]: {
    value: WorkflowActivityDictValue.validate,
    label: 'Validate',
    name: 'Validation',
    disabled: true,
    workflows: [],
  },
  [WorkflowActivityDictValue.process_data]: {
    value: WorkflowActivityDictValue.process_data,
    label: 'Process Data',
    name: 'Processing Data',
    disabled: true,
    workflows: [],
  },
};

/**
 * Map of activity label -> value, equivalent to the legacy `ActivityValues`
 * export. Kept so consumers that reference `ActivityValues.Build` etc. keep
 * compiling without change.
 */
export const ActivityValues = {
  Build: WorkflowActivityDictValue.build,
  Simulate: WorkflowActivityDictValue.simulate,
  Extract: WorkflowActivityDictValue.extract,
  Optimize: WorkflowActivityDictValue.optimize,
  Validate: WorkflowActivityDictValue.validate,
  'Process Data': WorkflowActivityDictValue.process_data,
} as const;
