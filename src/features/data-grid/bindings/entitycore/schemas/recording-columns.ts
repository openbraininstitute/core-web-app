import {
  ElectricalRecordingOrigin,
  RecordingType,
} from '@/api/entitycore/types/entities/electrical-cell-recording';

import { mergeColumnDef, OperatorId } from '../../../core';
import { dictLabelByKey, staticOptions } from './common-filters';

import type { IColumnModel, TColumnOverride } from '../../../core';

/**
 * The `recording_type` / `recording_origin` columns, shared by
 * `/electrical-cell-recording` and `/ion-channel-recording`.
 *
 * Neither field appears in any endpoint's `ordering_model_fields`, so both factories
 * declare `sortable: false` and no `sortField` — entitycore 422s otherwise.
 */

export interface IHasRecordingType {
  recording_type?: string | null;
}
export interface IHasRecordingOrigin {
  recording_origin?: string | null;
}

const RECORDING_TYPE_LABELS = dictLabelByKey(RecordingType);
const RECORDING_ORIGIN_LABELS = dictLabelByKey(ElectricalRecordingOrigin);

/** Recording type. No `__not_in` form on any endpoint. */
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
        // Explicit target: a flat filter with no options falls back to facets.
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
 * Recording origin. Both listings that show this field pin an origin filter as a host
 * param, so the safe operator depends on which param the host pinned — schemas are
 * expected to override. The default is the bare exact match.
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
