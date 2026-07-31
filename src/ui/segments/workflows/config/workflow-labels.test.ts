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

const EVERY_ACTIVITY = [
  WorkspaceSection.BuildWorkflow,
  WorkspaceSection.SimulateWorkflow,
  WorkspaceSection.ExtractWorkflow,
  WorkspaceSection.ProcessWorkflow,
];

const LEGACY_SUFFIX = '(legacy)';

function enabledWorkflowsInOrder(activity: string) {
  return listWorkflows({
    activity,
    flags: allFlagsOn,
    sort: WorkflowListSortDict.Order,
  }).filter((workflow) => !workflow.disabled);
}

function enabledLabelsInOrder(activity: string) {
  return enabledWorkflowsInOrder(activity).map((workflow) => workflow.label);
}

describe('workflow naming', () => {
  it('has no "(beta)" left in any workflow label', () => {
    const everyLabel = EVERY_ACTIVITY.flatMap((activity) =>
      listWorkflows({ activity, flags: allFlagsOn }).map((workflow) => workflow.label)
    );

    expect(everyLabel.length).toBeGreaterThan(0);
    expect(everyLabel.filter((label) => label.includes('(beta)'))).toEqual([]);
  });

  it('orders Build with the superseded synaptome workflow last', () => {
    expect(enabledLabelsInOrder(WorkspaceSection.BuildWorkflow)).toEqual([
      'Ion channel',
      'Single neuron',
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

/**
 * The `legacy` flag is what the menus read to sort superseded entries last and render them
 * de-emphasised; the `(legacy)` suffix is what the user reads. They are maintained in separate
 * places, so these guard that one is never added without the other.
 */
describe('legacy marking', () => {
  it('flags exactly the workflows whose label carries the suffix', () => {
    const mismatched = EVERY_ACTIVITY.flatMap((activity) =>
      listWorkflows({ activity, flags: allFlagsOn })
        .filter((workflow) => workflow.label.includes(LEGACY_SUFFIX) !== workflow.legacy)
        .map((workflow) => `${activity}: ${workflow.label} (legacy=${workflow.legacy})`)
    );

    expect(mismatched).toEqual([]);
  });

  it('flags exactly the data entities whose title carries the suffix', () => {
    const mismatched = [
      ...Object.values(ModelDataExtendedTypes),
      ...Object.values(SimulationDataExtendedTypes),
    ]
      .filter((entity) => entity.title.includes(LEGACY_SUFFIX) !== Boolean(entity.legacy))
      .map((entity) => `${entity.title} (legacy=${entity.legacy})`);

    expect(mismatched).toEqual([]);
  });

  /**
   * Superseded entries belong in one block at the end, not interleaved — both because the ticket
   * asks for it and because any grouped treatment of them (a rule, a caption) needs one boundary.
   */
  it.each([
    ['Model', ModelDataExtendedTypes],
    ['Simulations', SimulationDataExtendedTypes],
  ])('keeps Data > %s legacy entries contiguous at the end', (_name, registry) => {
    const flags = Object.values(registry).map((entity) => Boolean(entity.legacy));
    const firstLegacyIndex = flags.indexOf(true);

    expect(firstLegacyIndex).toBeGreaterThan(0);
    expect(flags.slice(firstLegacyIndex)).not.toContain(false);
  });

  it.each([
    WorkspaceSection.BuildWorkflow,
    WorkspaceSection.SimulateWorkflow,
  ])('keeps %s legacy workflows contiguous at the end', (activity) => {
    const flags = enabledWorkflowsInOrder(activity).map((workflow) => workflow.legacy);
    const firstLegacyIndex = flags.indexOf(true);

    expect(firstLegacyIndex).toBeGreaterThan(0);
    expect(flags.slice(firstLegacyIndex)).not.toContain(false);
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
