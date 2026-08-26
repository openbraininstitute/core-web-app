import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNodeColorMapping } from '@/features/scan-config/components/color-by/use-node-color-mapping';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { NodePopulation } from '@/features/circuit-nodes/types';

const circuit = { id: 'circuit-id', name: 'Circuit' } as ICircuit;
const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

// Hoisted so the module factories below, which run before the test body, can
// read them.
const worker = vi.hoisted(() => ({
  status: 'ready' as 'ready' | 'loading',
  getColumn: vi.fn(async (name: string) => ({
    kind: 'string' as const,
    values: [`${name}-a`, `${name}-b`],
  })),
}));

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({
    config: { circuitAssetId: 'asset', nodes: [CORTEX, INPUTS], edges: [], raw: {} },
    error: null,
  }),
}));

vi.mock('@/features/circuit-nodes/hooks/use-nodes-worker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/circuit-nodes/hooks/use-nodes-worker')>()),
  useNodesWorker: () => ({
    getColumn: worker.getColumn,
    columns: [],
    status: worker.status,
    isLoading: worker.status === 'loading',
    error: null,
    retry: () => {},
  }),
}));

type TProps = { population: NodePopulation; property: string | null };

function render(population: NodePopulation, property: string | null) {
  return renderHook(
    (props: TProps) => useNodeColorMapping(circuit, props.population, props.property),
    { initialProps: { population, property } }
  );
}

describe('useNodeColorMapping', () => {
  beforeEach(() => {
    worker.status = 'ready';
    worker.getColumn.mockClear();
  });

  // A population coming back on show — a click on it in 3D — has its session
  // reopened and would otherwise stay blue until its column is read again.
  it('paints a population coming back on show from its last column, in the same render', async () => {
    const { result, rerender } = render(CORTEX, 'mtype');
    await waitFor(() => expect(result.current.mapping?.property).toBe('mtype'));
    const cortex = result.current.mapping;

    rerender({ population: INPUTS, property: 'layer' });
    await waitFor(() => expect(result.current.mapping?.property).toBe('layer'));

    // Back on show, its session not yet reopened.
    worker.status = 'loading';
    rerender({ population: CORTEX, property: 'mtype' });

    // Rebuilt from the kept column — `useMemo` holds one slot — but in this
    // render, with nothing read.
    expect(result.current.mapping).toStrictEqual(cortex);
    expect(result.current.loading).toBe(false);
    expect(worker.getColumn).toHaveBeenCalledTimes(2);
  });

  // One column per population: what the remembered choice can ask for, and no
  // more — a column is a value per node.
  it('keeps only the last column read for a population', async () => {
    const { result, rerender } = render(CORTEX, 'mtype');
    await waitFor(() => expect(result.current.mapping?.property).toBe('mtype'));

    rerender({ population: CORTEX, property: 'layer' });
    expect(result.current.mapping).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.mapping?.property).toBe('layer'));

    rerender({ population: CORTEX, property: 'mtype' });
    expect(result.current.mapping).toBeNull();
    await waitFor(() => expect(result.current.mapping?.property).toBe('mtype'));
    expect(worker.getColumn).toHaveBeenCalledTimes(3);
  });
});
