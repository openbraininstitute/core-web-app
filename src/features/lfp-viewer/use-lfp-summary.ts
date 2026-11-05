import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildLfpSummaryRequest,
  getLfpSummaryIndex,
  requestLfpSummary,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import { contactPositions } from '@/features/lfp-viewer/contacts';
import {
  datasetOf,
  fieldStats,
  isLfpSummaryChanged,
  lfpSummaryIndexSchema,
  overviewLevel,
  readChunkTable,
  readField,
  readRow,
  readSlice,
  rowsField,
  sumFields,
} from '@/features/lfp-viewer/summary';
import { arrayLocationsQuery } from '@/features/scan-config/components/model-preview/electrode-locations-asset';

import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import type {
  LfpSummarySource,
  LfpSummaryStatus,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { ContactBlock } from '@/features/lfp-viewer/contacts';
import type { LfpField, LfpSummaryIndex } from '@/features/lfp-viewer/summary';
import type { WorkspaceContext } from '@/types/common';

/** How often a summary being built is asked after. */
const BUILDING_POLL_MS = 5000;

export type LfpSummary = {
  sha256: string;
  index: LfpSummaryIndex;
  /** The total field at its overview level: what the map, the 3D contacts and the traces draw. */
  total: LfpField;
  /** Per contact, the index's `stats` columns. */
  stats: Float32Array;
  /** Per contact, the power at each of the total's `psd_frequencies`, in µV²/Hz. */
  psd: Float32Array;
};

/** Which field is drawn: some of an axis's groups, added up. The total is the first axis's only group. */
export type FieldChoice = { axis: number; groups: readonly number[] };

export const TOTAL_FIELD: FieldChoice = { axis: 0, groups: [0] };

export const isTotalField = (choice: FieldChoice) => choice.axis === 0;

/** What is known of the field chosen without reading its rows. */
export type ChosenField = {
  choice: FieldChoice;
  /** At its overview level. */
  field: LfpField;
  /** Per contact, the index's `stats` columns: over the overview's bins where groups are added up. */
  stats: Float32Array;
  /** Per contact, stored for one group: the power of a sum is not the sum of the powers. */
  spectra: { frequencies: readonly number[]; psd: Float32Array } | null;
};

type GroupFieldData = { field: LfpField; stats: Float32Array; psd: Float32Array };

export const statusKey = ({ resultId, assetId }: LfpSummarySource) => [
  'lfp-summary',
  'status',
  resultId,
  assetId,
];

/**
 * A read of a summary built again since its status was read asks the status again: once, however
 * many reads of that summary fail, and not after the status has moved on from it.
 */
export function askStatusIfChanged(
  queryClient: QueryClient,
  source: LfpSummarySource,
  sha256: string
) {
  return (error: unknown): never => {
    if (isLfpSummaryChanged(error)) {
      const status = queryClient.getQueryData<LfpSummaryStatus>(statusKey(source));
      if (status?.state === 'ready' && status.sha256 === sha256) {
        queryClient.invalidateQueries({ queryKey: statusKey(source) }, { cancelRefetch: false });
      }
    }
    throw error;
  };
}

/**
 * An LFP report's summary from Bluenaas, which builds it the first time it is
 * asked: its status, asked again while it builds, then, once ready, its index
 * and the total's overview, stats and spectra.
 */
export function useLfpSummary(source: LfpSummarySource) {
  const { resultId, assetId } = source;
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: statusKey(source),
    queryFn: () => requestLfpSummary(source),
    refetchInterval: (query) => (query.state.data?.state === 'building' ? BUILDING_POLL_MS : false),
    staleTime: Infinity,
  });
  const ready = status.data?.state === 'ready' ? status.data : null;

  const summary = useQuery({
    queryKey: ['lfp-summary', 'data', resultId, assetId, ready?.sha256],
    enabled: ready !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<LfpSummary> => {
      const sha256 = ready?.sha256 ?? '';
      try {
        const index = lfpSummaryIndexSchema.parse(await getLfpSummaryIndex(source, sha256));
        const request = await buildLfpSummaryRequest(source, sha256);
        const axis = index.axes[0];
        const [total, stats, psd] = await Promise.all([
          readField(request, index, axis, 0, overviewLevel(axis), signal),
          readSlice(request, datasetOf(index, axis.stats), [0], signal),
          readSlice(request, datasetOf(index, axis.psd), [0], signal),
        ]);
        return { sha256, index, total, stats: new Float32Array(stats), psd: new Float32Array(psd) };
      } catch (error) {
        return askStatusIfChanged(queryClient, source, sha256)(error);
      }
    },
  });

  return { status, summary };
}

