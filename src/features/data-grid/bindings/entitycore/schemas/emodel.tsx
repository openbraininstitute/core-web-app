import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  brainRegionColumn,
  contributionsColumn,
  etypeColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  yesNo,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { NUMERIC_FILTER_OPERATORS } from '@/features/data-grid/bindings/entitycore/columns/numeric-filter';
import { ENTITY_PREVIEW_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/entity-preview';
import {
  ION_CHANNEL_MODELS_RENDERER,
  IonChannelModelsCell,
} from '@/features/data-grid/bindings/entitycore/renderers/ion-channel-models-cell';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  flatAdvancedFilters,
  recordIdFilter,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  Align,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * `IEModel` types `exemplar_morphology` as a narrower shape than the wire, which
 * carries the whole `CellMorphologyBaseMixin` — `has_segmented_spines` included.
 */
type Row = IEModel & {
  exemplar_morphology?: { has_segmented_spines?: boolean | null };
};

/** `GET /emodel` params with no column: just the record's own `id`. */
const emodelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * `exemplar_morphology__has_segmented_spines` is not in `EModelFilter`'s ordering
 * fields, hence `sortable: false` — entitycore 422s otherwise.
 */
const exemplarSegmentedSpinesColumn: IColumnModel<Row> = {
  id: 'exemplarHasSegmentedSpines',
  header: 'Segmented spines',
  auxiliary: true,
  sortable: false,
  getValue: (r) => yesNo(r.exemplar_morphology?.has_segmented_spines),
  width: { minWidth: 150 },
  filter: {
    // Bare boolean, no `__op` suffix.
    operators: [OperatorId.Bool],
    field: 'exemplar_morphology__has_segmented_spines',
    targets: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        field: 'exemplar_morphology__has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether the exemplar morphology has segmented dendritic spines',
      },
    ],
  },
};

const ionChannelModelsColumn: IColumnModel<Row> = {
  id: 'ionChannelModels',
  header: 'Ion channel models',
  auxiliary: true,
  sortable: true,
  sortField: 'ion_channel_model__name',
  getValue: (r) =>
    (r.ion_channel_models ?? [])
      .map((m) => m?.name ?? '')
      .filter(Boolean)
      .join(', '),
  cellRenderer: ION_CHANNEL_MODELS_RENDERER,
  width: { minWidth: 220, flex: 1 },
  filter: {
    operators: [OperatorId.In, OperatorId.Ilike, OperatorId.Eq],
    field: 'ion_channel_model__name',
    facetKey: 'ion_channel_model',
    description: 'Ion channel models the e-model uses',
    options: { kind: FilterOptionsKind.Facets },
    targets: [
      {
        id: 'name',
        label: 'Ion channel model name',
        field: 'ion_channel_model__name',
        operators: [OperatorId.In, OperatorId.Ilike, OperatorId.Eq],
        facetKey: 'ion_channel_model',
        description: 'Ion channel models the e-model uses',
        options: { kind: FilterOptionsKind.Facets },
      },
    ],
  },
};

/**
 * Strain at the top level: `EModelFilter` composes `SpeciesFilterMixin`, so the param
 * is `strain__name*` — the catalog's `subjectStrainColumn` would emit
 * `subject__strain__name*`, which this endpoint does not accept. Not sortable.
 */
const strainNameColumn: IColumnModel<Row> = {
  id: 'strainName',
  header: 'Strain',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.strain?.name ?? '',
  width: { minWidth: 140 },
  filter: {
    operators: [OperatorId.Ilike, OperatorId.In],
    field: 'strain__name',
    targets: [
      {
        id: 'name',
        label: 'Strain',
        field: 'strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a strain name',
      },
    ],
  },
};

/**
 * E-model listing (`GET /emodel`). E-model carries species at the top level, not under
 * `subject`, and `species__name` is in its ordering fields, so Species sorts here.
 */
export const emodelSchema: IGridSchema<Row> = {
  id: 'emodel',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(emodelAdvancedFilters),
  columns: [
    nameColumn<Row>(),
    previewColumn<Row>({
      id: 'eModelResponse',
      header: 'Response',
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'species__name',
      getValue: (r) => r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    mtypeColumn<Row>(),
    etypeColumn<Row>(),
    {
      id: 'exemplarMorphology',
      header: 'Morphology',
      sortable: true,
      sortField: 'exemplar_morphology__name',
      getValue: (r) => r.exemplar_morphology?.name ?? '',
      width: { minWidth: 160, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'exemplar_morphology__name',
        facetKey: 'exemplar_morphology',
        description: 'Exemplar morphology',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'eModelScore',
      header: 'Model cumulated score',
      sortable: true,
      sortField: 'score',
      getValue: (r) => (r.score == null ? '' : String(r.score)),
      align: Align.Left,
      width: { minWidth: 150 },
      filter: { operators: NUMERIC_FILTER_OPERATORS, field: 'score' },
    },
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>({ sortable: true, sortField: 'contribution__pref_label' }),
    registrationDateColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    exemplarSegmentedSpinesColumn,
    ionChannelModelsColumn,
    strainNameColumn,
  ],
};

export const emodelGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.Emodel,
  schema: emodelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register(ION_CHANNEL_MODELS_RENDERER, IonChannelModelsCell);
  },
};
