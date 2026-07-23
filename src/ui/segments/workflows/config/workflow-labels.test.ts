import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { ModelDataExtendedTypes, SimulationDataExtendedTypes } from '@/ui/segments/explore/helpers';

import { listWorkflows } from './helpers';
import { WorkflowListSortDict } from './types';

import type { FeatureFlags } from '@/features/feature-flags/flags';

/**
 * Every flag on, so feature-gated workflows (brain region simulation) take part in the
 * ordering assertions instead of being filtered out as disabled.
 */
const allFlagsOn = new Proxy({}, { get: () => true }) as FeatureFlags;

function enabledLabelsInOrder(activity: string) {
  return listWorkflows({
    activity,
    flags: allFlagsOn,
    sort: WorkflowListSortDict.Order,
  })
    .filter((workflow) => !workflow.disabled)
    .map((workflow) => workflow.label);
}

describe('workflow naming', () => {
  it('has no "(beta)" left in any workflow label', () => {
    const everyLabel = [
      WorkspaceSection.BuildWorkflow,
      WorkspaceSection.SimulateWorkflow,
      WorkspaceSection.ExtractWorkflow,
      WorkspaceSection.ProcessWorkflow,
    ].flatMap((activity) =>
      listWorkflows({ activity, flags: allFlagsOn }).map((workflow) => workflow.label)
    );

    expect(everyLabel.length).toBeGreaterThan(0);
    expect(everyLabel.filter((label) => label.includes('(beta)'))).toEqual([]);
  });

  it('orders Build with the superseded synaptome workflow last', () => {
    expect(enabledLabelsInOrder(WorkspaceSection.BuildWorkflow)).toEqual([
      'Single neuron',
      'Ion channel',
      'Electron microscopy circuit',
      'Extracellular recording array',
      'Synaptome (legacy)',
    ]);
  });

  it('orders Simulate with both superseded workflows last', () => {
    expect(enabledLabelsInOrder(WorkspaceSection.SimulateWorkflow)).toEqual([
      'Ion channel',
      'Single neuron',
      'Synaptome',
      'Paired neurons',
      'Small microcircuit',
      'Microcircuit',
      'Brain region',
      'Whole brain',
      'Single neuron (legacy)',
      'Synaptome (legacy)',
    ]);
  });

  /**
   * Memodel is only superseded on Simulate — the MemodelCircuit build workflow is still
   * disabled — so the same source type is deliberately labelled differently per activity.
   */
  it("keeps Build's single neuron unsuffixed while Simulate marks it legacy", () => {
    expect(enabledLabelsInOrder(WorkspaceSection.BuildWorkflow)).toContain('Single neuron');
    expect(enabledLabelsInOrder(WorkspaceSection.BuildWorkflow)).not.toContain(
      'Single neuron (legacy)'
    );
    expect(enabledLabelsInOrder(WorkspaceSection.SimulateWorkflow)).toContain(
      'Single neuron (legacy)'
    );
  });
});

describe('data navigation naming', () => {
  it('orders Data > Model with the superseded synaptome last', () => {
    expect(Object.values(ModelDataExtendedTypes).map((entity) => entity.title)).toEqual([
      'Ion channel model',
      'Synthesized morphology',
      'E-model',
      'ME-model',
      'Synaptome',
      'Circuit',
      'Extracellular recording array',
      'Synaptome (legacy)',
    ]);
  });

  it('orders Data > Simulations to match Workflows > Simulate, superseded entries last', () => {
    expect(Object.values(SimulationDataExtendedTypes).map((entity) => entity.title)).toEqual([
      'Ion channel',
      'Single neuron',
      'Synaptome',
      'Paired neurons',
      'Small microcircuit',
      'Microcircuit',
      'Region circuit',
      'Whole brain circuit',
      'Single neuron (legacy)',
      'Synaptome (legacy)',
    ]);
  });
});
