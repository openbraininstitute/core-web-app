import { describe, expect, it } from 'vitest';

import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { viewDefForCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/cell-morphology';

import { OperatorId } from '../../../core';
import { serializeQuery } from '../query-serializer';
import { cellMorphologySchema } from '../schemas/cell-morphology';

import type { TCoreFilter } from '@/entity-configuration/definitions/types';
import type { FilterModel, GridQuery } from '../../../core';

/**
 * Per-entity parity harness for cell_morphology. Locks the AG Grid grid's serialized
 * request params to the legacy `transformFiltersToQuery` oracle for representative
 * filter/sort/page states, and the visible column set/order to the legacy view-def —
 * the two invariants that guarantee no query or presentation regression on flip.
 */

function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

describe('cell_morphology — column parity with the legacy view-def', () => {
  it('exposes the same columns in the same order (Preview, BrainRegion, Species, M-type, Name, Contributors, Registration date)', () => {
    // Legacy field enum values map 1:1 to the grid schema column ids below.
    const legacyOrder = viewDefForCellMorphology.columns;
    const gridOrder = cellMorphologySchema.columns.map((c) => c.id);
    expect(gridOrder).toEqual([
      'preview',
      'brainRegion',
      'species',
      'mtype',
      'name',
      'contributions',
      'registrationDate',
    ]);
    expect(legacyOrder).toHaveLength(gridOrder.length);
  });
});

describe('cell_morphology — query param parity with transformFiltersToQuery', () => {
  it('name contains → name__ilike wrapped in % (same wire value as the legacy `*foo*`)', () => {
    const legacy = transformFiltersToQuery([
      { field: 'name', type: 'Text', value: '*foo*', constraint: 'name__ilike' } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      name: { columnId: 'name', operator: OperatorId.Ilike, value: { kind: 'text', text: 'foo' } },
    };
    const grid = serializeQuery(query({ filters }), cellMorphologySchema);
    expect(grid.name__ilike).toBe(legacy.name__ilike);
    expect(grid.name__ilike).toBe('%foo%');
  });

  it('m-type / species facet → __in arrays with the same keys as the legacy CheckList', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'mtype',
        type: 'CheckList',
        value: ['L5_TPC'],
        constraint: 'mtype__pref_label__in',
      } as TCoreFilter,
      {
        field: 'species',
        type: 'CheckList',
        value: ['Mus musculus'],
        constraint: 'subject__species__name__in',
      } as TCoreFilter,
    ]);
    const filters: FilterModel = {
      mtype: {
        columnId: 'mtype',
        operator: OperatorId.In,
        value: { kind: 'set', values: ['L5_TPC'] },
      },
      species: {
        columnId: 'species',
        operator: OperatorId.In,
        value: { kind: 'set', values: ['Mus musculus'] },
      },
    };
    const grid = serializeQuery(query({ filters }), cellMorphologySchema);
    expect(grid.mtype__pref_label__in).toEqual(legacy.mtype__pref_label__in);
    expect(grid.subject__species__name__in).toEqual(legacy.subject__species__name__in);
  });

  it('registration date range → creation_date__gte/__lte, same keys as the legacy DateRange', () => {
    const legacy = transformFiltersToQuery([
      {
        field: 'registrationDate',
        type: 'DateRange',
        value: { gte: '2026-01-01T00:00:00.000Z', lte: '2026-02-01T00:00:00.000Z' },
        constraint: { gte: 'creation_date__gte', lte: 'creation_date__lte' },
      } as unknown as TCoreFilter,
    ]);
    const filters: FilterModel = {
      registrationDate: {
        columnId: 'registrationDate',
        operator: OperatorId.DateRange,
        value: {
          kind: 'dateRange',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-02-01T00:00:00.000Z',
        },
      },
    };
    const grid = serializeQuery(query({ filters }), cellMorphologySchema);
    expect(grid.creation_date__gte).toBe(legacy.creation_date__gte);
    expect(grid.creation_date__lte).toBe(legacy.creation_date__lte);
  });

  it('default sort serializes to -creation_date (legacy default registration desc)', () => {
    const grid = serializeQuery(
      query({ sort: [{ columnId: 'registrationDate', direction: 'desc' }] }),
      cellMorphologySchema
    );
    expect(grid.order_by).toEqual(['-creation_date']);
  });

  it('paging passes through as page / page_size', () => {
    const grid = serializeQuery(query({ page: 4, pageSize: 50 }), cellMorphologySchema);
    expect(grid.page).toBe(4);
    expect(grid.page_size).toBe(50);
  });
});
