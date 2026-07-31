import { RecordingType } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

import { FreeEntryKind, OperatorId, SortDirection } from '../../../core';
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
import {
  contactEmailFilter,
  experimentDateFilter,
  lastUpdatedFilter,
  publishedInFilter,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from './common-filters';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';
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
 * ADVANCED FILTERS — `GET /ion-channel-recording` params with no column here.
 * Every field/operator pair was checked against the live OpenAPI spec; the emitted
 * param is named in each comment.
 *
 * `recording_origin` is deliberately absent in EVERY form: the entity domain config
 * pins the BARE param (`recording_origin: in_vitro`), so `Eq` would be silently
 * overwritten, and the only non-colliding form (`recording_origin__in`) could merely
 * re-intersect a listing that is already exactly the in-vitro recordings.
 */
const ionChannelRecordingAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'ionChannel',
    label: 'Ion channel',
    description: 'The channel the recording targets.',
    filters: [
      {
        id: 'ionChannelId',
        label: 'Ion channel ID',
        // `ion_channel__id__in`. The channel's NAME is the Ion channel column's field.
        field: 'ion_channel__id',
        operators: [OperatorId.In],
      },
      {
        id: 'ionChannelLabel',
        label: 'Ion channel label',
        // `ion_channel__label` (exact) ONLY — the endpoint exposes no ilike/in form.
        field: 'ion_channel__label',
        operators: [OperatorId.Eq],
        placeholder: 'Enter a full channel label',
      },
      {
        id: 'ionChannelGene',
        label: 'Gene',
        // `ion_channel__gene` (exact) ONLY — no ilike/in form on this endpoint.
        field: 'ion_channel__gene',
        operators: [OperatorId.Eq],
        description: 'Gene encoding the channel',
        placeholder: 'Enter a full gene symbol',
      },
    ],
  },
  {
    id: 'validation',
    label: 'Validation',
    description: 'Validation results attached to the recording.',
    filters: [
      {
        id: 'validationPassed',
        label: 'Validation passed',
        // `validation_result__passed` (boolean)
        field: 'validation_result__passed',
        operators: [OperatorId.Bool],
      },
      {
        id: 'validationName',
        label: 'Validation name',
        // `validation_result__name__ilike`, `validation_result__name__in`, `…__name`
        field: 'validation_result__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter part of a validation name',
      },
      {
        id: 'validationId',
        label: 'Validation ID',
        // `validation_result__id__in`
        field: 'validation_result__id',
        operators: [OperatorId.In],
      },
    ],
  },
  {
    id: 'recording',
    label: 'Recording',
    filters: [
      {
        id: 'recordingType',
        label: 'Recording type',
        field: 'recording_type',
        // `recording_type__in`, `recording_type` (exact). No `__not_in` here.
        operators: [OperatorId.In, OperatorId.Eq],
        options: staticOptions(RecordingType),
      },
    ],
  },
  subjectAdvancedGroup('The animal the recording was made from.'),
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
  advancedFilters: ionChannelRecordingAdvancedFilters,
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
