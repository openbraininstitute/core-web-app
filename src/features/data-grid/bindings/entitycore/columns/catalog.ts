import { MeasurementStatistic } from '@/api/entitycore/types/shared/global';

import { Align, FilterOptionsKind, FreeEntryKind, mergeColumnDef, OperatorId } from '../../../core';
import { CONTRIBUTORS_RENDERER } from '../renderers/contributors-cell';
import { EM_DATASET_RENDERER } from '../renderers/em-dataset-cell';

import type { TMeasurementStatistic } from '@/api/entitycore/types/shared/global';
import type { IColumnModel, TColumnOverride } from '../../../core';

/**
 * Reusable entitycore column factories. Each is structurally typed to the minimal
 * row shape it reads (e.g. {@link IHasName}), so it works for ANY entity that exposes
 * that shape — which most do, since entitycore entities share base interfaces
 * (name, Timestamps, Subject, brain_region, …). Every factory takes an optional
 * override so a schema can customize per use:
 *
 *   nameColumn<ICellMorphology>({ width: { flex: 3 } })
 *   speciesColumn<IEModel>({ filter: { field: 'species__name' } })
 */

/**
 * Shared placeholder shown when a cell value is empty/absent (em dash).
 * Declared in the renderer ring (which cannot import this module — bindings sit
 * above it, and catalog already cycles with its own renderers), re-exported here
 * so bindings keep one import site and there is a single source of truth.
 */
import { EMPTY_PLACEHOLDER } from '../../../renderers/aggrid/empty-cell';

export { EMPTY_PLACEHOLDER };

type Nullable<T> = T | null | undefined;

export interface IHasName {
  name?: Nullable<string>;
}
export interface IHasDescription {
  description?: Nullable<string>;
}
export interface IHasBrainRegion {
  brain_region?: Nullable<{ name?: Nullable<string> }>;
}
export interface IHasSpecies {
  subject?: Nullable<{ species?: Nullable<{ name?: Nullable<string> }> }>;
}
export interface IHasMtypes {
  mtypes?: Nullable<Array<{ pref_label?: Nullable<string> }>>;
}
export interface IHasEtypes {
  etypes?: Nullable<Array<{ pref_label?: Nullable<string> }>>;
}
export interface IHasContributions {
  contributions?: Nullable<Array<{ agent?: Nullable<{ pref_label?: Nullable<string> }> }>>;
}
export interface IHasCreatedBy {
  created_by?: Nullable<{ pref_label?: Nullable<string> }>;
}
export interface IHasLicense {
  license?: Nullable<{ label?: Nullable<string> }>;
}
export interface IHasCreationDate {
  creation_date?: Nullable<string>;
}
export interface IHasUpdateDate {
  update_date?: Nullable<string>;
}
export interface IHasIonChannel {
  ion_channel?: Nullable<{ name?: Nullable<string> }>;
}
export interface IHasTemperature {
  temperature?: Nullable<number>;
}
export interface IHasCellLine {
  cell_line?: Nullable<string>;
}
export interface IHasSubjectAge {
  subject?: Nullable<{ age_value?: Nullable<number> }>;
}
export interface IHasSubjectName {
  subject?: Nullable<{ name?: Nullable<string> }>;
}
export interface IHasSubjectStrain {
  subject?: Nullable<{ strain?: Nullable<{ name?: Nullable<string> }> }>;
}
export interface IMeasurement {
  name?: Nullable<TMeasurementStatistic>;
  unit?: Nullable<string>;
  value?: Nullable<number>;
}
export interface IHasMeasurements {
  measurements?: Nullable<Array<IMeasurement>>;
}
export interface IHasReleaseVersion {
  release_version?: Nullable<number | string>;
}
export interface IHasPreRegion {
  pre_region?: Nullable<{ name?: Nullable<string> }>;
}
export interface IHasPostRegion {
  post_region?: Nullable<{ name?: Nullable<string> }>;
}
export interface IHasPreMtype {
  pre_mtype?: Nullable<{ pref_label?: Nullable<string> }>;
}
export interface IHasPostMtype {
  post_mtype?: Nullable<{ pref_label?: Nullable<string> }>;
}
export interface IHasEmDataset {
  em_dense_reconstruction_dataset?: Nullable<{ id?: Nullable<string> }>;
}

/** Find a measurement by its statistic `name` (mean / standard_deviation / standard_error …). */
export function measurementByName(
  row: IHasMeasurements,
  name: TMeasurementStatistic
): IMeasurement | undefined {
  return row.measurements?.find((m) => m?.name === name);
}
/** The dimensionless "number of measurements" measurement value. */
export function measurementCount(row: IHasMeasurements): number | null {
  return row.measurements?.find((m) => m?.unit === 'dimensionless')?.value ?? null;
}
function formatFloat(value: Nullable<number>, fixed = 4): string {
  return value == null || Number.isNaN(value) ? '' : Number(value.toFixed(fixed)).toString();
}
/** Age stored in seconds → whole days, matching the legacy "N days" accessor. */
function ageInDays(seconds: Nullable<number>): string {
  return seconds == null ? '' : `${Math.floor(seconds / 86_400)} days`;
}