function summedGroups(
  index: LfpSummaryIndex,
  choice: FieldChoice,
  groups: readonly GroupFieldData[]
): ChosenField {
  if (groups.length === 1) {
    const [{ field, stats, psd }] = groups;
    const frequencies = index.axes[choice.axis].psd_frequencies;
    return { choice, field, stats, spectra: { frequencies, psd } };
  }
  const field = sumFields(groups.map((group) => group.field));
  return { choice, field, stats: fieldStats(field, index.stats), spectra: null };
}

/**
 * The field chosen, read once and kept per group. While it is being read the
 * one before stays on show, so that picking a group doesn't blank the panes.
 */
export function useChosenField(
  source: LfpSummarySource,
  summary: LfpSummary,
  choice: FieldChoice
): { chosen: ChosenField; loading: boolean; failed: boolean } {
  const { index, sha256, total, stats, psd } = summary;
  const axis = index.axes[choice.axis];
  const queryClient = useQueryClient();
  const totalField = useMemo<ChosenField>(
    () => ({
      choice: TOTAL_FIELD,
      field: total,
      stats,
      spectra: { frequencies: index.axes[0].psd_frequencies, psd },
    }),
    [total, stats, psd, index]
  );
  const combine = useCallback(
    (results: UseQueryResult<GroupFieldData>[]) => ({
      ready:
        results.length > 0 && results.every((r) => r.data)
          ? summedGroups(
              index,
              choice,
              results.map((r) => r.data as GroupFieldData)
            )
          : null,
      failed: results.some((r) => r.isError),
    }),
    [index, choice]
  );
  const read = useQueries({
    queries: isTotalField(choice)
      ? []
      : choice.groups.map((group) => ({
          queryKey: [
            'lfp-summary',
            'group',
            source.resultId,
            source.assetId,
            sha256,
            axis.name,
            group,
          ],
          staleTime: Infinity,
          gcTime: 5 * 60_000,
          queryFn: async ({ signal }: { signal: AbortSignal }): Promise<GroupFieldData> => {
            try {
              const request = await buildLfpSummaryRequest(source, sha256);
              const [field, groupStats, groupPsd] = await Promise.all([
                readField(request, index, axis, group, overviewLevel(axis), signal),
                readSlice(request, datasetOf(index, axis.stats), [group], signal),
                readSlice(request, datasetOf(index, axis.psd), [group], signal),
              ]);
              return {
                field,
                stats: new Float32Array(groupStats),
                psd: new Float32Array(groupPsd),
              };
            } catch (error) {
              return askStatusIfChanged(queryClient, source, sha256)(error);
            }
          },
        })),
    combine,
  });
  const wanted = isTotalField(choice) ? totalField : read.ready;
  const [shown, setShown] = useState(totalField);
  useEffect(() => {
    if (wanted) setShown(wanted);
  }, [wanted]);
  return { chosen: wanted ?? shown, loading: !wanted && !read.failed, failed: read.failed };
}

type ContactRows = {
  /** A row per contact asked for, in that order, once every one is in. */
  field: LfpField | null;
  failed: boolean;
};

const NO_ROWS: ContactRows = { field: null, failed: false };

/**
 * Contacts at full resolution: from the overview where it is already that,
 * else each contact's own row of each group chosen, read by range once and kept, while `enabled`.
 */
