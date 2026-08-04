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

import type {
  IFilterEntry,
  IGridContext,
  IGridQuery,
  TFilterValue,
} from '@/features/data-grid/core';

const CTX: IGridContext = { dataType: 'cell_morphology', section: 'data', scope: 'project' };

/**
 * Pins the wire params of the cell-morphology advanced filters. Every expected param was
 * read out of the live entitycore OpenAPI spec; the backend silently ignores unknown
 * params, so a typo would look like "the filter does nothing".
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
 * The state key a filter declared as `groupId · filterId` actually occupies: the schema
 * collapses its groups (`flatAdvancedFilters`), which re-namespaces the filter ids.
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
    ['common', 'id', OperatorId.In, set(PROTOCOL_ID), { id__in: [PROTOCOL_ID] }],
    ['common', 'id', OperatorId.Eq, text(PROTOCOL_ID), { id: PROTOCOL_ID }],
  ])('%s · %s + %s', (groupId, filterId, operator, value, expected) => {
    expect(serializeOne(groupId, filterId, operator, value)).toEqual(expected);
  });

  it('every declared operator is exercised above', () => {
    const groups = resolveAdvancedFilterGroups(cellMorphologySchema, CTX);
    const declared = groups.flatMap((g) => g.filters.flatMap((f) => f.def.operators));
    expect(declared).toEqual([OperatorId.In, OperatorId.Eq]);
  });

  it('composes with column filters into ONE request', () => {
    const key = declaredKey('common', 'id');
    const params = serializeQuery(
      query({
        filters: {
          [key]: entry(key, OperatorId.In, set(PROTOCOL_ID), 'id'),
          protocolDesign: {
            columnId: 'protocolDesign',
            operator: OperatorId.In,
            value: set('cell_patch'),
          },
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
    expect(params.id__in).toEqual([PROTOCOL_ID]);
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
    const bare: typeof cellMorphologySchema = {
      ...cellMorphologySchema,
      advancedFilters: undefined,
    };
    expect(resolveAdvancedFilterGroups(bare, CTX)).toEqual([]);
    expect(serializeQuery(query(), bare)).toEqual({ page: 1, page_size: 20 });
  });
});
