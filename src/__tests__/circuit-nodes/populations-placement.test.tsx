import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { nodesSessionKey } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { usePopulationsPlacement } from '@/features/circuit-nodes/hooks/use-populations-placement';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  NodesSessionState,
  NodesSessionStatus,
} from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import type { NodeGeometry, NodePopulation } from '@/features/circuit-nodes/types';

/**
 * A registry the test drives by hand: a session opens as `loading` on the
 * first acquire and moves on only when the test settles it. A session settled
 * without geometry answers `getGeometry` the way the worker does for a
 * population without positions — by rejecting.
 */
const registry = vi.hoisted(() => {
  type Session = {
    state: NodesSessionState;
    listeners: Set<() => void>;
    geometry: NodeGeometry | null;
  };
  const IDLE: NodesSessionState = {
    status: 'idle',
    columns: undefined,
    rowCount: 0,
    progress: null,
    error: null,
  };
  const sessions = new Map<string, Session>();
  const session = (key: string): Session => {
    let existing = sessions.get(key);
    if (!existing) {
      existing = { state: { ...IDLE, status: 'loading' }, listeners: new Set(), geometry: null };
      sessions.set(key, existing);
    }
    return existing;
  };
  return {
    IDLE,
    acquired: [] as string[],
    released: [] as string[],
    geometryAsked: [] as string[],
    acquire(key: string) {
      this.acquired.push(key);
      session(key);
    },
    release(key: string) {
      this.released.push(key);
    },
    subscribe(key: string, listener: () => void) {
      const existing = sessions.get(key);
      if (!existing) return () => {};
      existing.listeners.add(listener);
      return () => existing.listeners.delete(listener);
    },
    getState(key: string): NodesSessionState {
      return sessions.get(key)?.state ?? IDLE;
    },
    getGeometry(key: string): Promise<NodeGeometry> {
      this.geometryAsked.push(key);
      const geometry = sessions.get(key)?.geometry;
      return geometry
        ? Promise.resolve(geometry)
        : Promise.reject(new Error('no x/y/z columns; nothing to place in 3D'));
    },
    /** Test control: move a session on and tell its listeners. */
    settle(key: string, status: NodesSessionStatus, geometry: NodeGeometry | null = null) {
      const target = session(key);
      target.state = { ...target.state, status };
      target.geometry = geometry;
      for (const listener of target.listeners) listener();
    },
    reset() {
      sessions.clear();
      this.acquired = [];
      this.released = [];
      this.geometryAsked = [];
    },
  };
});

vi.mock('@/features/circuit-nodes/hooks/nodes-worker-manager', () => ({
  nodesWorkerRegistry: registry,
  IDLE_SESSION_STATE: registry.IDLE,
}));

vi.mock('@/features/circuit-nodes/hooks/use-circuit-config', () => ({
  useCircuitConfig: () => ({ config: { circuitAssetId: 'asset', nodes: [], edges: [], raw: {} } }),
}));

vi.mock('@/api/entitycore/queries/assets', () => ({
  buildAssetDownloadRequest: async () => ({ url: 'https://example.test/nodes', headers: {} }),
}));

vi.mock('@/ui/hooks/use-workspace', () => {
  const ctx = { virtualLabId: 'lab', projectId: 'project' };
  const useWorkspace = () => ctx;
  return { useWorkspace, default: useWorkspace };
});

const circuit = { id: 'circuit-id' } as ICircuit;
const key = (population: NodePopulation) => nodesSessionKey('circuit-id', 'asset', population.name);

function geometry(count: number): NodeGeometry {
  return {
    count,
    positions: new Float32Array(count * 3),
    orientations: null,
    morphologies: null,
  };
}

const CORTEX: NodePopulation = { name: 'cortex', type: 'biophysical', file: 'cortex.h5' };
const THALAMUS: NodePopulation = { name: 'thalamus', type: 'biophysical', file: 'thalamus.h5' };
const INPUTS: NodePopulation = { name: 'inputs', type: 'virtual', file: 'inputs.h5' };

function render(populations: NodePopulation[]) {
  return renderHook(
    ({ populations: list }: { populations: NodePopulation[] }) =>
      usePopulationsPlacement({ circuit, populations: list }),
    { initialProps: { populations } }
  );
}