/**
 * A nullable backend boolean as a cell value. `null`/`undefined` renders as the empty
 * cell (the shared em-dash placeholder), NOT as "No" — "we did not record this" and
 * "we recorded that it is false" are different facts, and a `field=false` filter
 * matches only the second.
 */
export function yesNo(value: Nullable<boolean>): string {
  if (value == null) return '';
  return value ? 'Yes' : 'No';
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

export function previewColumn<Row>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'preview',
      header: 'Preview',
      width: { width: 140, minWidth: 72, resizable: true },
    },
    o
  );
}

export function nameColumn<Row extends IHasName>(o?: TColumnOverride<Row>): IColumnModel<Row> {
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

/**
 * Description is DISPLAY-ONLY: no entitycore list endpoint exposes a `description`
 * query param (verified against the OpenAPI spec — zero paths accept `description`,
 * `description__ilike` or `description__in`). Free-text description search is served
 * by the quick-search box (`search` / `ilike_search`), not a column filter.
 */
export function descriptionColumn<Row extends IHasDescription>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'description',
      header: 'Description',
      getValue: (r) => r.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    o
  );
}

/**
 * Brain region. The brain-region hierarchy selector filters by ascendants
 * (`within_brain_region_*`); this column adds the orthogonal per-name filter the
 * backend also accepts (`brain_region__name__in` / `brain_region__name__ilike`),
 * with options from the server-computed `brain_region` facet bucket.
 */
export function brainRegionColumn<Row extends IHasBrainRegion>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'brainRegion',
      header: 'Brain region',
      sortable: true,
      sortField: 'brain_region__name',
      getValue: (r) => r.brain_region?.name ?? '',
      width: { minWidth: 150, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'brain_region__name',
        facetKey: 'brain_region',
        description: 'Brain region',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

export function speciesColumn<Row extends IHasSpecies>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'subject__species__name',
      getValue: (r) => r.subject?.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        // The flat props stay as the single source of truth for the DEFAULT target;
        // `targets[0]` mirrors them, so overrides and non-target-aware readers are
        // unaffected. `subject__species__id__in` is a documented entitycore query
        // param on every endpoint that accepts `subject__species__name__in`.
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'subject__species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'subject__species__name',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'species',
            description: 'Species',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'subject__species__id',
            operators: [OperatorId.In],
            description: 'Paste one or more species ids',
          },
        ],
      },
    },
    o
  );
}

export function mtypeColumn<Row extends IHasMtypes>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'mtype',
      header: 'M-type',
      sortable: true,
      sortField: 'mtype__pref_label',
      getValue: (r) => joinLabels((r.mtypes ?? []).map((m) => m.pref_label)),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'mtype__pref_label',
        facetKey: 'mtype',
        description: 'Morphological type',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

export function etypeColumn<Row extends IHasEtypes>(o?: TColumnOverride<Row>): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'etype',
      header: 'E-type',
      sortable: true,
      sortField: 'etype__pref_label',
      getValue: (r) => joinLabels((r.etypes ?? []).map((e) => e.pref_label)),
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'etype__pref_label',
        facetKey: 'etype',
        description: 'Electrical type',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

export function contributionsColumn<Row extends IHasContributions>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'contributions',
      header: 'Contributors',
      getValue: (r) => joinLabels((r.contributions ?? []).map((c) => c.agent?.pref_label)),
      cellRenderer: CONTRIBUTORS_RENDERER,
      width: { minWidth: 180, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'contribution__pref_label',
        facetKey: 'contribution',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

export function createdByColumn<Row extends IHasCreatedBy>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'createdBy',
      header: 'Created by',
      getValue: (r) => r.created_by?.pref_label ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'created_by__pref_label',
        facetKey: 'created_by',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

export function licenseColumn<Row extends IHasLicense>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
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

export function registrationDateColumn<Row extends IHasCreationDate>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
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

export function updateDateColumn<Row extends IHasUpdateDate>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
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

export function ionChannelColumn<Row extends IHasIonChannel>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'ionChannel',
      header: 'Ion channel',
      sortable: true,
      sortField: 'ion_channel__name',
      getValue: (r) => r.ion_channel?.name ?? EMPTY_PLACEHOLDER,
      width: { minWidth: 140, flex: 1 },
      filter: { operators: [OperatorId.Ilike], field: 'ion_channel__name' },
    },
    o
  );
}

