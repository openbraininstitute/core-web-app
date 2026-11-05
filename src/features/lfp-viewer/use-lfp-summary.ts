import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

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
  readGroupStats,
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
import type {
  GroupStats,
  LfpAxis,
  LfpField,
  LfpSummaryIndex,
  LfpSummaryRequest,
} from '@/features/lfp-viewer/summary';
import type { WorkspaceContext } from '@/types/common';

/** How often a summary being built is asked after. */
const BUILDING_POLL_MS = 5000;

/** The rows one view may ask for: each takes a request, and a server answers about 5 a second. */
export const MAX_ROW_READS = 64;

export type LfpSummary = GroupStats & {
  sha256: string;
  index: LfpSummaryIndex;
  /** The total field at its overview level: what the rows' order and the opening view go by. */
  total: LfpField;
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

/** Whether a chosen field's table is worked out from its overview's bins, not its full rows. */
export const statsFromOverview = ({ spectra, field }: ChosenField) =>
  !spectra && field.kind !== 'value';

/** Whether its contacts' rows are more than a view may ask for. */
export const overRowLimit = ({ choice, field }: ChosenField, contacts: number) =>
  field.kind !== 'value' && contacts * choice.groups.length > MAX_ROW_READS;

const summaryKey = (
  { resultId, assetId }: LfpSummarySource,
  kind: string,
  ...rest: readonly unknown[]
) => ['lfp-summary', kind, resultId, assetId, ...rest];

export const statusKey = (source: LfpSummarySource) => summaryKey(source, 'status');

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
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: statusKey(source),
    queryFn: () => requestLfpSummary(source),
    refetchInterval: (query) => (query.state.data?.state === 'building' ? BUILDING_POLL_MS : false),
    staleTime: Infinity,
  });
  const ready = status.data?.state === 'ready' ? status.data : null;

  const summary = useQuery({
    queryKey: summaryKey(source, 'data', ready?.sha256),
    enabled: ready !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<LfpSummary> => {
      const sha256 = ready?.sha256 ?? '';
      try {
        const index = lfpSummaryIndexSchema.parse(await getLfpSummaryIndex(source, sha256));
        const request = await buildLfpSummaryRequest(source, sha256);
        const axis = index.axes[0];
        const [total, stored] = await Promise.all([
          readField(request, index, axis, 0, overviewLevel(axis), signal),
          readGroupStats(request, index, axis, 0, signal),
        ]);
        return { sha256, index, total, ...stored };
      } catch (error) {
        return askStatusIfChanged(queryClient, source, sha256)(error);
      }
    },
  });

  return { status, summary };
}

/** What a query of an axis of a summary holds on to, for as long as the cache keeps it. */
type AxisRead = {
  queryClient: QueryClient;
  source: LfpSummarySource;
  sha256: string;
  index: LfpSummaryIndex;
  axis: LfpAxis;
};

async function readingSummary<T>(
  { queryClient, source, sha256 }: AxisRead,
  read: (request: LfpSummaryRequest) => Promise<T>
): Promise<T> {
  try {
    return await read(await buildLfpSummaryRequest(source, sha256));
  } catch (error) {
    return askStatusIfChanged(queryClient, source, sha256)(error);
  }
}

const groupFieldQuery = (at: AxisRead, group: number) => ({
  queryKey: summaryKey(at.source, 'group', at.sha256, at.axis.name, group),
  staleTime: Infinity,
  gcTime: 5 * 60_000,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    readingSummary(at, (request) =>
      readField(request, at.index, at.axis, group, overviewLevel(at.axis), signal)
    ),
});

const groupStatsQuery = (at: AxisRead, group: number) => ({
  queryKey: summaryKey(at.source, 'group-stats', at.sha256, at.axis.name, group),
  staleTime: Infinity,
  gcTime: 5 * 60_000,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    readingSummary(at, (request) => readGroupStats(request, at.index, at.axis, group, signal)),
});

const rowQuery = (at: AxisRead, group: number, contact: number) => ({
  queryKey: summaryKey(at.source, 'row', at.sha256, at.axis.name, group, contact),
  staleTime: Infinity,
  gcTime: 60_000,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    readingSummary(at, async (request) => {
      const table = await at.queryClient.fetchQuery({
        queryKey: summaryKey(at.source, 'chunks', at.sha256, at.axis.name),
        staleTime: Infinity,
        gcTime: 60_000,
        queryFn: () => readChunkTable(request, at.index, at.axis),
      });
      return readRow(request, at.index, at.axis, group, contact, table, signal);
    }),
});