describe('usePopulationsPlacement', () => {
  beforeEach(() => registry.reset());

  it('places the populations in the given order, reporting those without positions', async () => {
    const { result } = render([CORTEX, INPUTS, THALAMUS]);

    expect(result.current).toMatchObject({ placed: [], settled: false });

    act(() => {
      registry.settle(key(THALAMUS), 'ready', geometry(3));
      registry.settle(key(INPUTS), 'ready');
      registry.settle(key(CORTEX), 'ready', geometry(2));
    });

    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placed.map((entry) => entry.population.name)).toEqual([
      'cortex',
      'thalamus',
    ]);
    expect(result.current.placed.map((entry) => entry.geometry.count)).toEqual([2, 3]);
    expect(result.current.failures.get('inputs')?.message).toContain('nothing to place');
  });

  it('gives up on a population whose file does not open', async () => {
    const { result } = render([CORTEX, INPUTS]);

    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
    });
    await waitFor(() => expect(registry.geometryAsked).toContain(key(CORTEX)));
    expect(result.current.settled).toBe(false);

    act(() => {
      registry.settle(key(INPUTS), 'error');
    });

    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placed.map((entry) => entry.population.name)).toEqual(['cortex']);
    expect(result.current.failures.has('inputs')).toBe(true);
  });

  // A download can fail once. The nodes table and colour-by retry the same
  // session, and the viewer has to come back with them rather than stay on its
  // error until it is remounted.
  it('heals when a failed session is retried', async () => {
    const { result } = render([CORTEX, INPUTS]);
    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
      registry.settle(key(INPUTS), 'error');
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.failures.has('inputs')).toBe(true);
    // Held, so the retry is seen.
    expect(registry.released).toEqual([key(CORTEX)]);

    act(() => {
      registry.settle(key(INPUTS), 'loading');
    });
    expect(result.current.settled).toBe(false);

    act(() => {
      registry.settle(key(INPUTS), 'ready', geometry(2));
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placed.map((entry) => entry.population.name)).toEqual([
      'cortex',
      'inputs',
    ]);
    expect(registry.released).toEqual([key(CORTEX), key(INPUTS)]);
  });

  it('asks again for a population that failed once the list changes', async () => {
    const { result, rerender } = render([CORTEX, INPUTS]);
    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
      registry.settle(key(INPUTS), 'error');
    });
    await waitFor(() => expect(result.current.settled).toBe(true));

    rerender({ populations: [INPUTS, CORTEX] });

    expect(registry.acquired.filter((asked) => asked === key(INPUTS))).toHaveLength(2);
    expect(registry.acquired.filter((asked) => asked === key(CORTEX))).toHaveLength(1);
  });

  it('opens two populations kept in one file one after the other', async () => {
    const first = { ...CORTEX, file: 'shared.h5' };
    const second = { ...INPUTS, file: 'shared.h5' };
    render([first, second, THALAMUS]);

    // The other file is unrelated and opens straight away.
    expect(registry.acquired).toEqual([key(first), key(THALAMUS)]);

    act(() => {
      registry.settle(key(first), 'ready', geometry(1));
    });

    await waitFor(() => expect(registry.acquired).toContain(key(second)));
  });

  // Selecting a population reorders nothing and re-reads nothing: the viewer
  // repaints from what is already in hand.
  it('keeps what it has read when the list changes, reading only the newcomers', async () => {
    const { result, rerender } = render([CORTEX, INPUTS]);
    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
      registry.settle(key(INPUTS), 'ready', geometry(2));
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    const before = result.current.placed;

    rerender({ populations: [INPUTS, CORTEX, THALAMUS] });

    expect(result.current.settled).toBe(false);
    expect(registry.geometryAsked.filter((asked) => asked === key(CORTEX))).toHaveLength(1);
    act(() => {
      registry.settle(key(THALAMUS), 'ready', geometry(3));
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placed.map((entry) => entry.population.name)).toEqual([
      'inputs',
      'cortex',
      'thalamus',
    ]);
    // The same geometry objects, not copies.
    expect(result.current.placed[1].geometry).toBe(before[0].geometry);
  });

  it('releases a session once its positions are in hand, and the rest on unmount', async () => {
    const { unmount } = render([CORTEX, THALAMUS]);

    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
    });
    await waitFor(() => expect(registry.released).toEqual([key(CORTEX)]));

    unmount();

    expect(registry.released).toEqual([key(CORTEX), key(THALAMUS)]);
  });

  it('is settled with nothing to place when given no populations', () => {
    const { result } = render([]);

    expect(result.current).toEqual({ placed: [], failures: new Map(), settled: true });
    expect(registry.acquired).toEqual([]);
  });
});
