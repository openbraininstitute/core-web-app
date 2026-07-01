import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkflowBuildActions } from '@/ui/segments/mini-detail-view/actions/build';

import { makeCircuit, makeMemodel, makeSingleNeuronScaleCircuit } from './fixtures';

import type { ComponentProps } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

// the "Use model" action resolves a workflow definition from the real (large) workflow registry;
// irrelevant here since every test hides it (`hideUseModelAction`) to isolate "View details"
vi.mock('@/ui/segments/workflows/config', () => ({
  getWorkflow: () => null,
  WORKFLOW_SESSION_ID_SEARCH_PARAM: 'workflow_session_id',
}));

const ROOT_ROUTE = '/app/virtual-lab';

function renderBuildActions(props: Partial<ComponentProps<typeof WorkflowBuildActions>>) {
  return render(<WorkflowBuildActions hideUseModelAction record={makeMemodel()} {...props} />);
}

describe('WorkflowBuildActions "View details" link (mini-detail-view, section: BuildWorkflow / ScanConfigBuildWorkflow)', () => {
  it('routes a plain build output (e.g. ME-model) to its own kebab-case type page', () => {
    renderBuildActions({ record: makeMemodel() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/memodel/memodel-1`
    );
  });

  it('routes a regular-scale circuit build output to the generic circuit details page', () => {
    renderBuildActions({ record: makeCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/circuit/circuit-1`
    );
  });

  it('routes an em-circuit (beta) build output (single-neuron-scale circuit) to Synaptome (beta), not circuit', () => {
    renderBuildActions({ record: makeSingleNeuronScaleCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/single-neuron-circuit/circuit-single-1`
    );
  });
});