const oneGroup = (
  index: LfpSummaryIndex,
  choice: FieldChoice,
  field: LfpField,
  { stats, psd }: GroupStats
): ChosenField => ({
  choice,
  field,
  stats,
  spectra: { frequencies: index.axes[choice.axis].psd_frequencies, psd },
});

const fieldsRead = (results: UseQueryResult<LfpField>[]) => ({
  fields:
    results.length > 0 && results.every((r) => r.data)
      ? results.map((r) => r.data as LfpField)
      : null,
  failed: results.some((r) => r.isError),
});

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
  const totalField = useMemo(
    () => oneGroup(index, TOTAL_FIELD, total, { stats, psd }),
    [index, total, stats, psd]
  );
  const at = { queryClient, source, sha256, index, axis };
  const read = useQueries({
    queries: isTotalField(choice) ? [] : choice.groups.map((group) => groupFieldQuery(at, group)),
    combine: fieldsRead,
  });
  // Only one group's are shown: a sum's are worked out from its field, so they'd be read for nothing.
  const oneOfAGroup = !isTotalField(choice) && choice.groups.length === 1;
  const groupStats = useQuery({
    ...groupStatsQuery(at, choice.groups[0]),
    enabled: oneOfAGroup,
  });
  const failed = read.failed || (oneOfAGroup && groupStats.isError);
  const wanted = useMemo<ChosenField | null>(() => {
    if (isTotalField(choice)) return totalField;
    if (!read.fields) return null;
    if (choice.groups.length > 1) {
      const field = sumFields(read.fields);
      return { choice, field, stats: fieldStats(field, index.stats), spectra: null };
    }
    return groupStats.data ? oneGroup(index, choice, read.fields[0], groupStats.data) : null;
  }, [index, choice, totalField, read.fields, groupStats.data]);
  const [shown, setShown] = useState<ChosenField>(totalField);
  if (wanted && wanted !== shown) setShown(wanted);
  return { chosen: wanted ?? shown, loading: !wanted && !failed, failed };
}

export type RowsProblem = 'failed' | 'too-many';

type ContactRows = {
  /** A row per contact asked for, in that order, once every one is in. */
  field: LfpField | null;
  problem: RowsProblem | null;
};

const NO_ROWS: ContactRows = { field: null, problem: null };
const TOO_MANY_ROWS: ContactRows = { field: null, problem: 'too-many' };

/**
 * Contacts at full resolution: from the overview where it is already that,
 * else each contact's own row of each group chosen, read by range once and kept, while `enabled`,
 * unless that is over the limit.
 */
export function useContactRows(
  source: LfpSummarySource,
  summary: LfpSummary,
  chosen: ChosenField,
  contacts: readonly number[],
  enabled = true
): ContactRows {
  const { index, sha256 } = summary;
  const { choice, field: overview } = chosen;
  const axis = index.axes[choice.axis];
  const tooMany = overRowLimit(chosen, contacts.length);
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
      problem: results.some((r) => r.isError) ? 'failed' : null,
    }),
    [index, axis, choice, contacts]
  );
  const at = { queryClient, source, sha256, index, axis };
  const read = useQueries({
    queries:
      overview.kind === 'value' || tooMany
        ? []
        : contacts.flatMap((contact) =>
            choice.groups.map((group) => ({ ...rowQuery(at, group, contact), enabled }))
          ),
    combine,
  });
  return useMemo(() => {
    if (tooMany) return TOO_MANY_ROWS;
    if (overview.kind !== 'value') return read;
    if (contacts.length === 0) return NO_ROWS;
    const rows = contacts.map((c) =>
      overview.data.subarray(c * overview.bins, (c + 1) * overview.bins)
    );
    return { field: rowsField(index, overview.scale, rows), problem: null };
  }, [overview, read, contacts, index, tooMany]);
}

export function useStoredCorrelation(
  source: LfpSummarySource,
  summary: LfpSummary,
  enabled: boolean
) {
  const { index, sha256 } = summary;
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: summaryKey(source, 'correlation', sha256),
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
