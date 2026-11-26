import { WorkflowActivityDictValue } from '@/constants';
import { emodelValidationFlag } from '@/features/feature-flags/flags';

import { BuildBrowseWorkflows, BuildWorkflows } from './build';
import { ExtractionWorkflows } from './extract';
import { OptimizeWorkflows } from './optimize';
import { ProcessingWorkflows } from './process';
import { SimulateWorkflows } from './simulate';
import { ValidationWorkflows } from './validate';

import type { TActivityEntry, TActivityValue } from '../types';

export const ActivityRegistry: Record<TActivityValue, TActivityEntry> = {
  [WorkflowActivityDictValue.build]: {
    value: WorkflowActivityDictValue.build,
    label: 'Build',
    order: 1,
    disabled: false,
    /** Getter: build workflows and the circuit grid schema import each other. */
    get workflows() {
      return BuildWorkflows;
    },
    get browseWorkflows() {
      return BuildBrowseWorkflows;
    },
  },
  [WorkflowActivityDictValue.simulate]: {
    value: WorkflowActivityDictValue.simulate,
    label: 'Simulate',
    order: 2,
    disabled: false,
    workflows: SimulateWorkflows,
  },
  [WorkflowActivityDictValue.extract]: {
    value: WorkflowActivityDictValue.extract,
    label: 'Extract',
    order: 3,
    disabled: false,
    workflows: ExtractionWorkflows,
  },
  [WorkflowActivityDictValue.optimize]: {
    value: WorkflowActivityDictValue.optimize,
    label: 'Optimize',
    order: 5,
    disabled: false,
    workflows: OptimizeWorkflows,
  },
  [WorkflowActivityDictValue.validate]: {
    value: WorkflowActivityDictValue.validate,
    label: 'Validate',
    order: 6,
    disabled: false,
    requiredFeatures: [emodelValidationFlag.key],
    workflows: ValidationWorkflows,
  },
  [WorkflowActivityDictValue.process]: {
    value: WorkflowActivityDictValue.process,
    label: 'Process data',
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
