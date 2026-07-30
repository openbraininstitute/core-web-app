import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import {
  brainRegionColumn,
  contributionsColumn,
  etypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER, EntityPreview } from '../renderers/entity-preview';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { GridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { HasContributions, HasEtypes, HasSpecies } from '../columns/catalog';
import type { EntityGridDefinition } from '../registry';

// The hand-written entity type omits subject/etypes/contributions (present at
// runtime); augment locally so the catalog factories stay type-safe.
type Row = IElectricalCellRecording & HasSpecies & HasEtypes & HasContributions;

/**
 * Electrical cell recording listing — cell-morphology-shaped, with E-type instead
 * of M-type. Column order matches the legacy `electrical-cell-recording` view-def.
 * The `recording_origin` narrow filter lives in the entity domain config, so the
 * delegating data source applies it automatically.
 */
export const electricalCellRecordingSchema: GridSchema<Row> = {
  id: 'electrical-cell-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
  rowHeight: 118,
  selection: { enabled: true },
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    etypeColumn<Row>(),
    nameColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const electricalCellRecordingGridDefinition: EntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ElectricalCellRecording,
  schema: electricalCellRecordingSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registry.register(ENTITY_PREVIEW_RENDERER, EntityPreview);
  },
};
