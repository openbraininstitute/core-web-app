import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import {
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilterId,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  advancedFilterDefsByKey,
  advancedFilterKey,
  FilterValueKind,
  OperatorId,
  resolveAdvancedFilterGroups,
} from '@/features/data-grid/core';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type {
  IFilterEntry,
  IGridContext,
  IGridQuery,
  IGridSchema,
  TFilterValue,
} from '@/features/data-grid/core';

const CTX: IGridContext = { dataType: 'cell_morphology', section: 'data', scope: 'project' };

/**
 * ORACLE: every param asserted below was read out of the live entitycore OpenAPI
 * spec (`paths['/cell-morphology'].get.parameters`, `in == 'query'`). A param not in
 * that list must never be produced — the backend silently ignores unknown query
 * params, so a typo here would look like "the filter does nothing".
 */

const PROTOCOL_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

function entry(key: string, operator: string, value: TFilterValue, targetId: string): IFilterEntry {
  return { columnId: key, operator, targetId, value };
}

function set(...values: string[]): TFilterValue {
  return { kind: FilterValueKind.Set, values };
}

function text(value: string): TFilterValue {
  return { kind: FilterValueKind.Text, text: value };
}

/**
 * The state key a filter DECLARED as `groupId · filterId` actually occupies. The
 * schema collapses its groups for display (`flatAdvancedFilters`), which
 * re-namespaces the filter ids; the case table below stays in the schema's own
 * vocabulary and resolves through here.
 */
function declaredKey(groupId: string, filterId: string): string {
  const flat = advancedFilterKey(
    FLAT_ADVANCED_FILTER_GROUP_ID,
    flatAdvancedFilterId(groupId, filterId)
  );
  return advancedFilterDefsByKey(cellMorphologySchema).has(flat)
    ? flat
    : advancedFilterKey(groupId, filterId);
}

/** Serialize ONE advanced filter and return only the params it added. */
function serializeOne(
  groupId: string,
  filterId: string,
  operator: string,
  value: TFilterValue
): Record<string, unknown> {
  const key = declaredKey(groupId, filterId);
  const targetId = advancedFilterDefsByKey(cellMorphologySchema).get(key)?.id ?? filterId;
  const params = serializeQuery(
    query({ filters: { [key]: entry(key, operator, value, targetId) } }),
    cellMorphologySchema
  );
  const { page, page_size: pageSize, order_by: orderBy, ...rest } = params;
  return rest;
}

