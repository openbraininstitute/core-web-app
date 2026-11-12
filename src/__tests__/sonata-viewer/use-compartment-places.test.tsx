import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCompartmentPlaces } from '@/features/sonata-viewer/hooks/use-compartment-places';

import type { ReactNode } from 'react';
import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { Compartment } from '@/features/sonata-viewer/compartment-rows';

const h = vi.hoisted(() => ({
  loading: 0,
  most: 0,
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
  resolveMorphologyLocation: () => ({ path: 'morphologies', format: 'swc', container: false }),
  morphologyFileOf: (_: unknown, name: string) => `morphologies/${name}.swc`,
}));
vi.mock('@/features/circuit-viewer/morphologies/load/read-sections', () => ({
  loadSections: async (_: unknown, { path }: { path: string }) => {
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

/** A cell per morphology, each recording one compartment on section 1. */
function places(cells: number) {
  const compartments = new Map<number, Compartment[]>(
    Array.from({ length: cells }, (_, nodeId) => [
      nodeId,
      [{ traceIndex: nodeId, section: 1, label: 'dend[0]' }],
    ])
  );
  const morphology = {
    kind: 'string',
    values: Array.from({ length: cells }, (_, nodeId) => `m${nodeId}`),
  } as unknown as ColumnValues;
  const client = new QueryClient();
  // the same between renders, as the viewer's are: new ones would start the measuring again
  const circuitConfig = { raw: {} } as ParsedCircuitConfig;
  const getColumn = async () => morphology;
  return renderHook(
    () =>
      useCompartmentPlaces({
        enabled: true,
        circuitId: 'circuit',
        circuitConfig,
        populationName: 'All',
        compartments,
        offsets: undefined,
        getColumn,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  );
}

describe('useCompartmentPlaces', () => {
  it('measures the other cells when one morphology will not load', async () => {
    h.load = async (path) => {
      if (path.includes('m1.swc')) throw new Error('404');
      return [];
    };

    const { result } = places(3);

    await waitFor(() => expect(result.current).not.toBeNull());
    expect([...(result.current?.distances.keys() ?? [])].sort()).toEqual([0, 2]);
    // halfway along a 100 µm section that starts 10 µm out
    expect(result.current?.distances.get(0)).toBe(60);
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
    h.most = 0;
    h.load = () => new Promise((resolve) => setTimeout(() => resolve([]), 1));

    const { result } = places(40);

    await waitFor(() => expect(result.current?.distances.size).toBe(40));
    expect(h.most).toBeGreaterThan(1);
    expect(h.most).toBeLessThanOrEqual(8);
  });
});
