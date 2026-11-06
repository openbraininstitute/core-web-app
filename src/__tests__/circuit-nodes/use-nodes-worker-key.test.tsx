import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  IDLE_SESSION_STATE,
  type NodesSessionState,
  nodesWorkerRegistry,
} from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';

import type { NodePopulation } from '@/features/circuit-nodes/types';

vi.mock('@/ui/hooks/use-workspace', () => ({ useWorkspace: () => ({}) }));

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'nodes.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

const CORTEX_READY: NodesSessionState = {
  ...IDLE_SESSION_STATE,
  status: 'ready',
  rowCount: 2,
  columns: [{ name: 'x', kind: 'numeric' }],
};

afterEach(() => vi.restoreAllMocks());

describe('useNodesWorker', () => {
  // Read in the render the new population arrives in, before any effect has run.
  it('never answers for a new population with the last one’s state', () => {
    const states = new Map([[nodesSessionKey('circuit', 'asset', 'cortex'), CORTEX_READY]]);
    vi.spyOn(nodesWorkerRegistry, 'acquire').mockImplementation(() => {});
    vi.spyOn(nodesWorkerRegistry, 'release').mockImplementation(() => {});
    vi.spyOn(nodesWorkerRegistry, 'subscribe').mockImplementation(() => () => {});
    vi.spyOn(nodesWorkerRegistry, 'getState').mockImplementation(
      (key) => states.get(key) ?? IDLE_SESSION_STATE
    );

    const seen: string[] = [];
    const { rerender } = renderHook(
      ({ population }: { population: NodePopulation }) => {
        const result = useNodesWorker({
          enabled: true,
          circuitId: 'circuit',
          circuitAssetId: 'asset',
          population,
        });
        seen.push(`${population.name}:${result.status}`);
        return result;
      },
      { initialProps: { population: CORTEX } }
    );
    expect(seen.at(-1)).toBe('cortex:ready');

    rerender({ population: INPUTS });

    expect(seen).not.toContain('inputs:ready');
    expect(seen.at(-1)).toBe('inputs:idle');
  });
});