describe('cell-morphology advanced filters — operator → spec param', () => {
  it.each([
    // [group, filter, operator, value, expected params]
    [
      'protocol',
      'generationType',
      OperatorId.In,
      set('digital_reconstruction'),
      { cell_morphology_protocol__generation_type__in: ['digital_reconstruction'] },
    ],
    [
      'protocol',
      'generationType',
      OperatorId.Eq,
      text('digital_reconstruction'),
      { cell_morphology_protocol__generation_type: 'digital_reconstruction' },
    ],
    [
      'protocol',
      'protocolDesign',
      OperatorId.In,
      set('cell_patch', 'fluorophore'),
      { cell_morphology_protocol__protocol_design__in: ['cell_patch', 'fluorophore'] },
    ],
    [
      'protocol',
      'protocolDesign',
      OperatorId.NotIn,
      set('topological_synthesis'),
      { cell_morphology_protocol__protocol_design__not_in: ['topological_synthesis'] },
    ],
    [
      'protocol',
      'protocolDesign',
      OperatorId.Eq,
      text('electron_microscopy'),
      { cell_morphology_protocol__protocol_design: 'electron_microscopy' },
    ],
    [
      'protocol',
      'protocolName',
      OperatorId.Ilike,
      text('patch'),
      { cell_morphology_protocol__name__ilike: '%patch%' },
    ],
    [
      'protocol',
      'protocolName',
      OperatorId.In,
      set('Patch-clamp'),
      { cell_morphology_protocol__name__in: ['Patch-clamp'] },
    ],
    [
      'protocol',
      'protocolName',
      OperatorId.Eq,
      text('Patch-clamp'),
      { cell_morphology_protocol__name: 'Patch-clamp' },
    ],
    [
      'protocol',
      'protocolDocument',
      OperatorId.Ilike,
      text('doi.org'),
      { cell_morphology_protocol__protocol_document__ilike: '%doi.org%' },
    ],
    [
      'protocol',
      'protocolDocument',
      OperatorId.In,
      set('https://doi.org/10.1038/x'),
      { cell_morphology_protocol__protocol_document__in: ['https://doi.org/10.1038/x'] },
    ],
    [
      'protocol',
      'protocolDocument',
      OperatorId.Eq,
      text('https://doi.org/10.1038/x'),
      { cell_morphology_protocol__protocol_document: 'https://doi.org/10.1038/x' },
    ],
    [
      'protocol',
      'protocolId',
      OperatorId.In,
      set(PROTOCOL_ID),
      { cell_morphology_protocol__id__in: [PROTOCOL_ID] },
    ],
    [
      'subject',
      'strainName',
      OperatorId.Ilike,
      text('C57'),
      { subject__strain__name__ilike: '%C57%' },
    ],
    [
      'subject',
      'strainName',
      OperatorId.In,
      set('C57BL/6J'),
      { subject__strain__name__in: ['C57BL/6J'] },
    ],
    [
      'subject',
      'strainId',
      OperatorId.In,
      set(PROTOCOL_ID),
      { subject__strain__id__in: [PROTOCOL_ID] },
    ],
    ['subject', 'subjectName', OperatorId.Ilike, text('rat'), { subject__name__ilike: '%rat%' }],
    ['subject', 'subjectName', OperatorId.In, set('Rat 12'), { subject__name__in: ['Rat 12'] }],
    ['subject', 'subjectId', OperatorId.In, set(PROTOCOL_ID), { subject__id__in: [PROTOCOL_ID] }],
    [
      'record',
      'hasSegmentedSpines',
      OperatorId.Bool,
      { kind: FilterValueKind.Boolean, value: true } satisfies TFilterValue,
      { has_segmented_spines: true },
    ],
    [
      'record',
      'hasSegmentedSpines',
      OperatorId.Bool,
      { kind: FilterValueKind.Boolean, value: false } satisfies TFilterValue,
      { has_segmented_spines: false },
    ],
    // the morphology's own entity id, moved here from the Name column's targets
    ['record', 'id', OperatorId.In, set(PROTOCOL_ID), { id__in: [PROTOCOL_ID] }],
    ['record', 'id', OperatorId.Eq, text(PROTOCOL_ID), { id: PROTOCOL_ID }],
  ])('%s · %s + %s', (groupId, filterId, operator, value, expected) => {
    expect(serializeOne(groupId, filterId, operator, value)).toEqual(expected);
  });

  it('every declared operator is exercised above', () => {
    const groups = resolveAdvancedFilterGroups(cellMorphologySchema, CTX);
    const declared = groups.flatMap((g) => g.filters.flatMap((f) => f.def.operators));
    // Bool appears twice (true/false); the rest map 1:1 onto a case above.
    expect(declared).toHaveLength(21);
  });

  it('composes with column filters into ONE request', () => {
    const key = declaredKey('protocol', 'protocolDesign');
    const params = serializeQuery(
      query({
        filters: {
          [key]: entry(
            key,
            OperatorId.In,
            set('cell_patch'),
            flatAdvancedFilterId('protocol', 'protocolDesign')
          ),
          species: {
            columnId: 'species',
            operator: OperatorId.In,
            targetId: 'name',
            value: set('Mus musculus'),
          },
        },
      }),
      cellMorphologySchema
    );
    expect(params.cell_morphology_protocol__protocol_design__in).toEqual(['cell_patch']);
    expect(params.subject__species__name__in).toEqual(['Mus musculus']);
  });

  it('NEVER emits the raw state key as a param — an orphaned advanced entry is dropped', () => {
    const key = advancedFilterKey('protocol', 'removedFilter');
    const params = serializeQuery(
      query({ filters: { [key]: entry(key, OperatorId.In, set('x'), 'removedFilter') } }),
      cellMorphologySchema
    );
    expect(params).toEqual({ page: 1, page_size: 20 });
    expect(Object.keys(params).some((k) => k.includes('adv:'))).toBe(false);
  });

  it('a schema without advancedFilters is untouched', () => {
    const bare: IGridSchema<ICellMorphology> = {
      ...cellMorphologySchema,
      advancedFilters: undefined,
    };
    expect(resolveAdvancedFilterGroups(bare, CTX)).toEqual([]);
    expect(serializeQuery(query(), bare)).toEqual({ page: 1, page_size: 20 });
  });
});
