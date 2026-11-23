import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_CONTAINER_MORPHOLOGIES,
  MAX_MEASURED_IN_CONTAINER,
  MAX_MEASURED_MORPHOLOGIES,
  useCompartmentPlaces,
} from '@/features/sonata-viewer/hooks/use-compartment-places';
import { UnmeasuredBy } from '@/features/sonata-viewer/types';

import type { ReactNode } from 'react';
import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { Compartment } from '@/features/sonata-viewer/compartment-rows';

const h = vi.hoisted(() => ({
  loading: 0,
  most: 0,
  loads: 0,
  gcTime: undefined as number | undefined,
  container: false,
  load: (_path: string): Promise<unknown> => Promise.resolve([]),
}));

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/utils/logger', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  logError: vi.fn(),
}));
vi.mock('@/features/scan-config/components/circuit-viz/sources/resolve-morphology-path', () => ({
  resolveMorphologyLocation: () => ({
    path: 'morphologies',
    format: 'swc',
    container: h.container,
  }),
  morphologyFileOf: (_: unknown, name: string) => `morphologies/${name}.swc`,
}));
vi.mock('@/features/circuit-viewer/morphologies/load/read-sections', () => ({
  loadSections: async (_: unknown, { path }: { path: string }, options?: { gcTime?: number }) => {
    h.loads += 1;
    h.gcTime = options?.gcTime;
    h.loading += 1;
    h.most = Math.max(h.most, h.loading);
    try {
      return await h.load(path);
    } finally {
      h.loading -= 1;
    }
  },
}));
vi.mock('@/features/sonata-viewer/path-distance', () => ({
  sectionPaths: () => new Map([[1, { start: 10, length: 100, type: 2 }]]),
}));

/**
 * Cells recording one compartment each on section 1, over `morphologies` morphologies, in a
 * population of `nodes`, each node past the recorded ones on a morphology of its own.
 */
function places(cells: number, morphologies = cells, nodes = cells) {
  const compartments = new Map<number, Compartment[]>(
    Array.from({ length: cells }, (_, nodeId) => [
      nodeId,
      [{ traceIndex: nodeId, section: 1, label: 'dend[0]' }],
    ])
  );
  const morphology = {
    kind: 'string',
    values: Array.from({ length: nodes }, (_, nodeId) =>
      nodeId < cells ? `m${nodeId % morphologies}` : `other${nodeId}`
    ),
  } as unknown as ColumnValues;
  const client = new QueryClient();
  // the same between renders, as the viewer's are: new ones would start the measuring again
  const circuitConfig = { raw: {} } as ParsedCircuitConfig;
  const getColumn = async () => morphology;
  return renderHook(
    ({ offsets }: { offsets?: ReadonlyMap<number, number> }) =>
      useCompartmentPlaces({
        enabled: true,
        circuitId: 'circuit',
        circuitConfig,
        populationName: 'All',
        compartments,
        offsets,
        getColumn,
      }),
    {
      initialProps: {},
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  );
}

describe('useCompartmentPlaces', () => {
  beforeEach(() => {
    h.loads = 0;
    h.most = 0;
    h.container = false;
    h.load = () => Promise.resolve([]);
  });

  it('measures the other cells when one morphology will not load', async () => {
    h.load = async (path) => {
      if (path.includes('m1.swc')) throw new Error('404');
      return [];
    };

    const { result } = places(3);

    await waitFor(() => expect(result.current.places).not.toBeNull());
    expect([...(result.current.places?.distances.keys() ?? [])].sort()).toEqual([0, 2]);
    // halfway along a 100 µm section that starts 10 µm out
    expect(result.current.places?.distances.get(0)).toBe(60);
  });

  it('asks for no more morphologies once it is let go of', async () => {
    const answer: (() => void)[] = [];
    h.load = () => new Promise((resolve) => answer.push(() => resolve([])));
    const { unmount } = places(40);
    await waitFor(() => expect(answer).toHaveLength(8));

    unmount();
    for (const done of answer) done();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(answer).toHaveLength(8);
  });

  it('asks for a few morphologies at a time, not every cell’s at once', async () => {
    h.load = () => new Promise((resolve) => setTimeout(() => resolve([]), 1));

    const { result } = places(40);

    await waitFor(() => expect(result.current.places?.distances.size).toBe(40));
    expect(h.most).toBeGreaterThan(1);
    expect(h.most).toBeLessThanOrEqual(8);
  });

  describe('over the morphology limit', () => {
    it('measures nothing and says how many there are', async () => {
      const { result } = places(MAX_MEASURED_MORPHOLOGIES + 1);

      await waitFor(() =>
        expect(result.current.unmeasured).toEqual({
          by: UnmeasuredBy.Report,
          morphologies: MAX_MEASURED_MORPHOLOGIES + 1,
          limit: MAX_MEASURED_MORPHOLOGIES,
        })
      );
      expect(result.current.places).toBeNull();
      expect(h.loads).toBe(0);
    });

    it('measures a report at the limit, counting a shared morphology once', async () => {
      const { result } = places(MAX_MEASURED_MORPHOLOGIES + 100, MAX_MEASURED_MORPHOLOGIES);

      await waitFor(() =>
        expect(result.current.places?.distances.size).toBe(MAX_MEASURED_MORPHOLOGIES + 100)
      );
      expect(h.loads).toBe(MAX_MEASURED_MORPHOLOGIES);
      expect(result.current.unmeasured).toBeNull();
      expect(h.gcTime).toBe(60 * 1000);
    });

    it('measures again from the kept paths, not the morphologies', async () => {
      const { result, rerender } = places(3);
      await waitFor(() => expect(result.current.places).not.toBeNull());
      expect(h.loads).toBe(3);

      rerender({ offsets: new Map([[0, 0.25]]) });

      await waitFor(() => expect(result.current.places?.distances.get(0)).toBe(35));
      expect(h.loads).toBe(3);
    });

    it('holds a container circuit to its lower limit, one morphology at a time', async () => {
      h.container = true;
      h.load = () => new Promise((resolve) => setTimeout(() => resolve([]), 1));

      const over = places(MAX_MEASURED_IN_CONTAINER + 1);
      await waitFor(() =>
        expect(over.result.current.unmeasured).toEqual({
          by: UnmeasuredBy.ReportInContainer,
          morphologies: MAX_MEASURED_IN_CONTAINER + 1,
          limit: MAX_MEASURED_IN_CONTAINER,
        })
      );
      expect(h.loads).toBe(0);

      const at = places(MAX_MEASURED_IN_CONTAINER);
      await waitFor(() =>
        expect(at.result.current.places?.distances.size).toBe(MAX_MEASURED_IN_CONTAINER)
      );
      expect(h.most).toBe(1);
    });

    it('reads nothing from a container holding more morphologies than its limit', async () => {
      h.container = true;

      const big = places(2, 2, MAX_CONTAINER_MORPHOLOGIES + 1);
      await waitFor(() =>
        expect(big.result.current.unmeasured).toEqual({
          by: UnmeasuredBy.Container,
          morphologies: MAX_CONTAINER_MORPHOLOGIES + 1,
          limit: MAX_CONTAINER_MORPHOLOGIES,
        })
      );
      expect(h.loads).toBe(0);

      const small = places(2, 2, MAX_CONTAINER_MORPHOLOGIES);
      await waitFor(() => expect(small.result.current.places?.distances.size).toBe(2));
    });
  });
});
