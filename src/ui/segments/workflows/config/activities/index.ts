import { WorkflowActivityDictValue } from '@/constants';
import { extractionActivityFlag } from '@/features/feature-flags/flags';

import { BuildWorkflows } from './build';
import { ExtractBrowseWorkflows, ExtractConfigureWorkflows } from './extract';
import { ProcessBrowseWorkflows, ProcessConfigureWorkflows } from './process';
import { SimulateWorkflows } from './simulate';

import type { TActivityEntry, TActivityValue } from '../types';

export const ActivityRegistry: Record<TActivityValue, TActivityEntry> = {
  [WorkflowActivityDictValue.build]: {
    value: WorkflowActivityDictValue.build,
    label: 'Build',
    name: 'Build',
    order: 1,
    disabled: false,
    workflows: BuildWorkflows,
  },
  [WorkflowActivityDictValue.simulate]: {
    value: WorkflowActivityDictValue.simulate,
    label: 'Simulate',
    name: 'Simulation',
    order: 2,
    disabled: false,
    workflows: SimulateWorkflows,
  },
  [WorkflowActivityDictValue.extract]: {
    value: WorkflowActivityDictValue.extract,
    label: 'Extract',
    name: 'Extraction',
    order: 3,
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
    workflows: ExtractConfigureWorkflows,
    browseWorkflows: ExtractBrowseWorkflows,
  },
  [WorkflowActivityDictValue.optimize]: {
    value: WorkflowActivityDictValue.optimize,
    label: 'Optimize',
    name: 'Optimization',
    order: 5,
    disabled: true,
    workflows: [],
  },
  [WorkflowActivityDictValue.validate]: {
    value: WorkflowActivityDictValue.validate,
    label: 'Validate',
    name: 'Validation',
    order: 6,
    disabled: true,
    workflows: [],
  },
  [WorkflowActivityDictValue.process]: {
    value: WorkflowActivityDictValue.process,
    label: 'Process Data',
    name: 'Processing Data',
    order: 4,
    disabled: false,
    workflows: ProcessConfigureWorkflows,
    browseWorkflows: ProcessBrowseWorkflows,
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
  'Process Data': WorkflowActivityDictValue.process,
} as const;
