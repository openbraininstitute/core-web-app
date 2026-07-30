import { describe, expect, it, vi } from 'vitest';

import { circuitSchema } from '../../entitycore/schemas/circuit';
import { CIRCUIT_VIEW_PARAM, createCircuitDataSource } from '../data-source';

import type { QueryClient } from '@tanstack/react-query';
import type { GridQuery } from '../../../core';

// Mock the entitycore circuit queries so the FLAT branch never hits the network; the
// flat path delegates through `Circuit.api.query.list` → `getCircuits`.
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

function baseQuery(over: Partial<GridQuery> = {}): GridQuery {
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
    // the internal view marker must never reach the server
    expect(filters).not.toHaveProperty(CIRCUIT_VIEW_PARAM);
    // host params (brain region) and paging pass through unchanged
    expect(filters.within_brain_region_brain_region_id).toBe('br-1');
    expect(filters.page).toBe(2);
    expect(filters.page_size).toBe(20);
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
  // Only B matches the current filters → A is kept (filtered descendant), C is dropped.
  const filteredSubset = {
    data: [circuit('B', 'Beta')],
    facets: undefined,
    pagination: { page: 1, page_size: 20, total_items: 1 },
  };

  // A fake query client that returns fixtures per cache key, never invoking queryFn
  // (so no network) — mirrors the shared cache the hooks would populate.
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

    // Root A survives (has a filtered descendant); root C is pruned.
    expect(page.rows.map((r) => r.id)).toEqual(['A']);
    expect(page.total).toBe(1);

    const rootA = page.rows[0] as unknown as {
      id: string;
      isFiltered: boolean;
      sub_circuits: Array<{ id: string; isFiltered: boolean }>;
    };
    // A itself is NOT a filter match → grayed out; its child B IS a match.
    expect(rootA.isFiltered).toBe(false);
    expect(rootA.sub_circuits.map((c) => c.id)).toEqual(['B']);
    expect(rootA.sub_circuits[0].isFiltered).toBe(true);
  });
});
