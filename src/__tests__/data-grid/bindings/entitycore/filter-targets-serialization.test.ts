import { describe, expect, it } from 'vitest';

import { speciesColumn } from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { FilterValueKind, OperatorId } from '@/features/data-grid/core';

import type { IGridQuery, IGridSchema, TFilterValue } from '@/features/data-grid/core';

type Row = { id: string; subject?: { species?: { name?: string } } };

const SPECIES_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const schema: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  columns: [
    speciesColumn<Row>(),
    // legacy single-field column (no `targets`) — the back-compat baseline
    { id: 'name', header: 'Name', filter: { operators: [OperatorId.Ilike], field: 'name' } },
    { id: 'weight', header: 'Weight', field: 'weight' },
  ],
};

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

function set(values: string[]): TFilterValue {
  return { kind: FilterValueKind.Set, values };
}

describe('serializeQuery — filter targets', () => {
  it('resolves the field from the ACTIVE target', () => {
    const params = serializeQuery(
      query({
        filters: {
          species: {
            columnId: 'species',
            operator: OperatorId.In,
            targetId: 'id',
            value: set([SPECIES_ID]),
          },
        },
      }),
      schema
    );
    // `subject__species__id__in` is a real entitycore query param (openapi.json)
    expect(params.subject__species__id__in).toEqual([SPECIES_ID]);
    expect(params).not.toHaveProperty('subject__species__name__in');
  });

  it('the name target keeps the historical field', () => {
    const params = serializeQuery(
      query({
        filters: {
          species: {
            columnId: 'species',
            operator: OperatorId.In,
            targetId: 'name',
            value: set(['Mus musculus']),
          },
        },
      }),
      schema
    );
    expect(params.subject__species__name__in).toEqual(['Mus musculus']);
  });

  it('BACK-COMPAT: an entry with no targetId serializes exactly as before', () => {
    const withoutTargetId = serializeQuery(
      query({
        filters: {
          species: { columnId: 'species', operator: OperatorId.In, value: set(['Mus musculus']) },
          name: {
            columnId: 'name',
            operator: OperatorId.Ilike,
            value: { kind: FilterValueKind.Text, text: 'foo' },
          },
          weight: {
            columnId: 'weight',
            operator: OperatorId.Range,
            value: { kind: FilterValueKind.Range, min: 1, max: 2 },
          },
        },
      }),
      schema
    );
    expect(withoutTargetId).toEqual({
      page: 1,
      page_size: 20,
      subject__species__name__in: ['Mus musculus'],
      name__ilike: '%foo%',
      weight__gte: 1,
      weight__lte: 2,
    });
  });

  it('an unknown targetId falls back to the first target rather than dropping the filter', () => {
    const params = serializeQuery(
      query({
        filters: {
          species: {
            columnId: 'species',
            operator: OperatorId.In,
            targetId: 'removed-target',
            value: set(['Mus musculus']),
          },
          name: {
            columnId: 'name',
            operator: OperatorId.Ilike,
            targetId: 'also-unknown',
            value: { kind: FilterValueKind.Text, text: 'foo' },
          },
        },
      }),
      schema
    );
    expect(params.subject__species__name__in).toEqual(['Mus musculus']);
    expect(params.name__ilike).toBe('%foo%');
  });
});

describe('speciesColumn — declared targets', () => {
  const targets = speciesColumn<Row>().filter?.targets ?? [];

  it('keeps the name target first (the default) and adds the id target', () => {
    expect(targets.map((t) => t.id)).toEqual(['name', 'id']);
    expect(targets[0]).toMatchObject({
      field: 'subject__species__name',
      facetKey: 'species',
      operators: [OperatorId.In, OperatorId.Ilike],
    });
    expect(targets[1]).toMatchObject({
      field: 'subject__species__id',
      operators: [OperatorId.In],
    });
    // no facets for the id target — it is a free-entry (paste ids) target
    expect(targets[1]?.options).toBeUndefined();
    expect(targets[1]?.facetKey).toBeUndefined();
  });

  it('leaves the flat filter props (used by non-target-aware readers) untouched', () => {
    expect(speciesColumn<Row>().filter).toMatchObject({
      field: 'subject__species__name',
      facetKey: 'species',
      operators: [OperatorId.In, OperatorId.Ilike],
    });
  });
});
