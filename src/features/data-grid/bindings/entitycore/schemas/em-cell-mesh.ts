import { EMCellMeshTypeDict } from '@/api/entitycore/types/entities/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { MeasurementStatistic, MeasurementUnit } from '@/api/entitycore/types/shared/global';

import { Align, FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  emDatasetColumn,
  nameColumn,
  registrationDateColumn,
  releaseVersionColumn,
  speciesColumn,
  subjectNameColumn,
  subjectStrainColumn,
} from '../columns/catalog';
import {
  EM_DATASET_EXPERIMENT_DATE_RENDERER,
  EM_DATASET_PUBLISHED_IN_RENDERER,
  EM_DATASET_RENDERER,
  EmDatasetCell,
  EmDatasetExperimentDateCell,
  EmDatasetPublishedInCell,
} from '../renderers/em-dataset-cell';
import { registerSharedRenderers } from '../renderers/register';
import {
  dictLabelByKey,
  flatAdvancedFilters,
  recordIdFilter,
  staticOptions,
} from './common-filters';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TFilterOptionsSource,
} from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasEmDataset,
  IHasMtypes,
  IHasReleaseVersion,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

type Row = IEMCellMesh &
  IHasSpecies &
  IHasMtypes &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasReleaseVersion &
  IHasEmDataset;

const MESH_TYPE_LABELS = dictLabelByKey(EMCellMeshTypeDict);

/** Options from a plain `{ Name: value }` string dict, labelled by a humanised value. */
function optionsFromValues(values: ReadonlyArray<string>, humanise = false): TFilterOptionsSource {
  return {
    kind: FilterOptionsKind.Static,
    items: values.map((v) => ({
      id: v,
      label: humanise ? v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : v,
    })),
  };
}

/**
 * The `StructuralDomain` enum as `GET /em-cell-mesh` declares it. The app's own
 * `StructuralDomain` TS enum is missing `not_applicable`, so the spec is the source
 * here — an option the endpoint accepts must be offerable.
 */
const STRUCTURAL_DOMAINS = [
  'apical_dendrite',
  'basal_dendrite',
  'axon',
  'soma',
  'neuron_morphology',
  'not_applicable',
] as const;

/**
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column is
 * one. Every field/operator pair was checked against the live OpenAPI spec; the
 * emitted param is named in each comment.
 *
 * Two families stay here DELIBERATELY, not by omission:
 *
 * - the ID-type fields (`id`, `mtype__id`, `em_dense_reconstruction_dataset__id`, and
 *   `dense_reconstruction_cell_id` — a numeric id inside the EM volume). There is no
 *   useful column to show for an identifier.
 * - the MEASUREMENT family. `measurement_kind__*` / `measurement_item__*` are
 *   EXISTENTIAL filters over an annotation array — "has some annotation whose kind is
 *   X and whose value is in [a,b]" — and an array of annotations has no single scalar
 *   a column could display. Splitting it across five columns would also break the
 *   conjunction: the five params are AND-ed over ONE annotation, which a per-column
 *   filter cannot express.
 */
const emCellMeshAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'mesh',
    label: 'Mesh',
    description: 'How the mesh itself was produced.',
    filters: [
      {
        id: 'denseReconstructionCellId',
        label: 'Source cell ID',
        // `dense_reconstruction_cell_id` (bare integer — the cell id INSIDE the EM
        // dataset, not an entitycore UUID)
        field: 'dense_reconstruction_cell_id',
        operators: [OperatorId.Eq],
        description: 'Numeric cell id inside the EM dataset',
        placeholder: 'Enter a numeric cell id',
      },
    ],
  },
  {
    id: 'mtype',
    label: 'M-type',
    filters: [
      {
        id: 'id',
        label: 'M-type ID',
        // `mtype__id__in`
        field: 'mtype__id',
        operators: [OperatorId.In],
      },
    ],
  },
  {
    id: 'dataset',
    label: 'Dataset',
    description: 'The EM dense-reconstruction dataset the mesh comes from.',
    filters: [
      {
        id: 'id',
        label: 'Dataset ID',
        // `em_dense_reconstruction_dataset__id__in`. The dataset NAME is the
        // Dataset column's own field.
        field: 'em_dense_reconstruction_dataset__id',
        operators: [OperatorId.In],
      },
    ],
  },
  {
    id: 'measurements',
    label: 'Measurements',
    description: 'Morphometrics annotated on the mesh.',
    filters: [
      {
        id: 'structuralDomain',
        label: 'Structural domain',
        // `measurement_kind__structural_domain` (exact) ONLY — no list form.
        field: 'measurement_kind__structural_domain',
        operators: [OperatorId.Eq],
        options: optionsFromValues(STRUCTURAL_DOMAINS, true),
        description: 'Neurite compartment the measurement describes',
      },
      {
        id: 'kindLabel',
        label: 'Measurement label',
        // `measurement_kind__pref_label` (exact) ONLY.
        field: 'measurement_kind__pref_label',
        operators: [OperatorId.Eq],
        description: 'Exact name of the measured quantity',
        placeholder: 'Enter a full measurement name',
      },
      {
        id: 'statistic',
        label: 'Measurement statistic',
        // `measurement_item__name` (exact) ONLY.
        field: 'measurement_item__name',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementStatistic), true),
      },
      {
        id: 'unit',
        label: 'Measurement unit',
        // `measurement_item__unit` (exact) ONLY.
        field: 'measurement_item__unit',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementUnit)),
      },
      {
        id: 'value',
        label: 'Measurement value',
        // `measurement_item__value__gte` / `measurement_item__value__lte`
        field: 'measurement_item__value',
        operators: [OperatorId.Range],
        description: 'Bounds on the measured value, in the unit selected above',
      },
    ],
  },
];

/**
 * MESH — the two acquisition scalars. Both ARE in
 * `EMCellMeshFilter.Constants.ordering_model_fields`, so both sort.
 */
const meshTypeColumn: IColumnModel<Row> = {
  id: 'meshType',
  header: 'Mesh type',
  auxiliary: true,
  sortable: true,
  sortField: 'mesh_type',
  getValue: (r) => MESH_TYPE_LABELS.get(r.mesh_type ?? '') ?? '',
  width: { minWidth: 130 },
  filter: {
    // `mesh_type` (exact) ONLY — this endpoint declares no `mesh_type__in`.
    operators: [OperatorId.Eq],
    field: 'mesh_type',
    targets: [
      {
        id: 'meshType',
        label: 'Mesh type',
        field: 'mesh_type',
        operators: [OperatorId.Eq],
        options: staticOptions(EMCellMeshTypeDict),
        description: 'Precomputed (static) or generated at query time (dynamic)',
      },
    ],
  },
};

const levelOfDetailColumn: IColumnModel<Row> = {
  id: 'levelOfDetail',
  header: 'Level of detail',
  auxiliary: true,
  sortable: true,
  sortField: 'level_of_detail',
  align: Align.Right,
  getValue: (r) => (r.level_of_detail == null ? '' : String(r.level_of_detail)),
  width: { minWidth: 130 },
  filter: {
    // `level_of_detail` (bare integer; no range or list form on this endpoint)
    operators: [OperatorId.Eq],
    field: 'level_of_detail',
    targets: [
      {
        id: 'levelOfDetail',
        label: 'Level of detail',
        field: 'level_of_detail',
        operators: [OperatorId.Eq],
        placeholder: 'Enter a level of detail, like 2',
      },
    ],
  },
};

/**
 * M-type. Free-entry rather than a facet picker, exactly as the advanced filter it
 * replaces — this listing computes no `mtype` facet bucket, and a facet source with
 * no bucket renders an empty picker. That is why the shared `mtypeColumn` factory,
 * whose whole point is the bucket, is not used here.
 */
const mtypePrefLabelColumn: IColumnModel<Row> = {
  id: 'mtype',
  header: 'M-type',
  auxiliary: true,
  sortable: true,
  sortField: 'mtype__pref_label',
  getValue: (r) =>
    (r.mtypes ?? [])
      .map((m) => m?.pref_label ?? '')
      .filter(Boolean)
      .join(', '),
  width: { minWidth: 150 },
  filter: {
    // `mtype__pref_label__ilike`, `mtype__pref_label__in`
    operators: [OperatorId.Ilike, OperatorId.In],
    field: 'mtype__pref_label',
    targets: [
      {
        id: 'prefLabel',
        label: 'M-type name',
        field: 'mtype__pref_label',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an M-type name, like L5_TPC:A',
      },
    ],
  },
};

