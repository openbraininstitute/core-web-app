import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createEntitycorePagedDataSource } from '@/features/data-grid/bindings/entitycore/data-source.paged';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import { FilterValueKind, OperatorId } from '@/features/data-grid/core';

import type { IGridQuery } from '@/features/data-grid/core';

/**
 * Rows and facets ride separate requests: faceting the whole filtered set costs far
 * more than one page, so a combined request makes the table wait on it.
 */

const WORKSPACE = { virtualLabId: 'vl', projectId: 'pr' };

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 30, sort: [], filters: {}, ...over };
}

type TListArgs = { filters: Record<string, unknown>; withFacets?: boolean };

function makeSource(over: { withFacets?: boolean } = {}) {
  const listQueryFn = vi.fn(async (_args: TListArgs) => ({
    data: [],
    facets: { species: [{ id: 's1', label: 'Mus musculus', count: 3 }] },
    pagination: { page: 1, page_size: 30, total_items: 0 },
  }));
  const source = createEntitycorePagedDataSource({
    dataType: ExtendedEntitiesTypeDict.CellMorphology,
    schema: cellMorphologySchema,
    context: WORKSPACE,
    listQueryFn: listQueryFn as never,
    ...over,
  });
  return { source, listQueryFn };
}

describe('entitycore paged source — rows and facets are separate requests', () => {
  it('never asks the row request to compute facets', async () => {
    const { source, listQueryFn } = makeSource();
    await source.fetch(query({ page: 3 }));

    expect(listQueryFn).toHaveBeenCalledTimes(1);
    const args = listQueryFn.mock.calls[0][0];
    expect(args.withFacets).toBe(false);
    expect(args.filters.page).toBe(3);
  });

  it('drops the facets the row response happens to carry, so the pane has one source', async () => {
    const { source } = makeSource();
    const page = await source.fetch(query());
    expect(page.facets).toBeUndefined();
  });

  it('asks the facets request for zero rows', async () => {
    const { source, listQueryFn } = makeSource();
    const facets = await source.fetchFacets?.(query({ page: 4 }));

    const args = listQueryFn.mock.calls[0][0];
    expect(args.withFacets).toBe(true);
    expect(args.filters.page_size).toBe(0);
    expect(args.filters.page).toBe(1);
    expect(facets).toEqual({ species: [{ id: 's1', label: 'Mus musculus', count: 3 }] });
  });

  it('faces the same filters as the rows, so counts describe what is listed', async () => {
    const filters = {
      species: {
        columnId: 'species',
        operator: OperatorId.In,
        value: { kind: FilterValueKind.Set, values: ['Mus musculus'] },
      },
    };
    const { source, listQueryFn } = makeSource();

    await source.fetch(query({ filters }));
    await source.fetchFacets?.(query({ filters }));

    const [rowArgs, facetArgs] = listQueryFn.mock.calls.map((c) => c[0].filters);
    expect(rowArgs.subject__species__name__in).toEqual(['Mus musculus']);
    expect(facetArgs.subject__species__name__in).toEqual(['Mus musculus']);
  });

  it('offers no facets fetch at all when the host supplies its own', async () => {
    const { source } = makeSource({ withFacets: false });
    expect(source.fetchFacets).toBeUndefined();
  });
});
