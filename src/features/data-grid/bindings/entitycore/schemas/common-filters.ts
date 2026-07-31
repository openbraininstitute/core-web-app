import { FilterOptionsKind, FreeEntryKind, OperatorId } from '../../../core';

import type { IAdvancedFilterGroup, TAdvancedFilterDef, TFilterOptionsSource } from '../../../core';

/**
 * ADVANCED FILTERS shared by several entitycore listings.
 *
 * The `subject__*`, `id`, `name` and timestamp params come from mixins that many
 * endpoints compose (`SubjectFilterMixin`, `IdFilterMixin`, `NameFilterMixin`,
 * `CreationFilterMixin`, `ScientificArtifactFilterBase`), so the SAME target
 * declaration is correct on every endpoint that composes them — but only there.
 * Nothing in this file is applied automatically: each schema opts in explicitly,
 * after its own endpoint's `paths[…].get.parameters` was checked for the param.
 *
 * The emitted param is named in a comment next to every operator list. Nothing here
 * is inferred from a naming convention.
 */

/** Static option list from a `{ Foo: { key, label } }` enum dict. */
export function staticOptions(
  dict: Record<string, { key: string; label: string }>
): TFilterOptionsSource {
  return {
    kind: FilterOptionsKind.Static,
    items: Object.values(dict).map((v) => ({ id: v.key, label: v.label })),
  };
}

/** `id__in` / `id` — the record's own entity id. */
export const recordIdFilter: TAdvancedFilterDef = {
  id: 'id',
  label: 'ID',
  field: 'id',
  operators: [OperatorId.In, OperatorId.Eq],
  description: 'The entity id of the record itself',
};

/**
 * `name__ilike` / `name__in` / `name` — ONLY for grids with no Name column. Where a
 * Name column exists it already owns this field.
 */
export const recordNameFilter: TAdvancedFilterDef = {
  id: 'name',
  label: 'Name',
  field: 'name',
  operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
  freeEntry: FreeEntryKind.Text,
  placeholder: 'Enter a name',
};

/**
 * `creation_date__gte` / `creation_date__lte` — ONLY for grids with no Registration
 * date column (that column already filters this field as a date range).
 */
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
 * `experiment_date__gte` / `experiment_date__lte`. ScientificArtifact endpoints only
 * — the density/synapse endpoints do NOT accept it.
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

/** `contact_email` (bare only — the spec exposes no suffixed form). */
export const contactEmailFilter: TAdvancedFilterDef = {
  id: 'contactEmail',
  label: 'Contact email',
  field: 'contact_email',
  operators: [OperatorId.Eq],
  description: 'Exact contact address recorded on the artifact',
  placeholder: 'Enter a full email address',
};

/**
 * The `subject__*` family from `SubjectFilterMixin`. Species is deliberately absent:
 * every grid that uses this group already has a Species column, which owns
 * `subject__species__name` / `subject__species__id` through its own targets.
 *
 * `subject__age_value` is also absent — the backend types it as a `timedelta` with
 * no range form (`app/filters/subject.py`), so the only possible filter is an exact
 * ISO-duration match, which no user can be expected to type.
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
        // `subject__strain__name__ilike`, `subject__strain__name__in`
        field: 'subject__strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
      {
        id: 'strainId',
        label: 'Strain ID',
        // `subject__strain__id__in`
        field: 'subject__strain__id',
        operators: [OperatorId.In],
      },
      {
        id: 'subjectName',
        label: 'Subject name',
        // `subject__name__ilike`, `subject__name__in`
        field: 'subject__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a subject name',
      },
      {
        id: 'subjectId',
        label: 'Subject ID',
        // `subject__id__in`
        field: 'subject__id',
        operators: [OperatorId.In],
      },
    ],
  };
}
