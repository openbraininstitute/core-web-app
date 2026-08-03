import {
  ElectricalRecordingOrigin,
  RecordingType,
} from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  etypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import {
  contactEmailFilter,
  experimentDateFilter,
  flatAdvancedFilters,
  publishedInFilter,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from './common-filters';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IHasContributions, IHasEtypes, IHasSpecies } from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

// The hand-written entity type omits subject/etypes/contributions (present at
// runtime); augment locally so the catalog factories stay type-safe.
type Row = IElectricalCellRecording & IHasSpecies & IHasEtypes & IHasContributions;

/**
 * ADVANCED FILTERS — `GET /electrical-cell-recording` params with no column here.
 * Every field/operator pair was checked against the live OpenAPI spec; the emitted
 * param is named in each comment.
 */
const electricalCellRecordingAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
  {
    id: 'recording',
    label: 'Recording',
    description: 'How the trace was acquired.',
    filters: [
      {
        id: 'recordingType',
        label: 'Recording type',
        field: 'recording_type',
        // `recording_type__in`, `recording_type` (exact). No `__not_in` on this endpoint.
        operators: [OperatorId.In, OperatorId.Eq],
        options: staticOptions(RecordingType),
      },
      {
        id: 'recordingOrigin',
        label: 'Recording origin',
        field: 'recording_origin',
        // `recording_origin` (exact) ONLY. `recording_origin__in` exists on the
        // endpoint but the entity domain config pins it for this listing
        // (`recordingOriginFilter`, everything except in-silico) and host params are
        // merged AFTER filters — an `In` here would be silently overwritten. The bare
        // param is a different name, so it composes as an intersection.
        operators: [OperatorId.Eq],
        options: staticOptions(ElectricalRecordingOrigin),
        description: 'This listing already excludes in-silico recordings',
      },
    ],
  },
  subjectAdvancedGroup('The animal the recording was made from.'),
  {
    id: 'record',
    label: 'Record',
    filters: [experimentDateFilter, publishedInFilter, contactEmailFilter],
  },
];

/**
 * Electrical cell recording listing — cell-morphology-shaped, with E-type instead
 * of M-type. Column order matches the legacy `electrical-cell-recording` view-def.
 * The `recording_origin` narrow filter lives in the entity domain config, so the
 * delegating data source applies it automatically.
 */
export const electricalCellRecordingSchema: IGridSchema<Row> = {
  id: 'electrical-cell-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(electricalCellRecordingAdvancedFilters),
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

export const electricalCellRecordingGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ElectricalCellRecording,
  schema: electricalCellRecordingSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
