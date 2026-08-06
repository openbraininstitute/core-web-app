import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DataActions } from '@/ui/segments/mini-detail-view/actions/data';

import {
  makeCellMorphology,
  makeCircuit,
  makeExtracellularRecordingArray,
  makeSingleNeuronScaleCircuit,
  makeUnregisteredEntity,
} from './fixtures';

import type { ComponentProps } from 'react';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));

const ROOT_ROUTE = '/app/virtual-lab';

function renderDataActions(props: ComponentProps<typeof DataActions>) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={createStore()}>
        <DataActions {...props} />
      </Provider>
    </QueryClientProvider>
  );
}

describe('DataActions "View details" link (mini-detail-view, section: Data)', () => {
  it('routes a plain entity (e.g. cell morphology) to its own kebab-case type page', () => {
    renderDataActions({ record: makeCellMorphology() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/cell-morphology/cell-morphology-1`
    );
  });

  it('routes a regular-scale circuit to the generic circuit details page', () => {
    renderDataActions({ record: makeCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/circuit/circuit-1`
    );
  });

  it('routes a single-neuron-scale circuit (em-circuit build output) to the Synaptome page, not circuit', () => {
    renderDataActions({ record: makeSingleNeuronScaleCircuit() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/single-neuron-circuit/circuit-single-1`
    );
  });

  it('honours an explicit dataType override for the scale check, still applying it to a single-neuron-scale circuit', () => {
    renderDataActions({
      record: makeSingleNeuronScaleCircuit({ id: 'circuit-single-2' }),
      dataType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/single-neuron-circuit/circuit-single-2`
    );
  });

  it('routes an extracellular recording array to its own details page', () => {
    renderDataActions({ record: makeExtracellularRecordingArray() });

    expect(screen.getByRole('button', { name: 'View details' })).toHaveAttribute(
      'href',
      `${ROOT_ROUTE}/vl-1/proj-1/data/view/simulatable-extracellular-recording-array/ext-recording-array-1`
    );
  });

  it('hides "View details" for entity types with no detail view page', () => {
    renderDataActions({ record: makeUnregisteredEntity() });

    expect(screen.queryByRole('button', { name: 'View details' })).not.toBeInTheDocument();
  });
});
