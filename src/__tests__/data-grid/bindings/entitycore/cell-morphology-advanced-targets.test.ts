import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { cellMorphologySchema } from '@/features/data-grid/bindings/entitycore/schemas/cell-morphology';
import {
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilterId,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { advancedFilterKey, FilterValueKind, OperatorId } from '@/features/data-grid/core';

/**
 * The schema collapses its groups for display (`flatAdvancedFilters`), so the filter
 * declared as `common · id` lives under the flat group's key. Spelled out here so
 * the assertions below still read in the schema's own vocabulary.
 */
const RECORD_ID_KEY = advancedFilterKey(
  FLAT_ADVANCED_FILTER_GROUP_ID,
  flatAdvancedFilterId('common', 'id')
);
const RECORD_ID_TARGET = flatAdvancedFilterId('common', 'id');

import type { IGridQuery, TFilterValue } from '@/features/data-grid/core';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
function set(values: string[]): TFilterValue {
  return { kind: FilterValueKind.Set, values };
}
function text(t: string): TFilterValue {
  return { kind: FilterValueKind.Text, text: t };
}

/**
 * The advanced ID targets are additive: selecting one must hit the `__id__in`
 * param, and NOT selecting one must leave the historical wire params untouched.
 * Every param asserted here is a real `GET /cell-morphology` query parameter.
 */
describe('cell_morphology — advanced ID filter targets', () => {
  it.each([
    ['brainRegion', 'brain_region__id__in'],
    ['mtype', 'mtype__id__in'],
    ['contributions', 'contribution__id__in'],
  ])('%s ID target serializes to %s', (columnId, param) => {
    const params = serializeQuery(
      query({
        filters: {
          [columnId]: { columnId, operator: OperatorId.In, targetId: 'id', value: set([UUID]) },
        },
      }),
      cellMorphologySchema
    );
    expect(params[param]).toEqual([UUID]);
  });

  /**
   * The morphology's OWN entity id is no longer a target on the Name column — it
   * lives in the `Common` advanced group (`adv:common:id`). Same capability, same
   * wire param: a pasted id from a link or a report still resolves in the listing.
   */
  it('record ID advanced filter serializes to id__in', () => {
    const key = RECORD_ID_KEY;
    const params = serializeQuery(
      query({
        filters: {
          [key]: {
            columnId: key,
            operator: OperatorId.In,
            targetId: RECORD_ID_TARGET,
            value: set([UUID]),
          },
        },
      }),
      cellMorphologySchema
    );
    expect(params.id__in).toEqual([UUID]);
  });

  it('the Name column filters names only — never the entity id', () => {
    const key = RECORD_ID_KEY;
    const targetIds = cellMorphologySchema.columns
      .find((c) => c.id === 'name')
      ?.filter?.targets?.map((t) => t.id);
    expect(targetIds).toEqual(['name']);

    const params = serializeQuery(
      query({
        filters: {
          name: {
            columnId: 'name',
            operator: OperatorId.In,
            targetId: 'name',
            value: set(['foo']),
          },
        },
      }),
      cellMorphologySchema
    );
    expect(params.name__in).toEqual(['foo']);
    expect(params).not.toHaveProperty('id__in');
    expect(params).not.toHaveProperty(key);
  });

  it('defaults are unchanged when no target is chosen (back-compat)', () => {
    const params = serializeQuery(
      query({
        filters: {
          brainRegion: { columnId: 'brainRegion', operator: OperatorId.In, value: set(['SSp']) },
          name: { columnId: 'name', operator: OperatorId.Ilike, value: text('foo') },
        },
      }),
      cellMorphologySchema
    );
    // the Name column's default target must stay `name` — declaring a filter on a
    // factory that had none previously relied on the serializer's columnId fallback
    expect(params.name__ilike).toBe('%foo%');
    expect(params.brain_region__name__in).toEqual(['SSp']);
    expect(params).not.toHaveProperty('id__in');
  });
});
