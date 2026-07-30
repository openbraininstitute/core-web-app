import { describe, expect, it } from 'vitest';

import { OperatorId } from '../../core';
import {
  computeInMemoryFacets,
  createInMemoryDataSource,
  type InMemoryColumn,
  runInMemoryQuery,
} from './data-source';

import type { GridQuery } from '../../core';

interface Row {
  id: string;
  name: string;
  count: number;
  region: string;
  active: boolean;
  meta: { seed: number };
}

const rows: Row[] = [
  { id: 'a', name: 'Alpha', count: 3, region: 'CA1', active: true, meta: { seed: 30 } },
  { id: 'b', name: 'Beta', count: 1, region: 'CA1', active: false, meta: { seed: 10 } },
  { id: 'c', name: 'Gamma', count: 2, region: 'CA3', active: true, meta: { seed: 20 } },
];

const columns: Array<InMemoryColumn<Row>> = [
  { id: 'name', field: 'name', filter: { operators: [OperatorId.Ilike] } },
  { id: 'count', field: 'count', filter: { operators: [OperatorId.Range] } },
  { id: 'region', field: 'region', filter: { operators: [OperatorId.In] } },
  { id: 'active', field: 'active', filter: { operators: [OperatorId.Bool] } },
  { id: 'seed', getValue: (r) => r.meta.seed },
];

function query(partial: Partial<GridQuery>): GridQuery {
  return { page: 1, pageSize: 50, sort: [], filters: {}, ...partial };
}

describe('runInMemoryQuery — filtering', () => {
  it('ilike text filter is case-insensitive and substring', () => {
    const page = runInMemoryQuery(
      rows,
      query({
        filters: {
          name: {
            columnId: 'name',
            operator: OperatorId.Ilike,
            value: { kind: 'text', text: 'a' },
          },
        },
      }),
      { columns }
    );
    // Alpha, Beta, Gamma all contain "a" (case-insensitive)
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);

    const page2 = runInMemoryQuery(
      rows,
      query({
        filters: {
          name: {
            columnId: 'name',
            operator: OperatorId.Ilike,
            value: { kind: 'text', text: 'gam' },
          },
        },
      }),
      { columns }
    );
    expect(page2.rows.map((r) => r.id)).toEqual(['c']);
  });

  it('range filter honours min/max on a numeric field', () => {
    const page = runInMemoryQuery(
      rows,
      query({
        filters: {
          count: {
            columnId: 'count',
            operator: OperatorId.Range,
            value: { kind: 'range', min: 2, max: null },
          },
        },
      }),
      { columns }
    );
    expect(page.rows.map((r) => r.id).sort()).toEqual(['a', 'c']);
  });

  it('set (in) filter matches membership by value', () => {
    const page = runInMemoryQuery(
      rows,
      query({
        filters: {
          region: {
            columnId: 'region',
            operator: OperatorId.In,
            value: { kind: 'set', values: ['CA3'] },
          },
        },
      }),
      { columns }
    );
    expect(page.rows.map((r) => r.id)).toEqual(['c']);
  });

  it('boolean filter compares truthiness', () => {
    const page = runInMemoryQuery(
      rows,
      query({
        filters: {
          active: {
            columnId: 'active',
            operator: OperatorId.Bool,
            value: { kind: 'boolean', value: false },
          },
        },
      }),
      { columns }
    );
    expect(page.rows.map((r) => r.id)).toEqual(['b']);
  });

  it('quick filter matches across all columns (incl. getValue)', () => {
    const page = runInMemoryQuery(rows, query({ quickFilter: '20' }), { columns });
    expect(page.rows.map((r) => r.id)).toEqual(['c']); // meta.seed === 20 via getValue
  });

  it('an empty filter value is a no-op (returns all rows)', () => {
    const page = runInMemoryQuery(
      rows,
      query({
        filters: {
          name: {
            columnId: 'name',
            operator: OperatorId.Ilike,
            value: { kind: 'text', text: '  ' },
          },
        },
      }),
      { columns }
    );
    expect(page.rows).toHaveLength(3);
  });
});

describe('runInMemoryQuery — sorting', () => {
  it('sorts numerically ascending/descending via getValue', () => {
    const asc = runInMemoryQuery(rows, query({ sort: [{ columnId: 'seed', direction: 'asc' }] }), {
      columns,
    });
    expect(asc.rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
    const desc = runInMemoryQuery(
      rows,
      query({ sort: [{ columnId: 'seed', direction: 'desc' }] }),
      { columns }
    );
    expect(desc.rows.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts strings with localeCompare', () => {
    const desc = runInMemoryQuery(
      rows,
      query({ sort: [{ columnId: 'name', direction: 'desc' }] }),
      { columns }
    );
    expect(desc.rows.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('runInMemoryQuery — pagination', () => {
  it('slices to the requested page', () => {
    const page = runInMemoryQuery(
      rows,
      query({ page: 2, pageSize: 2, sort: [{ columnId: 'name', direction: 'asc' }] }),
      {
        columns,
      }
    );
    expect(page.total).toBe(3);
    expect(page.rows.map((r) => r.id)).toEqual(['c']);
  });

  it('returns every row when pagination is disabled', () => {
    const page = runInMemoryQuery(rows, query({ page: 2, pageSize: 2 }), {
      columns,
      disablePagination: true,
    });
    expect(page.rows).toHaveLength(3);
    expect(page.total).toBe(3);
  });
});

describe('computeInMemoryFacets', () => {
  it('builds stable buckets with counts for set-filter columns only', () => {
    const facets = computeInMemoryFacets(rows, columns);
    expect(Object.keys(facets)).toEqual(['region']);
    expect(facets.region).toEqual([
      { id: 'CA1', label: 'CA1', count: 2 },
      { id: 'CA3', label: 'CA3', count: 1 },
    ]);
  });
});

describe('createInMemoryDataSource', () => {
  it('resolves the query as a GridDataSource with facets', async () => {
    const source = createInMemoryDataSource(rows, { columns });
    const page = await source.fetch(
      query({ page: 1, pageSize: 2, sort: [{ columnId: 'name', direction: 'asc' }] })
    );
    expect(page.total).toBe(3);
    expect(page.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(page.facets?.region).toHaveLength(2);
  });
});
