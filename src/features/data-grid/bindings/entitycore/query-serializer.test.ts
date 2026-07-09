import { describe, expect, it } from 'vitest';

import { OperatorId } from '../../core';
import { serializeQuery, toContainsPattern } from './query-serializer';

import type { FilterEntry, FilterValue, GridQuery, GridSchema } from '../../core';

type Row = { id: string };

const schema: GridSchema<Row> = {
  id: 'test',
  columns: [
    { id: 'name', header: 'Name', filter: { operators: [OperatorId.Ilike], field: 'name' } },
    {
      id: 'mtype',
      header: 'M-type',
      sortField: 'mtype__pref_label',
      filter: { operators: [OperatorId.In], field: 'mtype__pref_label', facetKey: 'mtype' },
    },
    {
      id: 'protocol',
      header: 'Protocol',
      filter: {
        operators: [OperatorId.NotIn],
        field: 'cell_morphology_protocol__generation_type',
      },
    },
    { id: 'weight', header: 'Weight', field: 'weight' },
    {
      id: 'registrationDate',
      header: 'Registered',
      field: 'creation_date',
      sortField: 'creation_date',
    },
    { id: 'multi', header: 'Multi', sortField: ['a', 'b'] },
  ],
  getRowId: (r) => r.id,
};

function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

function entry(columnId: string, operator: string, value: FilterValue): FilterEntry {
  return { columnId, operator, value };
}

describe('serializeQuery — paging & host params', () => {
  it('always carries page/page_size and merges host params', () => {
    const params = serializeQuery(
      query({ page: 3, pageSize: 50, params: { with_facets: true, authorized_public: false } }),
      schema
    );
    expect(params).toEqual({
      page: 3,
      page_size: 50,
      with_facets: true,
      authorized_public: false,
    });
  });
});

describe('serializeQuery — operators', () => {
  it('ilike wraps in %…% and escapes % and _', () => {
    expect(toContainsPattern('a%b_c')).toBe('%a\\%b\\_c%');
    const params = serializeQuery(
      query({
        filters: { name: entry('name', OperatorId.Ilike, { kind: 'text', text: ' foo ' }) },
      }),
      schema
    );
    expect(params.name__ilike).toBe('%foo%');
  });

  it('in / notIn serialize arrays with the __in / __not_in suffixes', () => {
    const params = serializeQuery(
      query({
        filters: {
          mtype: entry('mtype', OperatorId.In, { kind: 'set', values: ['L5_TPC', 'L23_BP'] }),
          protocol: entry('protocol', OperatorId.NotIn, { kind: 'set', values: ['computational'] }),
        },
      }),
      schema
    );
    expect(params.mtype__pref_label__in).toEqual(['L5_TPC', 'L23_BP']);
    expect(params.cell_morphology_protocol__generation_type__not_in).toEqual(['computational']);
  });

  it('eq uses the bare field; contains uses __contains', () => {
    const p1 = serializeQuery(
      query({ filters: { name: entry('name', OperatorId.Eq, { kind: 'text', text: 'exact' }) } }),
      schema
    );
    expect(p1.name).toBe('exact');
    const p2 = serializeQuery(
      query({
        filters: { name: entry('name', OperatorId.Contains, { kind: 'text', text: 'Sub' }) },
      }),
      schema
    );
    expect(p2.name__contains).toBe('Sub');
  });

  it('range and dateRange expand to __gte/__lte, eliding open ends', () => {
    const p1 = serializeQuery(
      query({
        filters: {
          weight: entry('weight', OperatorId.Range, { kind: 'range', min: 1, max: null }),
        },
      }),
      schema
    );
    expect(p1.weight__gte).toBe(1);
    expect(p1).not.toHaveProperty('weight__lte');

    const p2 = serializeQuery(
      query({
        filters: {
          registrationDate: entry('registrationDate', OperatorId.DateRange, {
            kind: 'dateRange',
            from: '2026-01-01T00:00:00.000Z',
            to: '2026-02-01T00:00:00.000Z',
          }),
        },
      }),
      schema
    );
    expect(p2.creation_date__gte).toBe('2026-01-01T00:00:00.000Z');
    expect(p2.creation_date__lte).toBe('2026-02-01T00:00:00.000Z');
  });

  it('empty values serialize to nothing', () => {
    const params = serializeQuery(
      query({
        filters: {
          name: entry('name', OperatorId.Ilike, { kind: 'text', text: '   ' }),
          mtype: entry('mtype', OperatorId.In, { kind: 'set', values: [] }),
        },
      }),
      schema
    );
    expect(Object.keys(params).sort()).toEqual(['page', 'page_size']);
  });

  it('unknown operators are skipped rather than crashing', () => {
    const params = serializeQuery(
      query({ filters: { name: entry('name', 'nope', { kind: 'text', text: 'x' }) } }),
      schema
    );
    expect(Object.keys(params).sort()).toEqual(['page', 'page_size']);
  });
});

describe('serializeQuery — sort', () => {
  it('serializes order_by with +/- and preserves multi-sort order', () => {
    const params = serializeQuery(
      query({
        sort: [
          { columnId: 'registrationDate', direction: 'desc' },
          { columnId: 'name', direction: 'asc' },
        ],
      }),
      schema
    );
    expect(params.order_by).toEqual(['-creation_date', '+name']);
  });

  it('expands multi-field sortField and omits order_by when unsorted', () => {
    const params = serializeQuery(
      query({ sort: [{ columnId: 'multi', direction: 'asc' }] }),
      schema
    );
    expect(params.order_by).toEqual(['+a', '+b']);
    expect(serializeQuery(query(), schema)).not.toHaveProperty('order_by');
  });
});

describe('serializeQuery — quick filter', () => {
  it('maps to ilike_search with *…* in ilike mode, plain search otherwise', () => {
    const p1 = serializeQuery(query({ quickFilter: 'mouse' }), schema, { searchMode: 'ilike' });
    expect(p1.ilike_search).toBe('*mouse*');
    const p2 = serializeQuery(query({ quickFilter: 'mouse' }), schema, { searchMode: 'plain' });
    expect(p2.search).toBe('mouse');
    const p3 = serializeQuery(query({ quickFilter: '  ' }), schema);
    expect(p3).not.toHaveProperty('search');
  });
});
