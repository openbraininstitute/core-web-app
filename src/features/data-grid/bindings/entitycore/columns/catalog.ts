import { mergeColumnDef, OperatorId } from '../../../core';

import type { ColumnModel, ColumnOverride } from '../../../core';

/**
 * Reusable entitycore column factories. Each is structurally typed to the minimal
 * row shape it reads (e.g. {@link HasName}), so it works for ANY entity that exposes
 * that shape — which most do, since entitycore entities share base interfaces
 * (name, Timestamps, Subject, brain_region, …). Every factory takes an optional
 * override so a schema can customize per use:
 *
 *   nameColumn<ICellMorphology>({ width: { flex: 3 } })
 *   speciesColumn<IEModel>({ filter: { field: 'species__name' } })
 */

type Nullable<T> = T | null | undefined;

export interface HasName {
  name?: Nullable<string>;
}
export interface HasDescription {
  description?: Nullable<string>;
}
export interface HasBrainRegion {
  brain_region?: Nullable<{ name?: Nullable<string> }>;
}
export interface HasSpecies {
  subject?: Nullable<{ species?: Nullable<{ name?: Nullable<string> }> }>;
}
export interface HasMtypes {
  mtypes?: Nullable<Array<{ pref_label?: Nullable<string> }>>;
}
export interface HasEtypes {
  etypes?: Nullable<Array<{ pref_label?: Nullable<string> }>>;
}
export interface HasContributions {
  contributions?: Nullable<Array<{ agent?: Nullable<{ pref_label?: Nullable<string> }> }>>;
}
export interface HasCreatedBy {
  created_by?: Nullable<{ pref_label?: Nullable<string> }>;
}
export interface HasLicense {
  license?: Nullable<{ label?: Nullable<string> }>;
}
export interface HasCreationDate {
  creation_date?: Nullable<string>;
}
export interface HasUpdateDate {
  update_date?: Nullable<string>;
}

export function formatDate(iso?: Nullable<string>): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function joinLabels(values: Array<Nullable<string>>): string {
  return values
    .map((v) => v ?? '')
    .filter(Boolean)
    .join(', ');
}

export function previewColumn<Row>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'preview',
      header: 'Preview',
      width: { width: 140, minWidth: 72, resizable: true },
    },
    o
  );
}

export function nameColumn<Row extends HasName>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      sortField: 'name',
      getValue: (r) => r.name ?? '',
      width: { minWidth: 180, flex: 2 },
      filter: { operators: [OperatorId.Ilike, OperatorId.Eq], field: 'name' },
    },
    o
  );
}

export function descriptionColumn<Row extends HasDescription>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
      filter: { operators: [OperatorId.Ilike], field: 'description' },
    },
    o
  );
}

export function brainRegionColumn<Row extends HasBrainRegion>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'brainRegion',
      header: 'Brain region',
      sortable: true,
      sortField: 'brain_region__name',
      getValue: (r) => r.brain_region?.name ?? '',
      width: { minWidth: 150, flex: 1 },
    },
    o
  );
}

export function speciesColumn<Row extends HasSpecies>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'subject__species__name',
      getValue: (r) => r.subject?.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'subject__species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: 'facets' },
      },
    },
    o
  );
}

export function mtypeColumn<Row extends HasMtypes>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'mtype',
      header: 'M-type',
      sortable: true,
      sortField: 'mtype__pref_label',
      getValue: (r) => joinLabels((r.mtypes ?? []).map((m) => m.pref_label)),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'mtype__pref_label',
        facetKey: 'mtype',
        description: 'Morphological type',
        options: { kind: 'facets' },
      },
    },
    o
  );
}

export function etypeColumn<Row extends HasEtypes>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'etype',
      header: 'E-type',
      sortable: true,
      sortField: 'etype__pref_label',
      getValue: (r) => joinLabels((r.etypes ?? []).map((e) => e.pref_label)),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'etype__pref_label',
        facetKey: 'etype',
        description: 'Electrical type',
        options: { kind: 'facets' },
      },
    },
    o
  );
}

export function contributionsColumn<Row extends HasContributions>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'contributions',
      header: 'Contributors',
      getValue: (r) => joinLabels((r.contributions ?? []).map((c) => c.agent?.pref_label)),
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'contribution__pref_label',
        facetKey: 'contribution',
        options: { kind: 'facets' },
      },
    },
    o
  );
}

export function createdByColumn<Row extends HasCreatedBy>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'createdBy',
      header: 'Created by',
      getValue: (r) => r.created_by?.pref_label ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In],
        field: 'created_by__pref_label',
        facetKey: 'created_by',
        options: { kind: 'facets' },
      },
    },
    o
  );
}

export function licenseColumn<Row extends HasLicense>(o?: ColumnOverride<Row>): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'license',
      header: 'License',
      getValue: (r) => r.license?.label ?? '',
      width: { minWidth: 120 },
    },
    o
  );
}

export function registrationDateColumn<Row extends HasCreationDate>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'registrationDate',
      header: 'Registration date',
      sortable: true,
      sortField: 'creation_date',
      getValue: (r) => formatDate(r.creation_date),
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.DateRange], field: 'creation_date' },
    },
    o
  );
}

export function updateDateColumn<Row extends HasUpdateDate>(
  o?: ColumnOverride<Row>
): ColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'updateDate',
      header: 'Last updated',
      sortable: true,
      sortField: 'update_date',
      getValue: (r) => formatDate(r.update_date),
      width: { minWidth: 150 },
      filter: { operators: [OperatorId.DateRange], field: 'update_date' },
    },
    o
  );
}
