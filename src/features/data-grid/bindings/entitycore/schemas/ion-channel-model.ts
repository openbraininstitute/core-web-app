import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter, subjectAdvancedGroup } from './common-filters';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * ADVANCED FILTERS — `GET /ion-channel-model` params with no column in this grid.
 *
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment. The four NMODL-level scalars
 * (`nmodl_suffix`, `conductance_name`, `max_permeability_name`, `is_stochastic`)
 * are declared bare on `IonChannelModelFilter` — no `__in`, no `__ilike` — so they
 * are offered as exact matches only. Their `__isnull` companions have no operator
 * in the grid's registry and are deliberately left out.
 */
const ionChannelModelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'mechanism',
    label: 'Mechanism',
    description: 'How the channel is implemented in NMODL.',
    filters: [
      {
        id: 'nmodlSuffix',
        label: 'NMODL suffix',
        // `nmodl_suffix` (exact) ONLY.
        field: 'nmodl_suffix',
        operators: [OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a full NMODL suffix',
      },
      {
        id: 'conductanceName',
        label: 'Conductance name',
        // `conductance_name` (exact) ONLY.
        field: 'conductance_name',
        operators: [OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a full conductance name',
      },
      {
        id: 'maxPermeabilityName',
        label: 'Max permeability name',
        // `max_permeability_name` (exact) ONLY.
        field: 'max_permeability_name',
        operators: [OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a full permeability name',
      },
      {
        id: 'isStochastic',
        label: 'Stochastic',
        // `is_stochastic` (boolean)
        field: 'is_stochastic',
        operators: [OperatorId.Bool],
        description: 'Whether the channel model is stochastic',
      },
    ],
  },
  subjectAdvancedGroup('The animal the channel model was characterised in.'),
  {
    id: 'contribution',
    label: 'Contributors',
    filters: [
      {
        id: 'prefLabel',
        label: 'Contributor',
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`. This
        // listing shows no Contributors column.
        field: 'contribution__pref_label',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter a contributor name',
      },
    ],
  },
];

/**
 * Ion-channel model listing (curated). Column order mirrors the legacy
 * `ViewDefForIonChannelModel`: Preview, Name, Brain region, Species, Temperature,
 * Temperature dependent, LJP corrected, Registration date. The view-def's
 * `filterableFields` (Name, BrainRegion, Species, Temperature, IsTemperatureDependent,
 * IsLjpCorrected, RegistrationDate) drive which columns carry filters.
 *
 * Per the legacy field-defs:
 *  - Species carries `subject__species__name` sort + `subject__species__name__in`
 *    facet (the ion-channel-model `perTypeConstraint`), though the value is read from
 *    the top-level `species`.
 *  - Temperature (°C) sorts on `temperature_celsius` and range-filters to
 *    `temperature_celsius__gte/__lte`.
 *  - The two boolean facets sort on / filter by their bare field name
 *    (`is_temperature_dependent`, `is_ljp_corrected`) — matching the legacy boolean
 *    constraint, which is the field itself with no `__op` suffix.
 *  - Brain region sorts on `brain_region__name`; column-level filtering is via the
 *    brain-region hierarchy selector (no facet on the column). The preview reuses the
 *    shared entity-preview thumbnail (see note in the report re: the
 *    `ion_channel_model_thumbnail` asset label the legacy renderer selected).
 */
export const ionChannelModelSchema: IGridSchema<IonChannelModel> = {
  id: 'ion-channel-model',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(ionChannelModelAdvancedFilters),
  columns: [
    previewColumn<IonChannelModel>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    nameColumn<IonChannelModel>(),
    brainRegionColumn<IonChannelModel>(),
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'subject__species__name',
      getValue: (r) => r.species?.name ?? '',
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
      width: { minWidth: 130 },
      filter: { operators: [OperatorId.Range], field: 'temperature_celsius' },
    },
    {
      id: 'isTemperatureDependent',
      header: 'Temperature dependent',
      sortable: true,
      sortField: 'is_temperature_dependent',
      getValue: (r) => (r.is_temperature_dependent ? 'True' : 'False'),
      width: { minWidth: 160 },
      filter: { operators: [OperatorId.Bool], field: 'is_temperature_dependent' },
    },
    {
      id: 'isLjpCorrected',
      header: 'LJP corrected',
      sortable: true,
      sortField: 'is_ljp_corrected',
      getValue: (r) => (r.is_ljp_corrected ? 'True' : 'False'),
      width: { minWidth: 140 },
      filter: { operators: [OperatorId.Bool], field: 'is_ljp_corrected' },
    },
    registrationDateColumn<IonChannelModel>(),
  ],
};

export const ionChannelModelGridDefinition: IEntityGridDefinition<IonChannelModel> = {
  dataType: ExtendedEntitiesTypeDict.IonChannelModel,
  schema: ionChannelModelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
