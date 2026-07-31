import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { SortDirection } from '../../../core';
import {
  brainRegionColumn,
  cellLineColumn,
  contributionsColumn,
  ionChannelColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
  temperatureColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasCellLine,
  IHasContributions,
  IHasSpecies,
  IHasTemperature,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits subject/temperature/cell_line/contributions
// (present at runtime); augment locally so the catalog factories stay type-safe.
type Row = IIonChannelRecording & IHasSpecies & IHasTemperature & IHasCellLine & IHasContributions;

/**
 * Ion channel recording listing. Column order matches the legacy view-def; the
 * `recording_origin = in_vitro` narrow filter is applied by the entity domain
 * config. Ion channel filters as `ion_channel__name__ilike`, temperature as a
 * `temperature__gte/__lte` range, cell line as `cell_line__ilike`.
 */
export const ionChannelRecordingSchema: IGridSchema<Row> = {
  id: 'ion-channel-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    ionChannelColumn<Row>(),
    temperatureColumn<Row>(),
    cellLineColumn<Row>(),
    nameColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const ionChannelRecordingGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.IonChannelRecording,
  schema: ionChannelRecordingSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
