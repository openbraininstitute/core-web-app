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
  levelTiling,
  lfpSummaryIndexSchema,
  overviewAt,
  readBlockCoding,
  readContactShares,
  readField,
  readGroupStats,
  readRanges,
  readSlice,
  readTile,
  rowsField,
  sumFields,
  windowField,
  windowLevel,
  windowTiles,
} from '@/features/lfp-viewer/summary';
import { arrayLocationsQuery } from '@/features/scan-config/components/model-preview/electrode-locations-asset';

import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import type {
  LfpSummarySource,
  LfpSummaryStatus,
} from '@/api/small-scale-simulator/simulation-result/lfp-summary';
import type { ContactBlock } from '@/features/lfp-viewer/contacts';
import type {
  ByteRange,
  GroupStats,
  LfpAxis,
  LfpField,
  LfpSummaryIndex,
  ReadRange,
} from '@/features/lfp-viewer/summary';
import type { WorkspaceContext } from '@/types/common';

/** How often a summary being built is asked after. */
const BUILDING_POLL_MS = 5000;
const REGROUP_POLL_MS = 60_000;

/** The rows one view may ask for: read together, so what they cost is their bytes, 2 a step. */
export const MAX_ROW_READS = 256;

/** The bytes a window of traces may hold at once, decoded: past it the overview is drawn. */
const MAX_WINDOW_BYTES = 64 * 2 ** 20;

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
  /** Per contact, the part of the total's variance its groups make there, added up. None for the total. */
  shares: Float32Array | null;
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
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status?.state === 'building') return BUILDING_POLL_MS;
      // Asked again while its groups may be on the way, for the summary that has them
      const open =
        status?.state === 'ready'
          ? queryClient.getQueryData<LfpSummary>(summaryKey(source, 'data', status.sha256))
          : undefined;
      return open?.index.groups_unavailable ? REGROUP_POLL_MS : false;
    },
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
      const index = lfpSummaryIndexSchema.parse(
        await getLfpSummaryIndex(source, sha256).catch(
          askStatusIfChanged(queryClient, source, sha256)
        )
      );
      const read = rangesOf({ queryClient, source, sha256 }, signal);
      const axis = index.axes[0];
      const [total, stored] = await Promise.all([
        readField(read, index, axis, 0, overviewAt(axis)),
        readGroupStats(read, index, axis, 0),
      ]);
      return { sha256, index, total, ...stored };
    },
  });

  return { status, summary };
}

/** What a read of a summary holds on to, for as long as the cache keeps it. */
type SummaryRead = { queryClient: QueryClient; source: LfpSummarySource; sha256: string };

type AxisRead = SummaryRead & { index: LfpSummaryIndex; axis: LfpAxis };

type RangeAsked = {
  range: ByteRange;
  signal: AbortSignal;
  resolve: (bytes: Uint8Array<ArrayBuffer>) => void;
  reject: (error: unknown) => void;
};

/** By summary, the ranges asked for since it was last read from. */
const rangesAsked = new Map<string, RangeAsked[]>();

async function readRangesAsked(
  { queryClient, source, sha256 }: SummaryRead,
  asked: readonly RangeAsked[]
) {
  // Read for as long as anyone still wants a part of it
  const reading = new AbortController();
  let wanted = asked.length;
  for (const { signal, reject } of asked) {
    const leave = () => {
      reject(signal.reason);
      wanted -= 1;
      if (wanted === 0) reading.abort();
    };
    if (signal.aborted) leave();
    else signal.addEventListener('abort', leave, { once: true });
  }
  try {
    const parts = await buildLfpSummaryRequest(source, sha256)
      .then((request) =>
        readRanges(
          request,
          asked.map(({ range }) => range),
          reading.signal
        )
      )
      .catch(askStatusIfChanged(queryClient, source, sha256));
    asked.forEach(({ resolve }, i) => {
      resolve(parts[i]);
    });
  } catch (error) {
    for (const { reject } of asked) reject(error);
  }
}

/**
 * A summary's bytes, read with every other range of it asked for at the same moment, as a view's
 * are: in one request, so with one check of the reader's access.
 */
function rangesOf(at: SummaryRead, signal: AbortSignal): ReadRange {
  const key = summaryKey(at.source, 'ranges', at.sha256).join('/');
  return (range) =>
    new Promise((resolve, reject) => {
      const one = { range, signal, resolve, reject };
      const asked = rangesAsked.get(key);
      if (asked) {
        asked.push(one);
        return;
      }
      const batch = [one];
      rangesAsked.set(key, batch);
      setTimeout(() => {
        rangesAsked.delete(key);
        readRangesAsked(at, batch);
      });
    });
}

const groupQuery = <T>(
  at: AxisRead,
  kind: string,
  key: readonly number[],
  read: (read: ReadRange) => Promise<T>,
  gcTime = 5 * 60_000
) => ({
  queryKey: summaryKey(at.source, kind, at.sha256, at.axis.name, ...key),
  staleTime: Infinity,
  gcTime,
  queryFn: ({ signal }: { signal: AbortSignal }) => read(rangesOf(at, signal)),
});

