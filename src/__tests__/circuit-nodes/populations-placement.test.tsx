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
 * first acquire and only moves on when the test settles it. A session settled
 * without geometry rejects `getGeometry`, as the worker does for a population
 * that carries no positions.
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
      // The registry drops the byte count when a session leaves its download.
      target.state = { ...target.state, status, progress: null };
      target.geometry = geometry;
      for (const listener of target.listeners) listener();
    },
    /** Test control: report how far a session's download has got. */
    progress(key: string, received: number, total: number | null) {
      const target = session(key);
      target.state = { ...target.state, progress: { received, total } };
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
  // session, and the viewer has to pick that retry up instead of staying on its
  // error until it is remounted.
  it('heals when a failed session is retried', async () => {
    const { result } = render([CORTEX, INPUTS]);
    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
      registry.settle(key(INPUTS), 'error');
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.failures.has('inputs')).toBe(true);
    // Still held, so the retry is seen.
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

  // The file that will not open is holding the one behind it, so giving up on
  // it has to let that one through. Left waiting, it is never opened at all and
  // the placement never settles: the viewer keeps its spinner and the reason
  // for the failure is never read out of it.
  it('opens the next population in a shared file when the first fails', async () => {
    const first = { ...CORTEX, file: 'shared.h5' };
    const second = { ...INPUTS, file: 'shared.h5' };
    const { result } = render([first, second]);

    expect(registry.acquired).toEqual([key(first)]);

    act(() => {
      registry.settle(key(first), 'error');
    });
    await waitFor(() => expect(registry.acquired).toContain(key(second)));

    act(() => {
      registry.settle(key(second), 'ready', geometry(2));
    });

    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placed.map((entry) => entry.population.name)).toEqual(['inputs']);
    expect(result.current.failures.has('cortex')).toBe(true);
  });

  // Selecting a population neither reorders nor re-reads anything, so the
  // viewer can repaint from what it already has.
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
    // The same geometry objects, rather than copies.
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

    expect(result.current).toEqual({
      placed: [],
      failures: new Map(),
      settled: true,
      download: null,
    });
    expect(registry.acquired).toEqual([]);
  });

  it('sums the bytes of the node files it is reading', () => {
    const { result } = render([CORTEX, THALAMUS]);

    // Nothing has crossed the wire yet, so there is nothing to say it is doing.
    expect(result.current.download).toBeNull();

    act(() => {
      registry.progress(key(CORTEX), 10, 100);
      registry.progress(key(THALAMUS), 5, 50);
    });

    expect(result.current.download).toEqual({ received: 15, total: 150 });
  });

  // The registry drops a session's byte count once its file is open, and a
  // finished file leaving the sum would take the reading backwards while its
  // neighbours are still coming.
  it('keeps a file that has finished in the sum', async () => {
    const { result } = render([CORTEX, THALAMUS]);

    act(() => {
      registry.progress(key(CORTEX), 100, 100);
      registry.progress(key(THALAMUS), 5, 50);
      registry.settle(key(CORTEX), 'ready', geometry(1));
    });

    await waitFor(() => expect(registry.geometryAsked).toContain(key(CORTEX)));
    expect(result.current.download).toEqual({ received: 105, total: 150 });
  });

  // Two populations kept in one file are read one after the other, and each
  // reports the download of that one file.
  it('counts a file two populations share once', async () => {
    const first = { ...CORTEX, file: 'shared.h5' };
    const second = { ...INPUTS, file: 'shared.h5' };
    const { result } = render([first, second, THALAMUS]);

    act(() => {
      registry.progress(key(first), 100, 100);
      registry.progress(key(THALAMUS), 5, 50);
    });
    expect(result.current.download).toEqual({ received: 105, total: 150 });

    act(() => {
      registry.settle(key(first), 'ready', geometry(1));
    });
    await waitFor(() => expect(registry.acquired).toContain(key(second)));

    // The same 100-byte file, read by the population that comes next. Counted
    // per session it would read as 250 bytes over two files.
    act(() => {
      registry.progress(key(second), 100, 100);
    });
    expect(result.current.download).toEqual({ received: 105, total: 150 });
  });

  it('has no total to show when one file reports no length', () => {
    const { result } = render([CORTEX, THALAMUS]);

    act(() => {
      registry.progress(key(CORTEX), 10, 100);
      registry.progress(key(THALAMUS), 5, null);
    });

    expect(result.current.download).toEqual({ received: 15, total: null });
  });

  it('has nothing left to report once everything is placed', async () => {
    const { result } = render([CORTEX]);

    act(() => {
      registry.progress(key(CORTEX), 10, 100);
    });
    expect(result.current.download).not.toBeNull();

    act(() => {
      registry.settle(key(CORTEX), 'ready', geometry(1));
    });

    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.download).toBeNull();
  });

  // A population joining the list would otherwise inherit the readings of the
  // files already read, and announce a download that is already complete.
  it('forgets what it has read when the list changes', async () => {
    const { result, rerender } = render([CORTEX]);

    act(() => {
      registry.progress(key(CORTEX), 100, 100);
      registry.settle(key(CORTEX), 'ready', geometry(1));
    });
    await waitFor(() => expect(result.current.settled).toBe(true));

    rerender({ populations: [CORTEX, THALAMUS] });

    expect(result.current).toMatchObject({ settled: false, download: null });
  });
});
