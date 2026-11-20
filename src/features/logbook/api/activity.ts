// Saved activity up to when the log opened; anything after comes from the live change feed.
import { infiniteQueryOptions } from '@tanstack/react-query';
import { isNotNil } from 'es-toolkit';

import { getResearchActivity } from '@/api/logbook/queries/research';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IActivityEntry } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

// One writer's rows on one page, merged while at most GAP_MS apart.
export interface IActivityRun {
  readonly key: string;
  readonly pageId: string;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
  readonly from: number;
  readonly to: number;
  readonly inserted: number;
  readonly deleted: number;
  readonly removed: string;
}

const GAP_MS = 5 * 60_000;
const RUN_REMOVED_MAX = 1000;

// Runs are built newest first, so older text goes in front.
const joinRemoved = (older: string, newer: string): string =>
  (older.length === 0 || newer.length === 0 ? older + newer : `${older} ${newer}`).slice(
    0,
    RUN_REMOVED_MAX
  );

export function runsOf(entries: readonly IActivityEntry[]): IActivityRun[] {
  const runs: IActivityRun[] = [];
  for (const entry of entries) {
    const at = Date.parse(entry.minute);
    const last = runs.at(-1);
    if (
      isNotNil(last) &&
      last.userId === entry.userId &&
      last.via === entry.via &&
      last.label === entry.label &&
      last.pageId === entry.pageId &&
      last.from - at <= GAP_MS
    ) {
      runs[runs.length - 1] = {
        ...last,
        from: at,
        inserted: last.inserted + entry.inserted,
        deleted: last.deleted + entry.deleted,
        removed: joinRemoved(entry.removed, last.removed),
      };
      continue;
    }
    runs.push({
      key: `${entry.actorId}:${entry.pageId}:${entry.minute}`,
      pageId: entry.pageId,
      userId: entry.userId,
      label: entry.label,
      via: entry.via,
      from: at,
      to: at,
      inserted: entry.inserted,
      deleted: entry.deleted,
      removed: entry.removed,
    });
  }
  return runs;
}

const n = (count: number): string => `${count} ${count === 1 ? 'character' : 'characters'}`;

// Counts are Yjs clocks, so a block or picture counts as one.
export function summaryOf(run: Pick<IActivityRun, 'inserted' | 'deleted'>): string {
  if (run.deleted === 0) return `wrote ${n(run.inserted)}`;
  if (run.inserted === 0) return `removed ${n(run.deleted)}`;
  return `wrote ${n(run.inserted)} and removed ${n(run.deleted)}`;
}

// Limit: the opening minute may overlap the live feed. Upgrade: per-second rows.
export const activityQuery = (project: IProject, logId: string, openedAt: string) =>
  infiniteQueryOptions({
    queryKey: keyBuilderLogbook.activity(logId, openedAt),
    queryFn: ({ signal, pageParam }) =>
      getResearchActivity({
        id: logId,
        context: project,
        until: openedAt,
        after: pageParam,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
