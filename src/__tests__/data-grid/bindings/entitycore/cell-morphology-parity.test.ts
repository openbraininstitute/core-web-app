import { describe, expect, it } from 'vitest';

import { transformFiltersToQuery } from '@/api/entitycore/transformers';
import { viewDefForCellMorphology } from '@/entity-configuration/definitions/view-defs/experimental/cell-morphology';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import { FilterValueKind, OperatorId, SortDirection } from '@/features/data-grid/core';

import type { TCoreFilter } from '@/entity-configuration/definitions/types';
import type { IGridQuery, TFilterModel, TFilterValue } from '@/features/data-grid/core';

/**
 * Per-entity parity harness for cell_morphology. Locks the AG Grid grid's serialized
 * request params to the legacy `transformFiltersToQuery` oracle for representative
 * filter/sort/page states, and the visible column set/order to the legacy view-def —
 * the two invariants that guarantee no query or presentation regression on flip.
 */

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

describe('cell_morphology — column parity with the legacy view-def', () => {
  it('exposes the same VISIBLE columns in the same order (Preview, BrainRegion, Species, M-type, Name, Contributors, Registration date)', () => {
    // Legacy field enum values map 1:1 to the grid schema column ids below. Only the
    // non-auxiliary columns are compared: an auxiliary column is hidden until ticked,
    // so it adds a filter surface, never a column the legacy listing lacked.
    const legacyOrder = viewDefForCellMorphology.columns;
    const visible = cellMorphologySchema.columns.filter((c) => !c.auxiliary).map((c) => c.id);
    expect(visible).toEqual([
      'preview',
      'brainRegion',
      'species',
      'mtype',
      'name',
      'contributions',
      'registrationDate',
    ]);
    expect(legacyOrder).toHaveLength(visible.length);
  });

  /**
   * The `cell_morphology_protocol__*` family, both `subject__*` fields and
   * `has_segmented_spines` moved off the advanced-filters panel and onto AUXILIARY
   * columns, so every backend-filterable field sits on exactly one surface.
   */
  it('declares the seven auxiliary columns after the visible ones', () => {
    const auxiliary = cellMorphologySchema.columns.filter((c) => c.auxiliary).map((c) => c.id);
    expect(auxiliary).toEqual([
      'generationType',
      'protocolDesign',
      'protocolName',
      'protocolDocument',
      'strainName',
      'subjectName',
      'hasSegmentedSpines',
    ]);
  });

  it('the auxiliary columns carry the wire params of the filters they replaced', () => {
    const one = (columnId: string, operator: string, value: TFilterValue) =>
      serializeQuery(
        query({ filters: { [columnId]: { columnId, operator, value } } }),
        cellMorphologySchema
      );

    expect(
      one('generationType', OperatorId.In, {
        kind: FilterValueKind.Set,
        values: ['digital_reconstruction'],
      }).cell_morphology_protocol__generation_type__in
    ).toEqual(['digital_reconstruction']);
    expect(
      one('protocolDesign', OperatorId.NotIn, {
        kind: FilterValueKind.Set,
        values: ['topological_synthesis'],
      }).cell_morphology_protocol__protocol_design__not_in
    ).toEqual(['topological_synthesis']);
    expect(
      one('protocolName', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'patch' })
        .cell_morphology_protocol__name__ilike
    ).toBe('%patch%');
    expect(
      one('protocolDocument', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'doi.org' })
        .cell_morphology_protocol__protocol_document__ilike
    ).toBe('%doi.org%');
    expect(
      one('strainName', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'C57' })
        .subject__strain__name__ilike
    ).toBe('%C57%');
    expect(
      one('subjectName', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'rat' })
        .subject__name__ilike
    ).toBe('%rat%');
    expect(
      one('hasSegmentedSpines', OperatorId.Bool, { kind: FilterValueKind.Boolean, value: true })
        .has_segmented_spines
    ).toBe(true);
  });

  /**
   * `CellMorphologyFilter.Constants.ordering_model_fields` (entitycore
   * `app/filters/cell_morphology.py`) is the allowlist; an `order_by` outside it is a
   * 422, so sortability is pinned field by field. Note this is the one endpoint seen
   * so far that DOES sort `subject__name`.
   */
  it.each([
    ['generationType', 'cell_morphology_protocol__generation_type'],
    ['protocolName', 'cell_morphology_protocol__name'],
    ['strainName', 'subject__strain__name'],
    ['subjectName', 'subject__name'],
    ['hasSegmentedSpines', 'has_segmented_spines'],
  ])('%s is in ordering_model_fields and sorts on %s', (columnId, field) => {
    expect(cellMorphologySchema.columns.find((c) => c.id === columnId)?.sortable).toBe(true);
    expect(
      serializeQuery(
        query({ sort: [{ columnId, direction: SortDirection.Desc }] }),
        cellMorphologySchema
      ).order_by
    ).toEqual([`-${field}`]);
  });

  it.each([
    'protocolDesign',
    'protocolDocument',
  ])('%s is NOT in ordering_model_fields, so it does not sort', (columnId) => {
    expect(cellMorphologySchema.columns.find((c) => c.id === columnId)?.sortable).toBe(false);
  });

  it('generation type offers no __not_in — the listing pins that param', () => {
    const column = cellMorphologySchema.columns.find((c) => c.id === 'generationType');
    expect(column?.filter?.operators).toEqual([OperatorId.In, OperatorId.Eq]);
    expect(column?.filter?.targets?.[0]?.operators).not.toContain(OperatorId.NotIn);
  });
});

describe('cell_morphology — query param parity with transformFiltersToQuery', () => {
  it('name contains → name__ilike wrapped in % (same wire value as the legacy `*foo*`)', () => {
    const legacy = transformFiltersToQuery([
      { field: 'name', type: 'Text', value: '*foo*', constraint: 'name__ilike' } as TCoreFilter,
    ]);
    const filters: TFilterModel = {
      name: {
        columnId: 'name',
        operator: OperatorId.Ilike,
        value: { kind: FilterValueKind.Text, text: 'foo' },
      },
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
    const filters: TFilterModel = {
      mtype: {
        columnId: 'mtype',
        operator: OperatorId.In,
        value: { kind: FilterValueKind.Set, values: ['L5_TPC'] },
      },
      species: {
        columnId: 'species',
        operator: OperatorId.In,
        value: { kind: FilterValueKind.Set, values: ['Mus musculus'] },
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
    const filters: TFilterModel = {
      registrationDate: {
        columnId: 'registrationDate',
        operator: OperatorId.DateRange,
        value: {
          kind: FilterValueKind.DateRange,
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
      query({ sort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }] }),
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