export function useContactRows(
  source: LfpSummarySource,
  summary: LfpSummary,
  { choice, field: overview }: ChosenField,
  contacts: readonly number[],
  enabled = true
): ContactRows {
  const { index, sha256 } = summary;
  const axis = index.axes[choice.axis];
  const queryClient = useQueryClient();
  const combine = useCallback(
    (results: UseQueryResult<Int16Array>[]): ContactRows => ({
      field:
        results.length > 0 && results.every((r) => r.data)
          ? sumFields(
              choice.groups.map((group, g) =>
                rowsField(
                  index,
                  axis.scales[group],
                  contacts.map((_, c) => results[c * choice.groups.length + g].data as Int16Array)
                )
              )
            )
          : null,
      failed: results.some((r) => r.isError),
    }),
    [index, axis, choice, contacts]
  );
  const read = useQueries({
    queries:
      overview.kind === 'value'
        ? []
        : contacts.flatMap((contact) =>
            choice.groups.map((group) => ({
              queryKey: [
                'lfp-summary',
                'row',
                source.resultId,
                source.assetId,
                sha256,
                axis.name,
                group,
                contact,
              ],
              staleTime: Infinity,
              gcTime: 60_000,
              enabled,
              queryFn: async ({ signal }: { signal: AbortSignal }) => {
                try {
                  const request = await buildLfpSummaryRequest(source, sha256);
                  const table = await queryClient.fetchQuery({
                    queryKey: [
                      'lfp-summary',
                      'chunks',
                      source.resultId,
                      source.assetId,
                      sha256,
                      axis.name,
                    ],
                    staleTime: Infinity,
                    gcTime: 60_000,
                    queryFn: () => readChunkTable(request, index, axis),
                  });
                  return await readRow(request, index, axis, group, contact, table, signal);
                } catch (error) {
                  return askStatusIfChanged(queryClient, source, sha256)(error);
                }
              },
            }))
          ),
    combine,
  });
  return useMemo(() => {
    if (overview.kind !== 'value') return read;
    if (contacts.length === 0) return NO_ROWS;
    const rows = contacts.map((c) =>
      overview.data.subarray(c * overview.bins, (c + 1) * overview.bins)
    );
    return { field: rowsField(index, overview.scale, rows), failed: false };
  }, [overview, read, contacts, index]);
}

export function useStoredCorrelation(
  source: LfpSummarySource,
  summary: LfpSummary,
  enabled: boolean
) {
  const { index, sha256 } = summary;
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['lfp-summary', 'correlation', source.resultId, source.assetId, sha256],
    enabled,
    staleTime: Infinity,
    gcTime: 60_000,
    queryFn: async ({ signal }) => {
      const stored = index.correlation;
      if (!stored) throw new Error('The LFP summary has no correlation');
      const bytes = await readSlice(
        await buildLfpSummaryRequest(source, sha256),
        datasetOf(index, stored.dataset),
        [],
        signal
      ).catch(askStatusIfChanged(queryClient, source, sha256));
      return { values: new Int16Array(bytes), scale: stored.scale };
    },
  });
}

export type ContactPositions =
  | { state: 'loading' | 'failed' | 'absent'; positions: null; blocks: null }
  | { state: 'ready'; positions: Float32Array; blocks: ContactBlock[] };

const NO_POSITIONS = { positions: null, blocks: null };

/**
 * Where the report's contacts are, from its recording array's stored
 * locations, in the report's order. Absent where the array has none, or they
 * do not match the report.
 */
export function useContactPositions(
  ctx: WorkspaceContext,
  arrayId: string | null,
  contacts: number | undefined
): ContactPositions {
  const { data, isError, isLoading } = useQuery({
    ...arrayLocationsQuery(ctx, arrayId ?? ''),
    enabled: arrayId !== null,
    staleTime: Infinity,
  });
  return useMemo(() => {
    if (isLoading) return { state: 'loading', ...NO_POSITIONS };
    if (isError) return { state: 'failed', ...NO_POSITIONS };
    const found = data && contacts !== undefined ? contactPositions(data, contacts) : null;
    return found ? { state: 'ready', ...found } : { state: 'absent', ...NO_POSITIONS };
  }, [data, isError, isLoading, contacts]);
}