export function temperatureColumn<Row extends IHasTemperature>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'temperature',
      header: 'Temperature',
      unit: '°C',
      sortable: true,
      sortField: 'temperature',
      getValue: (r) => (r.temperature == null ? '' : `${r.temperature} °C`),
      width: { minWidth: 130 },
      filter: { operators: [OperatorId.Range], field: 'temperature' },
    },
    o
  );
}

export function cellLineColumn<Row extends IHasCellLine>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'cellLine',
      header: 'Cell line',
      sortable: true,
      sortField: 'cell_line',
      getValue: (r) => r.cell_line ?? EMPTY_PLACEHOLDER,
      width: { minWidth: 130, flex: 1 },
      filter: { operators: [OperatorId.Ilike], field: 'cell_line' },
    },
    o
  );
}

export function subjectAgeColumn<Row extends IHasSubjectAge>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'subjectAge',
      header: 'Age',
      // sortable only where the entity binds `subject__age_value` — enable per schema
      sortField: 'subject__age_value',
      getValue: (r) => ageInDays(r.subject?.age_value),
      width: { minWidth: 110 },
    },
    o
  );
}

/**
 * Strain — an AUXILIARY column by default (`subject__strain__name`, from
 * `SubjectFilterMixin`): the name of the inbred line the subject belongs to, which
 * matters to the handful of users comparing strains and to nobody else.
 *
 * Free-entry `__ilike` / `__in`, exactly as the advanced filter it replaces. Every
 * endpoint composing `SubjectFilterMixin` accepts the param, but only SOME list
 * `subject__strain__name` in their `ordering_model_fields`, so `sortable` is opt-in
 * per schema — see {@link subjectNameColumn} for what enabling it wrongly costs.
 */
export function subjectStrainColumn<Row extends IHasSubjectStrain>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'strainName',
      header: 'Strain',
      auxiliary: true,
      sortField: 'subject__strain__name',
      getValue: (r) => r.subject?.strain?.name ?? '',
      width: { minWidth: 140 },
      filter: {
        // `subject__strain__name__ilike`, `subject__strain__name__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'subject__strain__name',
        // Declared as an explicit TARGET, not flat props alone: only a target can
        // carry `freeEntry`/`placeholder`, and the synthesised legacy target reads
        // "no options" as "use the grid's facets" — which for a field the server
        // computes no bucket for is an empty picker instead of a paste-a-list box.
        targets: [
          {
            id: 'name',
            label: 'Strain',
            field: 'subject__strain__name',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a strain name',
          },
        ],
      },
    },
    o
  );
}

/**
 * Subject name — an AUXILIARY column by default (`subject__name`, from
 * `SubjectFilterMixin`): the label of the individual animal, useful when tracing
 * records back to one subject.
 *
 * NEVER SORTABLE unless a specific endpoint proves otherwise: no entitycore filter
 * seen so far lists `subject__name` in `ordering_model_fields`, and an `order_by`
 * outside that allowlist is a 422 — the listing fails to load rather than sorting
 * badly. Hence no `sortField` here at all.
 */
export function subjectNameColumn<Row extends IHasSubjectName>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'subjectName',
      header: 'Subject name',
      auxiliary: true,
      sortable: false,
      getValue: (r) => r.subject?.name ?? '',
      width: { minWidth: 150 },
      filter: {
        // `subject__name__ilike`, `subject__name__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'subject__name',
        // an explicit target, for the free-entry reason spelled out in
        // `subjectStrainColumn`
        targets: [
          {
            id: 'name',
            label: 'Subject name',
            field: 'subject__name',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a subject name',
          },
        ],
      },
    },
    o
  );
}

export function numberOfMeasurementsColumn<Row extends IHasMeasurements>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'numberOfMeasurements',
      header: 'N° of Measurements',
      getValue: (r) => measurementCount(r),
      align: Align.Right,
      width: { minWidth: 150 },
    },
    o
  );
}

export function releaseVersionColumn<Row extends IHasReleaseVersion>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'releaseVersion',
      header: 'Version',
      sortable: true,
      sortField: 'release_version',
      getValue: (r) => (r.release_version == null ? '' : String(r.release_version)),
      width: { minWidth: 110 },
      filter: {
        operators: [OperatorId.In],
        field: 'release_version',
        facetKey: 'release_version',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

/** Formatted mean value from a density-style `measurements` array (legacy renderFloatNumber). */
export function meanValue(row: IHasMeasurements): string {
  return formatFloat(measurementByName(row, MeasurementStatistic.mean)?.value);
}
/** "mean ± std" string from a density-style `measurements` array. */
export function meanStd(row: IHasMeasurements): string {
  const mean = formatFloat(measurementByName(row, MeasurementStatistic.mean)?.value);
  const std = formatFloat(measurementByName(row, MeasurementStatistic.standard_deviation)?.value);
  return mean || std ? `${mean} ± ${std}` : '';
}
/** Formatted standard-error (SEM) value from a density-style `measurements` array. */
export function standardErrorValue(row: IHasMeasurements): string {
  return formatFloat(measurementByName(row, MeasurementStatistic.standard_error)?.value);
}

/**
 * Mean density value column (e.g. neuron density's "Density [1/mm³]"). Not sortable
 * or filterable in the legacy listing — the mean lives in the `measurements` array,
 * not a queryable scalar column.
 */
export function densityColumn<Row extends IHasMeasurements>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'density',
      header: 'Density',
      unit: '1/mm³',
      getValue: (r) => meanValue(r),
      align: Align.Right,
      width: { minWidth: 130 },
    },
    o
  );
}

