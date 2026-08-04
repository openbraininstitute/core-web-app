import { ElectricalRecordingOrigin } from '@/api/entitycore/types/entities/electrical-cell-recording';
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
  subjectNameColumn,
  subjectStrainColumn,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter, staticOptions } from './common-filters';
import { recordingOriginColumn, recordingTypeColumn } from './recording-columns';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasContributions,
  IHasEtypes,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';
import type { IHasRecordingOrigin, IHasRecordingType } from './recording-columns';

// The hand-written entity type omits subject/etypes/contributions and the
// `recording_*` scalars of `ElectricalCellRecordingBaseMixin` (all present at
// runtime); augment locally so the column factories stay type-safe.
type Row = IElectricalCellRecording &
  IHasSpecies &
  IHasEtypes &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasRecordingType &
  IHasRecordingOrigin &
  IHasContributions;

/**
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column
 * is one: the record's own `id`, which has no useful column to show.
 *
 * `recording_type`, `recording_origin`, `subject__strain__name` and `subject__name`
 * used to live here; they are AUXILIARY columns below, so each field stays on
 * exactly one surface — the panel still offers them while they are hidden.
 */
const electricalCellRecordingAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Electrical cell recording listing — cell-morphology-shaped, with E-type instead
 * of M-type. Column order matches the legacy `electrical-cell-recording` view-def.
 * The `recording_origin` narrow filter lives in the entity domain config, so the
 * delegating data source applies it automatically.
 *
 * Then four AUXILIARY columns, each carrying the filter it took over from the panel.
 *
 * SORT SAFETY (`ElectricalCellRecordingFilter.Constants.ordering_model_fields`,
 * `app/filters/electrical_cell_recording.py`): that list is
 * creation_date/update_date/name/subject__species__name/brain_region__{name,acronym}/
 * etype__pref_label — NONE of the four converted fields is in it, so all four are
 * non-sortable. An `order_by` outside the allowlist is a 422 that fails the listing.
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
    // the identifying column: kept visible by the chooser's bulk deselect
    nameColumn<Row>({ essential: true }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>({ essential: true }),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    recordingTypeColumn<Row>(),
    // `recording_origin` (exact) ONLY. `recording_origin__in` exists on the endpoint
    // but the entity domain config pins it for this listing (`recordingOriginFilter`,
    // everything except in-silico) and host params are merged AFTER filters — an `In`
    // here would be silently overwritten. The bare param is a DIFFERENT name, so it
    // composes as an intersection. This is exactly what the advanced filter offered.
    recordingOriginColumn<Row>({
      filter: {
        operators: [OperatorId.Eq],
        field: 'recording_origin',
        targets: [
          {
            id: 'recordingOrigin',
            label: 'Recording origin',
            field: 'recording_origin',
            operators: [OperatorId.Eq],
            options: staticOptions(ElectricalRecordingOrigin),
            description: 'This listing already excludes in-silico recordings',
          },
        ],
      },
    }),
    subjectStrainColumn<Row>({ sortable: false }),
    subjectNameColumn<Row>(),
  ],
};

export const electricalCellRecordingGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.ElectricalCellRecording,
  schema: electricalCellRecordingSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