const groupFieldQuery = (at: AxisRead, group: number) =>
  groupQuery(at, 'group', [group], (read) =>
    readField(read, at.index, at.axis, group, overviewAt(at.axis))
  );

const groupStatsQuery = (at: AxisRead, group: number) =>
  groupQuery(at, 'group-stats', [group], (read) => readGroupStats(read, at.index, at.axis, group));

const groupSharesQuery = (at: AxisRead, group: number) =>
  groupQuery(at, 'group-shares', [group], (read) =>
    readContactShares(read, at.index, at.axis, group)
  );

/** A group's block coding of a level, read once and kept. */
const blockCoding = (at: AxisRead, group: number, levelAt: number) =>
  at.queryClient.fetchQuery(
    groupQuery(at, 'blocks', [group, levelAt], (read) =>
      readBlockCoding(read, at.index, at.axis.levels[levelAt], group)
    )
  );

const ROWS_GC_MS = 60_000;

/** A contact's whole row, its blocks one after another. */
export const rowQuery = (at: AxisRead, group: number, contact: number) =>
  groupQuery(
    at,
    'row',
    [group, contact],
    async (read) => {
      const coding = await blockCoding(at, group, 0);
      const { tileBins, count } = levelTiling(at.index, at.axis, 0);
      const blocks = await Promise.all(
        Array.from({ length: count }, (_, tile) =>
          readTile(read, at.index, at.axis, { group, contact, levelAt: 0, tile }, coding)
        )
      );
      const row = new Int16Array(at.index.time.steps);
      blocks.forEach((block, b) => {
        row.set(block, b * tileBins);
      });
      return row;
    },
    ROWS_GC_MS
  );

/** A contact's tile of a level: a block at full resolution, else bins of an overview. */
const tileQuery = (at: AxisRead, group: number, contact: number, levelAt: number, tile: number) =>
  groupQuery(
    at,
    'tile',
    [group, contact, levelAt, tile],
    async (read) => {
      const coding = await blockCoding(at, group, levelAt);
      return readTile(read, at.index, at.axis, { group, contact, levelAt, tile }, coding);
    },
    ROWS_GC_MS
  );

const oneGroup = (
  index: LfpSummaryIndex,
  choice: FieldChoice,
  field: LfpField,
  { stats, psd }: GroupStats,
  shares: Float32Array | null
): ChosenField => ({
  choice,
  field,
  stats,
  spectra: { frequencies: index.axes[choice.axis].psd_frequencies, psd },
  shares,
});

function addedUp(arrays: readonly Float32Array[]): Float32Array {
  const sum = new Float32Array(arrays[0].length);
  for (const values of arrays) {
    for (let i = 0; i < sum.length; i++) sum[i] += values[i];
  }
  return sum;
}

