import { act, renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useCircuitColorBy } from '@/features/scan-config/components/color-by/use-circuit-color-by';
import { DEFAULT_SOMA_SIZE_SCALE } from '@/features/scan-config/components/color-by/use-viewer-config';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodePopulation } from '@/features/circuit-nodes/types';

// The viewer barrel pulls in tgd, which touches `document` at module scope.
vi.mock('@/morpho-viewer', () => {
  const signals = {};
  return { useMorphoViewerSignals: () => signals };
});

vi.mock('@/features/scan-config/components/shared/3d-viewer', () => ({
  downloadCircuitImage: () => {},
}));

// The mapping reads the SONATA file; this test is about which property is asked for.
vi.mock('@/features/scan-config/components/color-by/use-node-color-mapping', () => ({
  useNodeColorMapping: () => ({
    mapping: null,
    columns: [],
    loading: false,
    error: null,
    status: 'ready',
    retry: () => {},
  }),
}));

const circuit = { id: 'circuit-id', name: 'Circuit' } as ICircuit;
const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

function render(population: NodePopulation | undefined) {
  return renderHook(
    ({ population: shown }: { population: NodePopulation | undefined }) =>
      useCircuitColorBy(circuit, { population: shown }),
    { initialProps: { population } }
  );
}

describe('useCircuitColorBy', () => {
  it('keeps a colour-by choice per population, restoring it when that population is back on show', () => {
    const { result, rerender } = render(CORTEX);

    act(() => result.current.colorBy.onSelectProperty('mtype'));
    expect(result.current.colorBy.selectedProperty).toBe('mtype');

    // Property lists are per population: `mtype` does not exist on the inputs.
    rerender({ population: INPUTS });
    expect(result.current.colorBy.selectedProperty).toBeNull();

    act(() => result.current.colorBy.onSelectProperty('layer'));

    rerender({ population: CORTEX });
    expect(result.current.colorBy.selectedProperty).toBe('mtype');

    rerender({ population: INPUTS });
    expect(result.current.colorBy.selectedProperty).toBe('layer');
  });

  // A render committed with the previous population's choice would paint the
  // new population in the wrong colours first, recolouring every soma for
  // nothing.
  it('restores the remembered choice in the render that switches, committing nothing in between', () => {
    const committed: (string | null)[] = [];
    const { result, rerender } = renderHook(
      ({ population: shown }: { population: NodePopulation }) => {
        const colorBy = useCircuitColorBy(circuit, { population: shown });
        const { selectedProperty } = colorBy.colorBy;
        // Every commit, not every change, because the stale commit carries the
        // same value as the one before it.
        useEffect(() => {
          committed.push(selectedProperty);
        });
        return colorBy;
      },
      { initialProps: { population: CORTEX } }
    );

    act(() => result.current.colorBy.onSelectProperty('mtype'));
    rerender({ population: INPUTS });
    act(() => result.current.colorBy.onSelectProperty('layer'));

    committed.length = 0;
    rerender({ population: CORTEX });

    expect(committed).toEqual(['mtype']);
  });

  it('starts with no choice while the population is still unresolved', () => {
    const { result, rerender } = render(undefined);

    expect(result.current.colorBy.selectedProperty).toBeNull();

    rerender({ population: CORTEX });
    expect(result.current.colorBy.selectedProperty).toBeNull();
  });

  it('offers the soma size control only to viewers that draw soma points', () => {
    const { result } = render(CORTEX);

    expect(result.current.menu.somaSizeScale).toBeUndefined();
    expect(result.current.menu.onSomaSizeScaleChange).toBeUndefined();
  });

  it('starts the soma size at the default scale and takes a new one', () => {
    const { result } = renderHook(() =>
      useCircuitColorBy(circuit, { population: CORTEX, supportsSomaSize: true })
    );
    expect(result.current.menu.somaSizeScale).toBe(DEFAULT_SOMA_SIZE_SCALE);

    act(() => result.current.menu.onSomaSizeScaleChange?.(1.5));

    expect(result.current.menu.somaSizeScale).toBe(1.5);
    expect(result.current.config.somaSizeScale).toBe(1.5);
  });
});
