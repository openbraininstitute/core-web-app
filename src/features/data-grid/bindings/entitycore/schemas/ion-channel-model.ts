import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { OperatorId } from '../../../core';
import {
  brainRegionColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { EntityGridDefinition } from '../registry';

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
export const ionChannelModelSchema: GridSchema<IonChannelModel> = {
  id: 'ion-channel-model',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
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
        operators: [OperatorId.In],
        field: 'subject__species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: 'facets' },
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

export const ionChannelModelGridDefinition: EntityGridDefinition<IonChannelModel> = {
  dataType: ExtendedEntitiesTypeDict.IonChannelModel,
  schema: ionChannelModelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
