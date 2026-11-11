import { describe, expect, it, vi } from 'vitest';

import {
  CIRCUIT_VIEW_PARAM,
  createCircuitDataSource,
} from '@/features/data-grid/bindings/circuit/data-source';
import { circuitSchema } from '@/features/data-grid/bindings/entitycore/schemas/circuit';

import type { QueryClient } from '@tanstack/react-query';
import type { IGridQuery } from '@/features/data-grid/core';

// mock the entitycore circuit queries so the flat branch never hits the network
const getCircuits = vi.fn(async (_args: { filters?: Record<string, unknown> }) => ({
  data: [],
  facets: undefined,
  pagination: { page: 1, page_size: 20, total_items: 0 },
}));
vi.mock('@/api/entitycore/queries/model/circuit', () => ({
  getCircuits: (args: { filters?: Record<string, unknown> }) => getCircuits(args),
  getCircuit: vi.fn(),
  getCircuitHierarchyByDerivation: vi.fn(),
}));

const WORKSPACE = { virtualLabId: 'vl', projectId: 'pr' };

function baseQuery(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

describe('createCircuitDataSource — flat branch', () => {
  it('strips the __view marker and delegates the standard entitycore params', async () => {
    getCircuits.mockClear();
    const source = createCircuitDataSource({
      schema: circuitSchema,
      workspace: WORKSPACE,
      queryClient: {} as unknown as QueryClient,
    });

    await source.fetch(
      baseQuery({
        page: 2,
        pageSize: 20,
        params: { [CIRCUIT_VIEW_PARAM]: 'flat', within_brain_region_brain_region_id: 'br-1' },
      })
    );

    expect(getCircuits).toHaveBeenCalledTimes(1);
    const filters = (getCircuits.mock.calls[0]?.[0]?.filters ?? {}) as Record<string, unknown>;
    expect(filters).not.toHaveProperty(CIRCUIT_VIEW_PARAM);
    expect(filters.within_brain_region_brain_region_id).toBe('br-1');
    expect(filters.page).toBe(2);
    expect(filters.page_size).toBe(20);
  });

  it('facets the flat view from the endpoint, with no rows', async () => {
    getCircuits.mockClear();
    const source = createCircuitDataSource({
      schema: circuitSchema,
      workspace: WORKSPACE,
      queryClient: {} as unknown as QueryClient,
    });

    await source.fetchFacets?.(baseQuery({ params: { [CIRCUIT_VIEW_PARAM]: 'flat' } }));

    expect(getCircuits).toHaveBeenCalledTimes(1);
    const filters = (getCircuits.mock.calls[0]?.[0]?.filters ?? {}) as Record<string, unknown>;
    expect(filters).not.toHaveProperty(CIRCUIT_VIEW_PARAM);
    expect(filters.page_size).toBe(0);
  });

  // the hierarchy builds its rows client-side and the legacy listing gave it no
  // buckets — faceting it here would be a new request that view never made
  it('asks for nothing at all in the hierarchy view', async () => {
    getCircuits.mockClear();
    const source = createCircuitDataSource({
      schema: circuitSchema,
      workspace: WORKSPACE,
      queryClient: {} as unknown as QueryClient,
    });

    const facets = await source.fetchFacets?.(
      baseQuery({ params: { [CIRCUIT_VIEW_PARAM]: 'hierarchy' } })
    );

    expect(facets).toBeUndefined();
    expect(getCircuits).not.toHaveBeenCalled();
  });
});

describe('createCircuitDataSource — hierarchy branch (gray-out tree)', () => {
  // Tree:  A → B ,  C   (roots A and C; B is A's subcircuit)
  const tree = {
    data: [
      { id: 'A', children: [{ id: 'B', children: [] }] },
      { id: 'C', children: [] },
    ],
  };
  const circuit = (id: string, name: string) => ({ id, name, type: 'circuit' });
  const fullList = {
    data: [circuit('A', 'Alpha'), circuit('B', 'Beta'), circuit('C', 'Gamma')],
    facets: undefined,
    pagination: { page: 1, page_size: 20, total_items: 3 },
  };
  const filteredSubset = {
    data: [circuit('B', 'Beta')],
    facets: undefined,
    pagination: { page: 1, page_size: 20, total_items: 1 },
  };

  // a fake query client returning fixtures per cache key, never invoking queryFn
  const fakeQueryClient = {
    fetchQuery: vi.fn(async ({ queryKey }: { queryKey: [string, Record<string, unknown>] }) => {
      const [name, params] = queryKey;
      if (name.includes('circuit-derivation')) return tree;
      if (name.includes('many-circuits')) {
        // full-hierarchy fetch carries `id__id`; the filtered fetch does not.
        return 'id__id' in params ? fullList : filteredSubset;
      }
      throw new Error(`unexpected key ${name}`);
    }),
  } as unknown as QueryClient;

  it('returns enriched root nodes, keeping filtered-in and graying-out the rest', async () => {
    const source = createCircuitDataSource({
      schema: circuitSchema,
      workspace: WORKSPACE,
      queryClient: fakeQueryClient,
    });

    const page = await source.fetch(baseQuery({ params: { [CIRCUIT_VIEW_PARAM]: 'hierarchy' } }));

    expect(page.rows.map((r) => r.id)).toEqual(['A']);
    // only B matches; A is kept solely as the path to it, so it is not counted
    expect(page.total).toBe(1);
    // the tree is returned whole — a page number would cut through it
    expect(page.singlePage).toBe(true);

    const rootA = page.rows[0] as unknown as {
      id: string;
      isFiltered: boolean;
      sub_circuits: Array<{ id: string; isFiltered: boolean }>;
    };
    expect(rootA.isFiltered).toBe(false);
    expect(rootA.sub_circuits.map((c) => c.id)).toEqual(['B']);
    expect(rootA.sub_circuits[0].isFiltered).toBe(true);
  });

  // regression: `total` used to be `roots.length`, so an unfiltered tree holding every
  // circuit reported only its top level — "2 of 3" against the sidebar's flat count
  it('counts every circuit in the tree, not just the roots, when nothing is filtered out', async () => {
    const unfilteredClient = {
      fetchQuery: vi.fn(async ({ queryKey }: { queryKey: [string, Record<string, unknown>] }) => {
        const [name] = queryKey;
        if (name.includes('circuit-derivation')) return tree;
        if (name.includes('many-circuits')) return fullList;
        throw new Error(`unexpected key ${name}`);
      }),
    } as unknown as QueryClient;

    const page = await createCircuitDataSource({
      schema: circuitSchema,
      workspace: WORKSPACE,
      queryClient: unfilteredClient,
    }).fetch(baseQuery({ params: { [CIRCUIT_VIEW_PARAM]: 'hierarchy' } }));

    // 2 roots on screen (A, C), but A carries B — 3 circuits in all
    expect(page.rows.map((r) => r.id)).toEqual(['A', 'C']);
    expect(page.total).toBe(3);
  });
});
