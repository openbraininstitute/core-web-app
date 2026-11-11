import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';
import { WorkflowActions } from '@/ui/segments/mini-detail-view/actions/simulate-extract-process';

import {
  makeCellMorphology,
  makeCircuit,
  makeMemodel,
  makeSingleNeuronScaleCircuit,
} from './fixtures';

import type { ComponentProps } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

vi.mock('@bprogress/next', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/ui/segments/workflows/config', () => ({
  WORKFLOW_SESSION_ID_SEARCH_PARAM: 'workflow_session_id',
}));

const ROOT_ROUTE = '/app/virtual-lab';

function renderWorkflowActions(props: Partial<ComponentProps<typeof WorkflowActions>>) {
  return render(
    <WorkflowActions
      hideUseModelAction
      section={WorkspaceSection.ExtractWorkflow}
      record={makeCellMorphology()}
      {...props}
    />
  );
}

describe.each([
  WorkspaceSection.SimulateWorkflow,
  WorkspaceSection.ExtractWorkflow,
  WorkspaceSection.ProcessWorkflow,
])('WorkflowActions "View details" link (mini-detail-view, section: %s)', (section) => {
  it('routes a plain entity (e.g. cell morphology) to its own kebab-case type page', () => {
    renderWorkflowActions({ section, record: makeCellMorphology() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/cell-morphology/cell-morphology-1`
    );
  });

  it('routes a regular-scale circuit to the generic circuit details page', () => {
    renderWorkflowActions({ section, record: makeCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/circuit/circuit-1`
    );
  });

  it('routes a single-neuron-scale circuit to the Synaptome page, not circuit', () => {
    renderWorkflowActions({ section, record: makeSingleNeuronScaleCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/single-neuron-circuit/circuit-single-1`
    );
  });
});

describe('WorkflowActions "Use model" lifecycle gating', () => {
  it('keeps Use model enabled for an active entity', () => {
    renderWorkflowActions({
      hideUseModelAction: false,
      section: WorkspaceSection.SimulateWorkflow,
      workflowTargetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
      record: makeMemodel({ lifecycle_status: EntityLifecycleStatus.Active }),
    });

    expect(screen.getByRole('button', { name: 'Use model' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'View details' })).toBeEnabled();
  });

  it.each([
    EntityLifecycleStatus.Draft,
    EntityLifecycleStatus.Disqualified,
  ])('disables Use model for a %s entity', (status) => {
    renderWorkflowActions({
      hideUseModelAction: false,
      section: WorkspaceSection.SimulateWorkflow,
      workflowTargetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
      record: makeMemodel({ lifecycle_status: status }),
    });

    expect(screen.getByRole('button', { name: 'Use model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View details' })).toBeEnabled();
  });

  it('disables the fallback Use model link for a draft entity', () => {
    renderWorkflowActions({
      hideUseModelAction: false,
      section: WorkspaceSection.SimulateWorkflow,
      record: makeMemodel({ lifecycle_status: EntityLifecycleStatus.Draft }),
    });

    expect(screen.getByRole('button', { name: 'Use model' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View details' })).toBeEnabled();
  });
});
