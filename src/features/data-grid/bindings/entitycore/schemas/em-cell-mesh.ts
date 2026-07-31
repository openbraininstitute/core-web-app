import { EMCellMeshTypeDict } from '@/api/entitycore/types/entities/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { MeasurementStatistic, MeasurementUnit } from '@/api/entitycore/types/shared/global';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  emDatasetColumn,
  nameColumn,
  registrationDateColumn,
  releaseVersionColumn,
  speciesColumn,
} from '../columns/catalog';
import { EM_DATASET_RENDERER, EmDatasetCell } from '../renderers/em-dataset-cell';
import { registerSharedRenderers } from '../renderers/register';
import {
  contactEmailFilter,
  experimentDateFilter,
  lastUpdatedFilter,
  publishedInFilter,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from './common-filters';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IAdvancedFilterGroup, IGridSchema, TFilterOptionsSource } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IHasEmDataset, IHasReleaseVersion, IHasSpecies } from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

type Row = IEMCellMesh & IHasSpecies & IHasReleaseVersion & IHasEmDataset;

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
 * ADVANCED FILTERS — `GET /em-cell-mesh` params with no column here. Every
 * field/operator pair was checked against the live OpenAPI spec; the emitted param
 * is named in each comment.
 */
const emCellMeshAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'mesh',
    label: 'Mesh',
    description: 'How the mesh itself was produced.',
    filters: [
      {
        id: 'meshType',
        label: 'Mesh type',
        // `mesh_type` (exact) ONLY — this endpoint declares no `mesh_type__in`.
        field: 'mesh_type',
        operators: [OperatorId.Eq],
        options: staticOptions(EMCellMeshTypeDict),
        description: 'Precomputed (static) or generated at query time (dynamic)',
      },
      {
        id: 'levelOfDetail',
        label: 'Level of detail',
        // `level_of_detail` (bare integer; no range or list form on this endpoint)
        field: 'level_of_detail',
        operators: [OperatorId.Eq],
        placeholder: 'Enter a level of detail, like 2',
      },
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
    description: 'Morphological type classification. This listing shows no M-type column.',
    filters: [
      {
        id: 'prefLabel',
        label: 'Name',
        // `mtype__pref_label__ilike`, `mtype__pref_label__in`
        field: 'mtype__pref_label',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter an M-type name, like L5_TPC:A',
      },
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
      {
        id: 'publishedIn',
        label: 'Dataset published in',
        // `em_dense_reconstruction_dataset__published_in__ilike`, `…__published_in`
        field: 'em_dense_reconstruction_dataset__published_in',
        operators: [OperatorId.Ilike, OperatorId.Eq],
        placeholder: 'Enter part of a publication reference',
      },
      {
        id: 'experimentDate',
        label: 'Dataset experiment date',
        // `em_dense_reconstruction_dataset__experiment_date__gte` / `…__lte`
        field: 'em_dense_reconstruction_dataset__experiment_date',
        operators: [OperatorId.DateRange],
      },
      {
        id: 'registrationDate',
        label: 'Dataset registration date',
        // `em_dense_reconstruction_dataset__creation_date__gte` / `…__lte`
        field: 'em_dense_reconstruction_dataset__creation_date',
        operators: [OperatorId.DateRange],
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
        label: 'Measurement',
        // `measurement_kind__pref_label` (exact) ONLY.
        field: 'measurement_kind__pref_label',
        operators: [OperatorId.Eq],
        description: 'Exact name of the measured quantity',
        placeholder: 'Enter a full measurement name',
      },
      {
        id: 'statistic',
        label: 'Statistic',
        // `measurement_item__name` (exact) ONLY.
        field: 'measurement_item__name',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementStatistic), true),
      },
      {
        id: 'unit',
        label: 'Unit',
        // `measurement_item__unit` (exact) ONLY.
        field: 'measurement_item__unit',
        operators: [OperatorId.Eq],
        options: optionsFromValues(Object.values(MeasurementUnit)),
      },
      {
        id: 'value',
        label: 'Value',
        // `measurement_item__value__gte` / `measurement_item__value__lte`
        field: 'measurement_item__value',
        operators: [OperatorId.Range],
        description: 'Bounds on the measured value, in the unit selected above',
      },
    ],
  },
  subjectAdvancedGroup('The animal the mesh was reconstructed from.'),
  {
    id: 'record',
    label: 'Record',
    filters: [
      recordIdFilter,
      experimentDateFilter,
      lastUpdatedFilter,
      publishedInFilter,
      contactEmailFilter,
    ],
  },
];

/**
 * EM cell mesh listing (curated). Column order matches the legacy `em-cell-mesh`
 * view-def (Name, Brain region, Species, Version, Dataset, Registration date).
 * The "Dataset" column resolves the dense-reconstruction dataset name lazily via
 * {@link EM_DATASET_RENDERER}.
 */
export const emCellMeshSchema: IGridSchema<Row> = {
  id: 'em-cell-mesh',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: emCellMeshAdvancedFilters,
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
  ],
};

export const emCellMeshGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.EMCellMesh,
  schema: emCellMeshSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(EM_DATASET_RENDERER, EmDatasetCell);
  },
};
