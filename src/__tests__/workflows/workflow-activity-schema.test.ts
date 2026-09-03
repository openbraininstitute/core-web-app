import { describe, expect, it } from 'vitest';

import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { FilterValueKind, OperatorId, SortDirection } from '@/features/data-grid/core';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IGridQuery, TFilterValue } from '@/features/data-grid/core';

/**
 * The narrowest endpoint the activity table lists from is `/task-config`, whose
 * `ordering_model_fields` are exactly these. Entitycore 422s on anything else, so a
 * sortable column outside this set breaks every campaign listing.
 * Source: GET /task-config `order_by` enum in the entitycore OpenAPI spec.
 */
const TASK_CONFIG_ORDERING_FIELDS = ['creation_date', 'update_date', 'name'];

const schema = buildWorkflowActivitySchema({
  activity: ActivityValues.Build,
  activityName: 'Build',
  entityType: 'memodel' as TExtendedEntitiesTypeDict,
  workspace: { virtualLabId: 'vlab', projectId: 'proj' },
});

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

function withFilter(columnId: string, operator: string, value: TFilterValue) {
  return serializeQuery(query({ filters: { [columnId]: { columnId, operator, value } } }), schema);
}

function withAdvancedFilter(filterId: string, operator: string, value: TFilterValue) {
  const key = `adv:record:${filterId}`;
  return serializeQuery(query({ filters: { [key]: { columnId: key, operator, value } } }), schema);
}

describe('workflow-activity schema — sort safety', () => {
  it('only sorts on fields /task-config accepts, so a campaign listing cannot 422', () => {
    const sortFields = schema.columns
      .filter((c) => c.sortable)
      .flatMap((c) => {
        const sf = c.sortField ?? c.field ?? c.id;
        return Array.isArray(sf) ? sf : [sf];
      });

    expect(sortFields).not.toHaveLength(0);
    for (const field of sortFields) {
      expect(TASK_CONFIG_ORDERING_FIELDS).toContain(field);
    }
  });

  it('leaves Created by unsortable — /task-config omits created_by__pref_label', () => {
    expect(schema.columns.find((c) => c.id === 'created_by')?.sortable).toBeFalsy();
  });

  it('serializes the default sort as newest first', () => {
    expect(serializeQuery(query({ sort: schema.defaultSort ?? [] }), schema).order_by).toEqual([
      '-creation_date',
    ]);
  });

  it('serializes an ascending name sort as +name', () => {
    const sort = [{ columnId: 'name', direction: SortDirection.Asc }];
    expect(serializeQuery(query({ sort }), schema).order_by).toEqual(['+name']);
  });
});

describe('workflow-activity schema — filter wire params', () => {
  it('name filters through name__ilike / name__in / name', () => {
    expect(
      withFilter('name', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'scan' })
    ).toMatchObject({ name__ilike: '%scan%' });
    expect(
      withFilter('name', OperatorId.In, { kind: FilterValueKind.Set, values: ['a', 'b'] })
    ).toMatchObject({ name__in: ['a', 'b'] });
    expect(
      withFilter('name', OperatorId.Eq, { kind: FilterValueKind.Text, text: 'exact' })
    ).toMatchObject({ name: 'exact' });
  });

  it('created by filters through created_by__pref_label__in / __ilike', () => {
    expect(
      withFilter('created_by', OperatorId.In, { kind: FilterValueKind.Set, values: ['Jane Doe'] })
    ).toMatchObject({ created_by__pref_label__in: ['Jane Doe'] });
    expect(
      withFilter('created_by', OperatorId.Ilike, { kind: FilterValueKind.Text, text: 'jane' })
    ).toMatchObject({ created_by__pref_label__ilike: '%jane%' });
  });

  it('the id advanced filter emits id__in', () => {
    expect(
      withAdvancedFilter('id', OperatorId.In, {
        kind: FilterValueKind.Set,
        values: ['11111111-1111-1111-1111-111111111111'],
      })
    ).toMatchObject({ id__in: ['11111111-1111-1111-1111-111111111111'] });
  });

  it('the lifecycle advanced filter emits lifecycle_status__in with wire values', () => {
    expect(
      withAdvancedFilter('lifecycleStatus', OperatorId.In, {
        kind: FilterValueKind.Set,
        values: ['draft', 'active'],
      })
    ).toMatchObject({ lifecycle_status__in: ['draft', 'active'] });
  });

  it('offers exactly the three lifecycle statuses entitycore defines', () => {
    const lifecycle = schema.advancedFilters?.[0]?.filters.find((f) => f.id === 'lifecycleStatus');
    const options = lifecycle?.options;
    expect(options?.kind).toBe('static');
    expect(options?.kind === 'static' ? options.items.map((i) => i.id) : []).toEqual([
      'draft',
      'active',
      'disqualified',
    ]);
  });

  it('maps free-text search onto ilike_search when the entity is ilike-searchable', () => {
    expect(
      serializeQuery(query({ freeTextSearch: 'scan' }), schema, { searchMode: 'ilike' })
    ).toMatchObject({ ilike_search: '*scan*' });
  });

  it('leaves the display-only columns without a filter', () => {
    for (const id of ['category', 'type', 'creation_date', 'status', 'actions']) {
      expect(schema.columns.find((c) => c.id === id)?.filter).toBeUndefined();
    }
  });
});

describe('workflow-activity schema — the actions column', () => {
  const actions = () => schema.columns.find((c) => c.id === 'actions');

  it('carries no header title — the in-cell "Action" trigger names it', () => {
    expect(actions()?.header).toBe('');
  });

  it('is the last column, frozen to the right edge', () => {
    expect(schema.columns.at(-1)?.id).toBe('actions');
    expect(actions()?.pinned).toBe('right');
  });

  it('cannot be moved, hidden or resized', () => {
    expect(actions()?.movable).toBe(false);
    expect(actions()?.alwaysVisible).toBe(true);
    expect(actions()?.width?.resizable).toBe(false);
  });

  it('carries no sort or filter, so it never reaches the query', () => {
    expect(actions()?.sortable).toBeFalsy();
    expect(serializeQuery(query(), schema).order_by).toBeUndefined();
  });

  it('passes the activity and entity type its menu needs to build hrefs', () => {
    expect(actions()?.cellRendererParams).toMatchObject({
      activity: ActivityValues.Build,
      entityType: 'memodel',
    });
  });
});
