import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  brainRegionColumn,
  contributionsColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { NUMERIC_FILTER_OPERATORS } from '@/features/data-grid/bindings/entitycore/columns/numeric-filter';
import { ENTITY_PREVIEW_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/entity-preview';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  flatAdvancedFilters,
  recordIdFilter,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IEntityPreviewParams } from '@/features/data-grid/bindings/entitycore/renderers/entity-preview';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * `IonChannelModel` omits two NMODL scalars the wire carries (`conductance_name`,
 * `max_permeability_name`) and models the animal as top-level `species`/`strain`,
 * whereas the wire nests it under `subject.{name, species.name, strain.name}`.
 */
type Row = IonChannelModel & {
  conductance_name?: string | null;
  max_permeability_name?: string | null;
  subject?: {
    name?: string | null;
    species?: { name?: string | null } | null;
    strain?: { name?: string | null } | null;
  } | null;
};

/**
 * `GET /ion-channel-model` params with no column: just the record's own `id`. The
 * `__isnull` companions have no operator in the grid's registry and are left out.
 */
const ionChannelModelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * An NMODL scalar as an auxiliary column. These are declared bare on
 * `IonChannelModelFilter` — no `__in`, no `__ilike` — so exact match only.
 */
function nmodlTextColumn(
  id: string,
  header: string,
  field: string,
  placeholder: string,
  get: (row: Row) => string | null | undefined
): IColumnModel<Row> {
  return {
    id,
    header,
    auxiliary: true,
    sortable: true,
    sortField: field,
    getValue: (r) => get(r) ?? '',
    width: { minWidth: 160 },
    filter: {
      operators: [OperatorId.Eq],
      field,
      targets: [
        {
          id,
          label: header,
          field,
          operators: [OperatorId.Eq],
          freeEntry: FreeEntryKind.Text,
          placeholder,
        },
      ],
    },
  };
}

const isStochasticColumn: IColumnModel<Row> = {
  id: 'isStochastic',
  header: 'Stochastic',
  auxiliary: true,
  sortable: true,
  sortField: 'is_stochastic',
  getValue: (r) => yesNo(r.is_stochastic),
  width: { minWidth: 130 },
  filter: {
    // Bare boolean, no `__op` suffix.
    operators: [OperatorId.Bool],
    field: 'is_stochastic',
    targets: [
      {
        id: 'isStochastic',
        label: 'Stochastic',
        field: 'is_stochastic',
        operators: [OperatorId.Bool],
        description: 'Whether the channel model is stochastic',
      },
    ],
  },
};

/** Ion-channel model listing (`GET /ion-channel-model`). */
export const ionChannelModelSchema: IGridSchema<Row> = {
  id: 'ion-channel-model',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(ionChannelModelAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      cellRendererParams: {
        target: 'assetLabel',
        assetLabel: AssetLabel.ion_channel_model_thumbnail,
      } satisfies IEntityPreviewParams,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    nameColumn<Row>({
      width: { minWidth: 130, width: 200, flex: 2 },
    }),
    brainRegionColumn<Row>(),
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'subject__species__name',
      getValue: (r) => r.subject?.species?.name ?? r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'subject__species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'temperatureCelsius',
      header: 'Temperature',
      unit: '°C',
      sortable: true,
      sortField: 'temperature_celsius',
      getValue: (r) => (r.temperature_celsius == null ? '' : `${r.temperature_celsius} °C`),
      width: { minWidth: 180, width: 180, resizable: true },
      filter: { operators: NUMERIC_FILTER_OPERATORS, field: 'temperature_celsius' },
    },
    {
      id: 'isTemperatureDependent',
      header: 'Temperature dependent',
      sortable: true,
      sortField: 'is_temperature_dependent',
      getValue: (r) => (r.is_temperature_dependent ? 'True' : 'False'),
      width: { minWidth: 160, width: 160, resizable: true },
      filter: { operators: [OperatorId.Bool], field: 'is_temperature_dependent' },
    },
    {
      id: 'isLjpCorrected',
      header: 'LJP corrected',
      sortable: true,
      sortField: 'is_ljp_corrected',
      getValue: (r) => (r.is_ljp_corrected ? 'True' : 'False'),
      width: { minWidth: 140, width: 140, resizable: true },
      filter: { operators: [OperatorId.Bool], field: 'is_ljp_corrected' },
    },
    lifecycleStatusColumn<Row>(),
    registrationDateColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    nmodlTextColumn(
      'nmodlSuffix',
      'NMODL suffix',
      'nmodl_suffix',
      'Enter a full NMODL suffix',
      (r) => r.nmodl_suffix
    ),
    nmodlTextColumn(
      'conductanceName',
      'Conductance name',
      'conductance_name',
      'Enter a full conductance name',
      (r) => r.conductance_name
    ),
    nmodlTextColumn(
      'maxPermeabilityName',
      'Max permeability name',
      'max_permeability_name',
      'Enter a full permeability name',
      (r) => r.max_permeability_name
    ),
    isStochasticColumn,
    // Both subject fields are in this endpoint's ordering fields, so the catalog's
    // never-sortable default for `subject__name` is overridden here.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
    // `contribution__pref_label` is absent from this endpoint's ordering fields.
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: false,
      filter: {
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // Explicit target: this endpoint computes no `contribution` facet bucket.
        targets: [
          {
            id: 'prefLabel',
            label: 'Contributor',
            field: 'contribution__pref_label',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a contributor name',
          },
        ],
      },
    }),
  ],
};

export const ionChannelModelGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.IonChannelModel,
  schema: ionChannelModelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
