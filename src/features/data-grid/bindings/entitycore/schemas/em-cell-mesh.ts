import { EMCellMeshTypeDict } from '@/api/entitycore/types/entities/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { MeasurementStatistic, MeasurementUnit } from '@/api/entitycore/types/shared/global';
import {
  brainRegionColumn,
  emDatasetColumn,
  nameColumn,
  registrationDateColumn,
  releaseVersionColumn,
  speciesColumn,
  subjectNameColumn,
  subjectStrainColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import {
  EM_DATASET_EXPERIMENT_DATE_RENDERER,
  EM_DATASET_PUBLISHED_IN_RENDERER,
  EM_DATASET_RENDERER,
  EmDatasetCell,
  EmDatasetExperimentDateCell,
  EmDatasetPublishedInCell,
} from '@/features/data-grid/bindings/entitycore/renderers/em-dataset-cell';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  dictLabelByKey,
  flatAdvancedFilters,
  recordIdFilter,
  staticOptions,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  Align,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type {
  IHasEmDataset,
  IHasMtypes,
  IHasReleaseVersion,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TFilterOptionsSource,
} from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

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
 * `StructuralDomain` as `GET /em-cell-mesh` declares it. The app's own TS enum is
 * missing `not_applicable`, so the spec is the source here.
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
 * Filterable fields with no column. The measurement family stays here because the five
 * `measurement_kind__*` / `measurement_item__*` params are AND-ed over ONE annotation
 * of an array — a conjunction per-column filters cannot express.
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
        // Bare integer: the cell id inside the EM dataset, not an entitycore UUID.
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
        // Exact only; no list form.
        field: 'measurement_kind__structural_domain',
        operators: [OperatorId.Eq],
        options: optionsFromValues(STRUCTURAL_DOMAINS, true),
        description: 'Neurite compartment the measurement describes',
      },
      {
        id: 'kindLabel',
        label: 'Measurement label',
        // Exact only.
        field: 'measurement_kind__pref_label',
        operators: [OperatorId.Eq],
        description: 'Exact name of the measured quantity',
        placeholder: 'Enter a full measurement name',
      },
      {
        id: 'statistic',
        label: 'Measurement statistic',
        // Exact only.
        field: 'measurement_item__name',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementStatistic), true),
      },
      {
        id: 'unit',
        label: 'Measurement unit',
        // Exact only.
        field: 'measurement_item__unit',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementUnit)),
      },
      {
        id: 'value',
        label: 'Measurement value',
        field: 'measurement_item__value',
        operators: [OperatorId.Range],
        description: 'Bounds on the measured value, in the unit selected above',
      },
    ],
  },
];

/** Mesh type. In `EMCellMeshFilter.ordering_model_fields`, so it sorts. */
const meshTypeColumn: IColumnModel<Row> = {
  id: 'meshType',
  header: 'Mesh type',
  auxiliary: true,
  sortable: true,
  sortField: 'mesh_type',
  getValue: (r) => MESH_TYPE_LABELS.get(r.mesh_type ?? '') ?? '',
  width: { minWidth: 130 },
  filter: {
    // Exact only — this endpoint declares no `mesh_type__in`.
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
    // Bare integer; no range or list form on this endpoint.
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
 * M-type. Free-entry, not the shared `mtypeColumn`: this listing computes no `mtype`
 * facet bucket, so a facet picker would render empty.
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
 * Dataset fields. The row carries only the dataset's `{ id }`, so these cells resolve
 * their value through the same lazy id-keyed fetch as the Dataset name column. Neither
 * field is in `ordering_model_fields`, hence `sortable: false`.
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
 * EM cell mesh listing (`GET /em-cell-mesh`). The Dataset column resolves its name
 * lazily via {@link EM_DATASET_RENDERER}.
 */
export const emCellMeshSchema: IGridSchema<Row> = {
  id: 'em-cell-mesh',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(emCellMeshAdvancedFilters),
  columns: [
    nameColumn<Row>({ essential: true }),
    brainRegionColumn<Row>(),
    // `subject__species__name` is in this endpoint's ordering fields, so species is
    // server-sortable here.
    speciesColumn<Row>(),
    releaseVersionColumn<Row>(),
    emDatasetColumn<Row>(),
    lifecycleStatusColumn<Row>(),
    registrationDateColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    meshTypeColumn,
    levelOfDetailColumn,
    mtypePrefLabelColumn,
    datasetPublishedInColumn,
    datasetExperimentDateColumn,
    // Both subject fields are in this endpoint's ordering fields.
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
