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

/** `GET /electrical-cell-recording` params with no column: just the record's own `id`. */
const electricalCellRecordingAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * Electrical cell recording listing (`GET /electrical-cell-recording`). The
 * `recording_origin` narrowing lives in the entity domain config.
 *
 * None of the four auxiliary fields is in the endpoint's ordering fields, so all four
 * are non-sortable — entitycore 422s otherwise.
 */
export const electricalCellRecordingSchema: IGridSchema<Row> = {
  id: 'electrical-cell-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(electricalCellRecordingAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    brainRegionColumn<Row>(),
    speciesColumn<Row>(),
    etypeColumn<Row>(),
    nameColumn<Row>({ essential: true }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>({ essential: true }),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
    recordingTypeColumn<Row>(),
    // Exact only: the domain config pins `recording_origin__in` as a host param, and
    // host params merge after filters, so a user `In` would be overwritten. The bare
    // param is a different name and composes as an intersection.
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