/**
 * "Mean ± STD" measurement column. Sortability differs per entity (bouton density
 * sorts on `measurement_mean__value`; synapses-per-connection isn't sortable), so it
 * defaults to unsortable — enable with `{ sortable: true }` where the entity binds it.
 */
export function meanStdColumn<Row extends IHasMeasurements>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'meanStd',
      header: 'Mean ± STD',
      unit: 'µm⁻¹',
      sortField: 'measurement_mean__value',
      getValue: (r) => meanStd(r),
      align: Align.Right,
      width: { minWidth: 150 },
    },
    o
  );
}

/** Standard-error (SEM) measurement column — sorts on `measurement_standard_error__value`. */
export function standardErrorColumn<Row extends IHasMeasurements>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'sem',
      header: 'SEM',
      sortable: true,
      sortField: 'measurement_standard_error__value',
      getValue: (r) => standardErrorValue(r),
      align: Align.Right,
      width: { minWidth: 110 },
    },
    o
  );
}

/** Pre-synaptic brain region ("Brain Region [From]") — synapses-per-connection. */
export function preSynapticRegionColumn<Row extends IHasPreRegion>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'preRegion',
      header: 'Brain Region [From]',
      sortable: true,
      sortField: 'pre_region__name',
      getValue: (r) => r.pre_region?.name ?? '',
      width: { minWidth: 150, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'pre_region__name',
        facetKey: 'pre_region',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

/**
 * Post-synaptic brain region ("Brain Region [To]").
 *
 * This used to serialize to the single-underscore `post_region__name_in`
 * ({@link OperatorId.InSingleUnderscore}), copied from the legacy field-def. The
 * current entitycore spec does NOT expose that param at all — the only set filter on
 * `/experimental-synapses-per-connection` is the standard `post_region__name__in`
 * (plus `post_region__name__ilike`), so the single-underscore filter was silently
 * dropped by the API. Now spelled like every sibling relation filter.
 */
export function postSynapticRegionColumn<Row extends IHasPostRegion>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'postRegion',
      header: 'Brain Region [To]',
      sortable: true,
      sortField: 'post_region__name',
      getValue: (r) => r.post_region?.name ?? '',
      width: { minWidth: 150, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'post_region__name',
        facetKey: 'post_region',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

/** Pre-synaptic cell type ("Cell Type [From]") — synapses-per-connection. */
export function preSynapticCellTypeColumn<Row extends IHasPreMtype>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'preMtype',
      header: 'Cell Type [From]',
      sortable: true,
      sortField: 'pre_mtype__pref_label',
      getValue: (r) => r.pre_mtype?.pref_label ?? '',
      width: { minWidth: 150, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'pre_mtype__pref_label',
        facetKey: 'pre_mtype',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

/** Post-synaptic cell type ("Cell Type [To]") — synapses-per-connection. */
export function postSynapticCellTypeColumn<Row extends IHasPostMtype>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'postMtype',
      header: 'Cell Type [To]',
      sortable: true,
      sortField: 'post_mtype__pref_label',
      getValue: (r) => r.post_mtype?.pref_label ?? '',
      width: { minWidth: 150, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'post_mtype__pref_label',
        facetKey: 'post_mtype',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}

/**
 * EM dense-reconstruction dataset name ("Dataset") for em-cell-mesh. The list row
 * carries only the dataset's `{ id }`, so the NAME is fetched lazily by the
 * {@link EM_DATASET_RENDERER} cell; sort/filter operate on the backend scalar
 * `em_dense_reconstruction_dataset__name`.
 */
export function emDatasetColumn<Row extends IHasEmDataset>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'emDataset',
      header: 'Dataset',
      sortable: true,
      sortField: 'em_dense_reconstruction_dataset__name',
      getValue: (r) => r.em_dense_reconstruction_dataset?.id ?? '',
      cellRenderer: EM_DATASET_RENDERER,
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'em_dense_reconstruction_dataset__name',
        facetKey: 'em_dense_reconstruction_dataset',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    o
  );
}