const allRead = <T>(results: UseQueryResult<T>[]) => ({
  data: results.length > 0 && results.every((r) => r.data) ? results.map((r) => r.data as T) : null,
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
    () => oneGroup(index, TOTAL_FIELD, total, { stats, psd }, null),
    [index, total, stats, psd]
  );
  const at = { queryClient, source, sha256, index, axis };
  const read = useQueries({
    queries: isTotalField(choice) ? [] : choice.groups.map((group) => groupFieldQuery(at, group)),
    combine: allRead<LfpField>,
  });
  const shares = useQueries({
    queries: isTotalField(choice) ? [] : choice.groups.map((group) => groupSharesQuery(at, group)),
    combine: allRead<Float32Array>,
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
    // The shares are waited for, but the field is shown without them where they can't be read
    if (!read.data || (!shares.data && !shares.failed)) return null;
    if (choice.groups.length > 1) {
      const field = sumFields(read.data);
      return {
        choice,
        field,
        stats: fieldStats(field, index.stats),
        spectra: null,
        shares: shares.data && addedUp(shares.data),
      };
    }
    return groupStats.data
      ? oneGroup(index, choice, read.data[0], groupStats.data, shares.data?.[0] ?? null)
      : null;
  }, [index, choice, totalField, read.data, shares.data, shares.failed, groupStats.data]);
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

/** Contacts' rows over a window: `rows` has each contact's row of `field`. */
export type TraceRows = { field: LfpField; rows: ReadonlyMap<number, number> };

type WindowRows = {
  rows: TraceRows | null;
  /** The finest bin the contacts can be read at: a window of two is as far as a zoom goes. */
  finestBinMs: number;
  tooMany: boolean;
  failed: boolean;
};

/** The tiles a level's reads must fit in for it to be read at all: a narrow window's, with room to pan. */
const NARROW_WINDOW_TILES = 3;

function windowBytes(
  index: LfpSummaryIndex,
  axis: LfpAxis,
  rows: number,
  levelAt: number,
  tiles: number
) {
  const { tileBins, width } = levelTiling(index, axis, levelAt);
  return rows * tiles * tileBins * width * 2;
}

/**
 * The finest level `rows` rows can be read at, the overview where none are, and the level a window
 * of `spanMs` across `width` pixels is read at: the coarsest with a bin a pixel, the finest at most,
 * the overview where that is as fine.
 */
export function windowReadLevel(
  index: LfpSummaryIndex,
  axis: LfpAxis,
  rows: number | null,
  spanMs: number,
  width: number
) {
  const coarsest = axis.levels.length - 1;
  const finest =
    rows === null
      ? coarsest
      : axis.levels.findIndex(
          (_, at) =>
            at === coarsest ||
            windowBytes(index, axis, rows, at, NARROW_WINDOW_TILES) <= MAX_WINDOW_BYTES
        );
  const at = Math.max(finest, windowLevel(axis, spanMs / index.time.dt, width));
  // A short run's overview is its values: none finer is read
  return { finest, levelAt: axis.levels[at].step < axis.levels[coarsest].step ? at : coarsest };
}

const covers = (field: LfpField, from: number, to: number) =>
  field.start <= from && field.start + field.bins * field.binMs >= to;

/**
 * Contacts over a window of time, at the coarsest level with a bin for each of `width` pixels, or
 * the finest their reads fit in: read in tiles, kept, and shared with the next window. None where
 * the overview already has that, which is then drawn. While a window is read the last one of the
 * same field stays on show, where it covers the window.
 */
export function useWindowRows(
  source: LfpSummarySource,
  summary: LfpSummary,
  chosen: ChosenField,
  contacts: readonly number[],
  [from, to]: readonly [number, number],
  width: number,
  enabled: boolean
): WindowRows {
  const { index, sha256 } = summary;
  const { choice, field: overview } = chosen;
  const axis = index.axes[choice.axis];
  const rowsRead = enabled ? contacts.length * choice.groups.length : null;
  const { finest, levelAt } = windowReadLevel(index, axis, rowsRead, to - from, width);
  const finestBinMs = axis.levels[finest].step * index.time.dt;
  const fromOverview = levelAt === axis.levels.length - 1;
  // Kept while the window moves within the same tiles, so the field isn't put together again
  const inWindow = fromOverview ? [] : windowTiles(index, axis, levelAt, [from, to]);
  const [firstTile, tileCount] = [inWindow[0], inWindow.length];
  const tiles = useMemo(
    () => Array.from({ length: tileCount }, (_, t) => firstTile + t),
    [firstTile, tileCount]
  );
  const tooMany = windowBytes(index, axis, rowsRead ?? 0, levelAt, tiles.length) > MAX_WINDOW_BYTES;
  const queryClient = useQueryClient();
  const at = { queryClient, source, sha256, index, axis };
  const read = useQueries({
    queries:
      tooMany || tiles.length === 0
        ? []
        : contacts.flatMap((contact) =>
            choice.groups.flatMap((group) =>
              tiles.map((tile) => tileQuery(at, group, contact, levelAt, tile))
            )
          ),
    combine: allRead<Int16Array>,
  });
  const wanted = useMemo(() => {
    if (!read.data) return null;
    const data = read.data;
    const perContact = choice.groups.length * tiles.length;
    const fields = choice.groups.map((group, g) =>
      windowField(
        index,
        axis,
        group,
        levelAt,
        tiles,
        contacts.map((_, c) => tiles.map((_, t) => data[c * perContact + g * tiles.length + t]))
      )
    );
    const rows = new Map(contacts.map((contact, row) => [contact, row]));
    return { field: sumFields(fields), rows };
  }, [read.data, choice.groups, tiles, index, axis, levelAt, contacts]);
  const [shown, setShown] = useState<{ of: LfpField; rows: TraceRows } | null>(null);
  if (wanted && shown?.rows !== wanted) setShown({ of: overview, rows: wanted });
  const none = { rows: null, finestBinMs, tooMany, failed: false };
  if (fromOverview || tooMany) return none;
  const held = shown?.of === overview && covers(shown.rows.field, from, to) ? shown.rows : null;
  return { ...none, rows: wanted ?? held, failed: read.failed };
}

/** Whether the field chosen has its correlation stored: groups added up have none. */
export const hasStoredCorrelation = (index: LfpSummaryIndex, { axis, groups }: FieldChoice) =>
  groups.length === 1 && !!index.axes[axis].correlation;

export function useStoredCorrelation(
  source: LfpSummarySource,
  summary: LfpSummary,
  { axis: axisAt, groups: [group] }: FieldChoice,
  enabled: boolean
) {
  const { index, sha256 } = summary;
  const axis = index.axes[axisAt];
  const queryClient = useQueryClient();
  const at = { queryClient, source, sha256, index, axis };
  return useQuery({
    ...groupQuery(
      at,
      'correlation',
      [group],
      async (read) => {
        const stored = axis.correlation;
        if (!stored) throw new Error('The LFP summary has no correlation');
        const bytes = await readSlice(read, datasetOf(index, stored.dataset), [group]);
        return { values: new Int16Array(bytes), scale: stored.scale };
      },
      60_000
    ),
    enabled,
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
