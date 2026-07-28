import { WorkflowActivityDictValue } from '@/constants';
import {
  efeatureExtractionActivityFlag,
  extractionActivityFlag,
} from '@/features/feature-flags/flags';

import { BuildWorkflows } from './build';
import { ExtractionWorkflows } from './extract';
import { ProcessingWorkflows } from './process';
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
    // each extraction workflow carries its own flag; the section shows as soon as one is on
    requiredAnyFeatures: [extractionActivityFlag.key, efeatureExtractionActivityFlag.key],
    workflows: ExtractionWorkflows,
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
    label: 'Process data',
    name: 'Processing data',
    order: 4,
    disabled: false,
    workflows: ProcessingWorkflows,
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
