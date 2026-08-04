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
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
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
 * `recording_type`, all present at runtime. `validation_result` is different: it is a
 * relation filtered existentially and is NOT serialized — see the columns below.
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
 * Filterable fields with no column: the two ID-type fields. `recording_origin` is
 * absent in every form because the domain config pins the bare param to `in_vitro`,
 * which would silently overwrite a user filter.
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
        field: 'ion_channel__id',
        operators: [OperatorId.In],
      },
    ],
  },
];

/**
 * The channel's controlled label and gene symbol. `Eq` only — the endpoint exposes no
 * ilike/in form — and both are in this endpoint's ordering fields, so both sort.
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
 * `validation_result__*` filters existentially over a relation the list response does
 * NOT serialize, so both cells render blank for every row while the filters work.
 * Neither field is in the endpoint's ordering fields, hence `sortable: false`.
 */
const validationPassedColumn: IColumnModel<Row> = {
  id: 'validationPassed',
  header: 'Validation passed',
  auxiliary: true,
  sortable: false,
  getValue: (r) => yesNo(r.validation_result?.passed),
  width: { minWidth: 150 },
  filter: {
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
 * Ion channel recording listing (`GET /ion-channel-recording`). The
 * `recording_origin = in_vitro` narrowing is applied by the entity domain config.
 *
 * Of the auxiliary fields only `ion_channel__label` and `ion_channel__gene` are in the
 * endpoint's ordering fields; the rest are non-sortable.
 */
export const ionChannelRecordingSchema: IGridSchema<Row> = {
  id: 'ion-channel-recording',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
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
    nameColumn<Row>({ essential: true }),
    lifecycleStatusColumn<Row>(),
    contributionsColumn<Row>(),
    registrationDateColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter.
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
