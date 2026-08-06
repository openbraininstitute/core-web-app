import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { SchemaMappingKeyDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

const RECORDING_PROPERTIES_STALE_TIME_MS = 5 * 60 * 1000;

/** obi-one FromID const written under `initialize` for an ElectricalCellRecording selection. */
export const ELECTRICAL_CELL_RECORDING_FROM_ID = 'ElectricalCellRecordingFromID';

/**
 * `/declared/mapped-electrical-cell-recording-properties`.
 *
 * `Protocols` is the union across the selected recordings, `ProtocolsByRecording` keeps the
 * per-recording breakdown, and `AmplitudesByProtocol` holds the step amplitudes (nA) read
 * from each recording's NWB.
 */
export const electricalCellRecordingPropertiesSchema = z.object({
  Protocols: z.array(z.string()),
  ProtocolsByRecording: z.record(z.string(), z.array(z.string())),
  AmplitudesByProtocol: z.record(z.string(), z.array(z.number())),
});

export type TElectricalCellRecordingProperties = z.infer<
  typeof electricalCellRecordingPropertiesSchema
>;

export function parseElectricalCellRecordingProperties(resp: unknown) {
  return electricalCellRecordingPropertiesSchema.parse(resp);
}

/**
 * Collect the selected recording ids from the `initialize` block.
 *
 * Unlike the circuit mapping — one entity, one id in the path — extraction runs on the whole
 * selection, so the ids come from the config rather than from the session entity. Refs are
 * matched on their FromID const so renaming the field does not silently return nothing.
 */
export function extractRecordingIds(config: Config): string[] {
  const initialize = config.initialize;
  if (!isPlainObject(initialize)) return [];

  const ids: string[] = [];
  for (const field of Object.values(initialize)) {
    const entries = Array.isArray(field) ? field : [field];
    for (const entry of entries) {
      if (isFromIdRef(entry) && entry.type === ELECTRICAL_CELL_RECORDING_FROM_ID) {
        ids.push(entry.id_str);
      }
    }
  }
  return ids;
}

/** Endpoint template declared by the scan-config schema under `property_endpoints`. */
export function resolveRecordingPropertiesEndpoint(schema: ConfigSchema): string | null {
  return schema.property_endpoints?.[SchemaMappingKeyDict.ElectricalCellRecordings] ?? null;
}

/**
 * Protocols and amplitudes discovered for the selected recordings.
 *
 * Every selected recording contributes, so the query key carries the sorted id list: adding or
 * removing a recording refetches, reordering the same selection does not.
 */
export function useElectricalCellRecordingProperties({
  config,
  schema,
  workspace,
  enabled = true,
}: {
  config: Config;
  schema: ConfigSchema;
  workspace: WorkspaceContext;
  enabled?: boolean;
}) {
  const recordingIds = extractRecordingIds(config);
  const endpoint = resolveRecordingPropertiesEndpoint(schema);
  const sortedIds = [...recordingIds].sort();

  return useQuery({
    queryKey: ['mapped-electrical-cell-recording-properties', { endpoint, ids: sortedIds }],
    queryFn: async () => {
      const api = await obioneApi();
      const resp = await api.get(`/${endpoint}`.replace(/^\/+/, '/'), {
        queryParams: { recording_ids: sortedIds },
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...getEntityCoreContext(workspace).headers,
        },
      });

      return parseElectricalCellRecordingProperties(resp);
    },
    enabled: enabled && sortedIds.length > 0 && !!endpoint,
    staleTime: RECORDING_PROPERTIES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
