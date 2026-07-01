import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { WorkflowActions } from '@/ui/segments/mini-detail-view/actions/simulate-extract-process';

import { makeCellMorphology, makeCircuit, makeSingleNeuronScaleCircuit } from './fixtures';

import type { ComponentProps } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

// only the search-param constant is used by this component; the "Use model" action itself is
// hidden in every test below (`hideUseModelAction`) to isolate "View details"
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

  it('routes a single-neuron-scale circuit to the Synaptome (beta) page, not circuit', () => {
    renderWorkflowActions({ section, record: makeSingleNeuronScaleCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/single-neuron-circuit/circuit-single-1`
    );
  });
});
