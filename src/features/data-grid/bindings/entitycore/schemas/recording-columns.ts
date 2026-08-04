import {
  ElectricalRecordingOrigin,
  RecordingType,
} from '@/api/entitycore/types/entities/electrical-cell-recording';

import { mergeColumnDef, OperatorId } from '../../../core';
import { dictLabelByKey, staticOptions } from './common-filters';

import type { IColumnModel, TColumnOverride } from '../../../core';

/**
 * The `recording_type` / `recording_origin` scalars of
 * `ElectricalCellRecordingBaseMixin`, shared by every endpoint that composes it
 * (`/electrical-cell-recording`, `/ion-channel-recording`).
 *
 * Both are AUXILIARY columns: they are constant-ish acquisition metadata that most
 * users never need to see, but which the backend does filter on — so they belong in
 * the chooser's opt-in section rather than the advanced-filters panel, per the
 * one-field-one-surface rule (see FILTERS.md).
 *
 * NEITHER IS SORTABLE anywhere so far: no `Constants.ordering_model_fields` seen
 * lists `recording_type` or `recording_origin`, and an `order_by` outside that
 * allowlist is a 422 that fails the whole listing. Both factories therefore declare
 * no `sortField` at all — a schema that finds an endpoint listing one must add it
 * deliberately.
 */

export interface IHasRecordingType {
  recording_type?: string | null;
}
export interface IHasRecordingOrigin {
  recording_origin?: string | null;
}

const RECORDING_TYPE_LABELS = dictLabelByKey(RecordingType);
const RECORDING_ORIGIN_LABELS = dictLabelByKey(ElectricalRecordingOrigin);

/** `recording_type__in` / `recording_type` (exact). No `__not_in` on any endpoint. */
export function recordingTypeColumn<Row extends IHasRecordingType>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'recordingType',
      header: 'Recording type',
      auxiliary: true,
      sortable: false,
      getValue: (r) => RECORDING_TYPE_LABELS.get(r.recording_type ?? '') ?? '',
      width: { minWidth: 150 },
      filter: {
        operators: [OperatorId.In, OperatorId.Eq],
        field: 'recording_type',
        // an explicit TARGET, not flat props alone: the synthesised legacy target
        // reads "no options" as "use the grid's facets", and pinning the static
        // source here keeps the picker the advanced filter had
        targets: [
          {
            id: 'recordingType',
            label: 'Recording type',
            field: 'recording_type',
            operators: [OperatorId.In, OperatorId.Eq],
            options: staticOptions(RecordingType),
          },
        ],
      },
    },
    o
  );
}

/**
 * `recording_origin`. The OPERATORS are deliberately left to the schema: both
 * listings that show this field pin an origin filter as a host param, and which
 * operator composes safely depends on which param the host pinned (see FILTERS.md,
 * "never expose a filter the host already pins"). The default here is the bare
 * `recording_origin` exact match.
 */
export function recordingOriginColumn<Row extends IHasRecordingOrigin>(
  o?: TColumnOverride<Row>
): IColumnModel<Row> {
  return mergeColumnDef<Row>(
    {
      id: 'recordingOrigin',
      header: 'Recording origin',
      auxiliary: true,
      sortable: false,
      getValue: (r) => RECORDING_ORIGIN_LABELS.get(r.recording_origin ?? '') ?? '',
      width: { minWidth: 150 },
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
          },
        ],
      },
    },
    o
  );
}
