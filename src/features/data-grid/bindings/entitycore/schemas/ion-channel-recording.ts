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
  subjectNameColumn,
  subjectStrainColumn,
  temperatureColumn,
  yesNo,
} from '../columns/catalog';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';
import { recordingTypeColumn } from './recording-columns';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type {
  IHasCellLine,
  IHasContributions,
  IHasSpecies,
  IHasSubjectName,
  IHasSubjectStrain,
  IHasTemperature,
} from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';
import type { IHasRecordingType } from './recording-columns';

/**
 * The hand-written entity type omits subject/temperature/cell_line/contributions and
 * `recording_type` (all present at runtime); augment locally so the column factories
 * stay type-safe.
 *
 * `validation_result` is a different case and NOT a runtime omission: it is a
 * RELATION filtered existentially (`NestedValidationResultFilter`), and
 * `IonChannelRecordingRead` serializes no such field — see the note on the two
 * validation columns below.
 */
type Row = IIonChannelRecording &
  IHasSpecies &
  IHasTemperature &
  IHasCellLine &
  IHasSubjectName &
  IHasSubjectStrain &
  IHasRecordingType &
  IHasContributions & {
    validation_result?: { passed?: boolean | null; name?: string | null } | null;
  };

/**
 * ADVANCED FILTERS — what is left once every filterable field that CAN be a column is
 * one: the two ID-type fields, which have no useful column to show.
 *
 * `recording_origin` is deliberately absent in EVERY form, and is NOT a candidate for
 * a column either: the entity domain config pins the BARE param
 * (`recording_origin: in_vitro`), so `Eq` would be silently overwritten, and the only
 * non-colliding form (`recording_origin__in`) could merely re-intersect a listing
 * that is already exactly the in-vitro recordings.
 */
const ionChannelRecordingAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
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
    ],
  },
];

/**
 * The channel's controlled label and gene symbol. Both are `Eq` ONLY — the endpoint
 * exposes no ilike/in form for either — and both ARE in
 * `IonChannelRecordingFilter.Constants.ordering_model_fields`, so both sort.
 */
const ionChannelLabelColumn: IColumnModel<Row> = {
  id: 'ionChannelLabel',
  header: 'Ion channel label',
  auxiliary: true,
  sortable: true,
  sortField: 'ion_channel__label',
  getValue: (r) => r.ion_channel?.label ?? '',
  width: { minWidth: 150 },
  filter: {
    operators: [OperatorId.Eq],
    field: 'ion_channel__label',
    targets: [
      {
        id: 'ionChannelLabel',
        label: 'Ion channel label',
        field: 'ion_channel__label',
        operators: [OperatorId.Eq],
        placeholder: 'Enter a full channel label',
      },
    ],
  },
};

const ionChannelGeneColumn: IColumnModel<Row> = {
  id: 'ionChannelGene',
  header: 'Gene',
  auxiliary: true,
  sortable: true,
  sortField: 'ion_channel__gene',
  getValue: (r) => r.ion_channel?.gene ?? '',
  width: { minWidth: 130 },
  filter: {
    operators: [OperatorId.Eq],
    field: 'ion_channel__gene',
    targets: [
      {
        id: 'ionChannelGene',
        label: 'Gene',
        field: 'ion_channel__gene',
        operators: [OperatorId.Eq],
        description: 'Gene encoding the channel',
        placeholder: 'Enter a full gene symbol',
      },
    ],
  },
};

/**
 * VALIDATION — `validation_result__*` filters the recording by whether a related
 * ValidationResult matches, an EXISTENTIAL filter over a relation.
 *
 * ROW-DATA GAP: `IonChannelRecordingRead` (`app/schemas/ion_channel_recording.py`)
 * serializes no `validation_result` field, so these two cells are empty for every row
 * until the list response carries one. The FILTERS are correct and unchanged — only
 * the display half is missing. If that stays true, the honest fix is to move both
 * back to `advancedFilters`, exactly as the em-cell-mesh measurement family was left
 * there for the same reason.
 */
const validationPassedColumn: IColumnModel<Row> = {
  id: 'validationPassed',
  header: 'Validation passed',
  auxiliary: true,
  // not in ordering_model_fields
  sortable: false,
  getValue: (r) => yesNo(r.validation_result?.passed),
  width: { minWidth: 150 },
  filter: {
    // `validation_result__passed` (boolean)
    operators: [OperatorId.Bool],
    field: 'validation_result__passed',
    targets: [
      {
        id: 'validationPassed',
        label: 'Validation passed',
        field: 'validation_result__passed',
        operators: [OperatorId.Bool],
      },
    ],
  },
};

const validationNameColumn: IColumnModel<Row> = {
  id: 'validationName',
  header: 'Validation name',
  auxiliary: true,
  sortable: false,
  getValue: (r) => r.validation_result?.name ?? '',
  width: { minWidth: 160 },
  filter: {
    // `validation_result__name__ilike`, `validation_result__name__in`, `…__name`
    operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
    field: 'validation_result__name',
    targets: [
      {
        id: 'validationName',
        label: 'Validation name',
        field: 'validation_result__name',
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter part of a validation name',
      },
    ],
  },
};

/**
 * Ion channel recording listing. Column order matches the legacy view-def; the
 * `recording_origin = in_vitro` narrow filter is applied by the entity domain
 * config. Ion channel filters as `ion_channel__name__ilike`, temperature as a
 * `temperature__gte/__lte` range, cell line as `cell_line__ilike`.
 *
 * Then seven AUXILIARY columns, each carrying the filter it took over from the panel.
 *
 * SORT SAFETY (`IonChannelRecordingFilter.Constants.ordering_model_fields`,
 * `app/filters/ion_channel_recording.py`): only `ion_channel__label` and
 * `ion_channel__gene` are in that list. Recording type, both validation fields and
 * both subject fields are not, so they are non-sortable — an `order_by` outside the
 * allowlist is a 422 that fails the whole listing.
 */
export const ionChannelRecordingSchema: IGridSchema<Row> = {
  id: 'ion-channel-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(ionChannelRecordingAdvancedFilters),
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
    // the identifying column: kept visible by the chooser's bulk deselect
    nameColumn<Row>({ essential: true }),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    ionChannelLabelColumn,
    ionChannelGeneColumn,
    validationPassedColumn,
    validationNameColumn,
    recordingTypeColumn<Row>(),
    subjectStrainColumn<Row>({ sortable: false }),
    subjectNameColumn<Row>(),
  ],
};

export const ionChannelRecordingGridDefinition: IEntityGridDefinition<Row> = {
  dataType: EntityTypeDict.IonChannelRecording,
  schema: ionChannelRecordingSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