/**
 * DATASET — two ScientificArtifact fields of the mesh's dense-reconstruction dataset.
 *
 * The list row carries only the dataset's `{ id }` (`em_cell_mesh.py` serializes it as
 * a `BasicEntityRead`), so both cells resolve their value through the SAME lazy,
 * id-keyed fetch the Dataset name column already makes — one request per distinct
 * dataset, shared by all three cells. Sort is impossible either way: neither field is
 * in `ordering_model_fields`, so both are non-sortable.
 */
const datasetPublishedInColumn: IColumnModel<Row> = {
  id: 'datasetPublishedIn',
  header: 'Dataset published in',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.em_dense_reconstruction_dataset?.id ?? '',
  cellRenderer: EM_DATASET_PUBLISHED_IN_RENDERER,
  width: { minWidth: 180 },
  filter: {
    // `em_dense_reconstruction_dataset__published_in__ilike`, `…__published_in`
    operators: [OperatorId.Ilike, OperatorId.Eq],
    field: 'em_dense_reconstruction_dataset__published_in',
    targets: [
      {
        id: 'publishedIn',
        label: 'Dataset published in',
        field: 'em_dense_reconstruction_dataset__published_in',
        operators: [OperatorId.Ilike, OperatorId.Eq],
        placeholder: 'Enter part of a publication reference',
      },
    ],
  },
};

const datasetExperimentDateColumn: IColumnModel<Row> = {
  id: 'datasetExperimentDate',
  header: 'Dataset experiment date',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.em_dense_reconstruction_dataset?.id ?? '',
  cellRenderer: EM_DATASET_EXPERIMENT_DATE_RENDERER,
  width: { minWidth: 190 },
  filter: {
    // `em_dense_reconstruction_dataset__experiment_date__gte` / `…__lte`
    operators: [OperatorId.DateRange],
    field: 'em_dense_reconstruction_dataset__experiment_date',
    targets: [
      {
        id: 'experimentDate',
        label: 'Dataset experiment date',
        field: 'em_dense_reconstruction_dataset__experiment_date',
        operators: [OperatorId.DateRange],
      },
    ],
  },
};

/**
 * EM cell mesh listing (curated). Column order matches the legacy `em-cell-mesh`
 * view-def (Name, Brain region, Species, Version, Dataset, Registration date).
 * The "Dataset" column resolves the dense-reconstruction dataset name lazily via
 * {@link EM_DATASET_RENDERER}.
 *
 * Then seven AUXILIARY columns, each carrying the filter it took over from the panel.
 *
 * SORT SAFETY (`EMCellMeshFilter.Constants.ordering_model_fields`,
 * `app/filters/em_cell_mesh.py`): `mesh_type`, `level_of_detail`, `mtype__pref_label`,
 * `subject__name` and `subject__strain__name` are all in that list and sort; the two
 * `em_dense_reconstruction_dataset__{published_in,experiment_date}` fields are NOT, so
 * those two are non-sortable — an `order_by` outside the allowlist is a 422.
 */
export const emCellMeshSchema: IGridSchema<Row> = {
  id: 'em-cell-mesh',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(emCellMeshAdvancedFilters),
  columns: [
    nameColumn<Row>(),
    brainRegionColumn<Row>(),
    // `subject__species__name` is in EMCellMeshFilter.Constants.ordering_model_fields,
    // so species IS server-sortable here. Legacy gates the species *filter* to the
    // Simulate/Process/Extract workflows; we keep it filterable in every section — an
    // additive, backend-supported capability, not a parity regression.
    speciesColumn<Row>(),
    releaseVersionColumn<Row>(),
    emDatasetColumn<Row>(),
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    meshTypeColumn,
    levelOfDetailColumn,
    mtypePrefLabelColumn,
    datasetPublishedInColumn,
    datasetExperimentDateColumn,
    // both subject fields ARE in EMCellMeshFilter's ordering_model_fields
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
  ],
};

export const emCellMeshGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.EMCellMesh,
  schema: emCellMeshSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(EM_DATASET_RENDERER, EmDatasetCell);
    registry.register(EM_DATASET_PUBLISHED_IN_RENDERER, EmDatasetPublishedInCell);
    registry.register(EM_DATASET_EXPERIMENT_DATE_RENDERER, EmDatasetExperimentDateCell);
  },
};
