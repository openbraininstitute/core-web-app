import { FilterOptionsKind, FreeEntryKind, OperatorId } from '../../../core';

import type { IAdvancedFilterGroup, TAdvancedFilterDef, TFilterOptionsSource } from '../../../core';

/**
 * Advanced filters shared by several entitycore listings. These come from backend
 * filter mixins many endpoints compose, so each schema must opt in explicitly — a
 * mixin's params are only valid on endpoints that actually compose it.
 */

/**
 * Group id of the single group {@link flatAdvancedFilters} collapses into. Part of
 * every flattened filter's state key (`adv:filters:<group>_<filter>`).
 */
export const FLAT_ADVANCED_FILTER_GROUP_ID = 'filters';

/**
 * Collapse a schema's advanced-filter groups into one, so its popover shows a flat
 * list instead of group tabs. Filter ids are re-namespaced to `<groupId>_<filterId>`
 * so merged groups cannot collide on a state key; a group-level `available` is pushed
 * down onto filters that declare none.
 */
export function flatAdvancedFilters(
  groups: ReadonlyArray<IAdvancedFilterGroup>
): ReadonlyArray<IAdvancedFilterGroup> {
  if (groups.length <= 1) return groups;
  return [
    {
      id: FLAT_ADVANCED_FILTER_GROUP_ID,
      label: 'Filters',
      filters: groups.flatMap((group) =>
        group.filters.map((def) => ({
          ...def,
          id: flatAdvancedFilterId(group.id, def.id),
          available: def.available ?? group.available,
        }))
      ),
    },
  ];
}

/** The id a filter declared under `groupId` takes once the groups are collapsed. */
export function flatAdvancedFilterId(groupId: string, filterId: string): string {
  return `${groupId}_${filterId}`;
}

/** Static option list from a `{ Foo: { key, label } }` enum dict. */
export function staticOptions(
  dict: Record<string, { key: string; label: string }>,
  exclude?: string[]
): TFilterOptionsSource {
  return {
    kind: FilterOptionsKind.Static,
    items: Object.values(dict)
      .map((v) => ({ id: v.key, label: v.label }))
      .filter((v) => !exclude?.includes(v.id)),
  };
}

/**
 * `{ key → label }` from a `{ Foo: { key, label } }` enum dict. A filter stores the
 * wire value (`in_vitro`); a cell must show the label (`in vitro`).
 */
export function dictLabelByKey(
  dict: Record<string, { key: string; label: string }>
): ReadonlyMap<string, string> {
  return new Map(Object.values(dict).map((v) => [v.key, v.label] as const));
}

/** `id__in` / `id` — the record's own entity id. */
export const recordIdFilter: TAdvancedFilterDef = {
  id: 'id',
  label: 'ID',
  field: 'id',
  operators: [OperatorId.In, OperatorId.Eq],
  description: 'The entity id of the record itself',
};

/** `name` — only for grids with no Name column, which otherwise owns this field. */
export const recordNameFilter: TAdvancedFilterDef = {
  id: 'name',
  label: 'Name',
  field: 'name',
  operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
  freeEntry: FreeEntryKind.Text,
  placeholder: 'Enter a name',
};

/** `creation_date` range — only for grids with no Registration date column. */
export const registrationDateFilter: TAdvancedFilterDef = {
  id: 'registrationDate',
  label: 'Registration date',
  field: 'creation_date',
  operators: [OperatorId.DateRange],
  description: 'When the record was registered',
};

/** `update_date__gte` / `update_date__lte`. No listing shows a "last updated" column. */
export const lastUpdatedFilter: TAdvancedFilterDef = {
  id: 'lastUpdated',
  label: 'Last updated',
  field: 'update_date',
  operators: [OperatorId.DateRange],
  description: 'When the record was last modified',
};

/**
 * `experiment_date` range. ScientificArtifact endpoints only — the density/synapse
 * endpoints do not accept it.
 */
export const experimentDateFilter: TAdvancedFilterDef = {
  id: 'experimentDate',
  label: 'Experiment date',
  field: 'experiment_date',
  operators: [OperatorId.DateRange],
  description: 'When the underlying experiment was performed',
};

/** `published_in__ilike` / `published_in`. ScientificArtifact endpoints only. */
export const publishedInFilter: TAdvancedFilterDef = {
  id: 'publishedIn',
  label: 'Published in',
  field: 'published_in',
  operators: [OperatorId.Ilike, OperatorId.Eq],
  description: 'Publication the artifact was released in',
  placeholder: 'Enter part of a publication reference',
};

/** `contact_email`, bare only — the spec exposes no suffixed form. */
export const contactEmailFilter: TAdvancedFilterDef = {
  id: 'contactEmail',
  label: 'Contact email',
  field: 'contact_email',
  operators: [OperatorId.Eq],
  description: 'Exact contact address recorded on the artifact',
  placeholder: 'Enter a full email address',
};

/**
 * The `subject__*` family from `SubjectFilterMixin`. Species is absent because the
 * Species column owns it. `subject__age_value` is absent because the backend types it
 * as a `timedelta` with no range form — only an exact ISO-duration match is possible.
 */
export function subjectAdvancedGroup(description: string): IAdvancedFilterGroup {
  return {
    id: 'subject',
    label: 'Subject',
    description,
    filters: [
      {
        id: 'strainName',
        label: 'Strain',
        field: 'subject__strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
      {
        id: 'subjectName',
        label: 'Subject name',
        field: 'subject__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a subject name',
      },
    ],
  };
}
