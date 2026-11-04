import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  buildLfpSummaryRequest,
  getLfpSummaryIndex,
  requestLfpSummary,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import { contactPositions } from '@/features/lfp-viewer/contacts';
import {
  datasetOf,
  isLfpSummaryChanged,
  lfpSummaryIndexSchema,
  overviewLevel,
  readField,
  readRow,
  readSlice,
  rowsField,
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
  /** Per contact, the power at each of the index's `psd_frequencies`, in µV²/Hz. */
  psd: Float32Array;
};

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

type ContactRows = {
  /** A row per contact asked for, in that order, once every one is in. */
  field: LfpField | null;
  failed: boolean;
};

const NO_ROWS: ContactRows = { field: null, failed: false };

/**
 * Contacts at full resolution: from the overview where it is already that,
 * else each contact's own row of the total, read by range once and kept.
 */
export function useContactRows(
  source: LfpSummarySource,
  summary: LfpSummary,
  contacts: readonly number[]
): ContactRows {
  const { index, total, sha256 } = summary;
  const axis = index.axes[0];
  const queryClient = useQueryClient();
  const combine = useCallback(
    (results: UseQueryResult<Int16Array>[]): ContactRows => ({
      field:
        results.length > 0 && results.every((r) => r.data)
          ? rowsField(
              index,
              axis,
              0,
              results.map((r) => r.data as Int16Array)
            )
          : null,
      failed: results.some((r) => r.isError),
    }),
    [index, axis]
  );
  const read = useQueries({
    queries:
      total.kind === 'value'
        ? []
        : contacts.map((contact) => ({
            queryKey: ['lfp-summary', 'row', source.resultId, source.assetId, sha256, contact],
            staleTime: Infinity,
            gcTime: 60_000,
            queryFn: async ({ signal }: { signal: AbortSignal }) =>
              readRow(
                await buildLfpSummaryRequest(source, sha256),
                index,
                axis,
                0,
                contact,
                signal
              ).catch(askStatusIfChanged(queryClient, source, sha256)),
          })),
    combine,
  });
  return useMemo(() => {
    if (total.kind !== 'value') return read;
    if (contacts.length === 0) return NO_ROWS;
    const rows = contacts.map((c) => total.data.subarray(c * total.bins, (c + 1) * total.bins));
    return { field: rowsField(index, axis, 0, rows), failed: false };
  }, [total, read, contacts, index, axis]);
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
