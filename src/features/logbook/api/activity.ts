// The saved activity of a log (GET /v1/research/:id/activity): what each writer wrote and
// removed, per page and minute, newest first, one page of 50 at a time. Read only while History
// shows, and the next page only when its end scrolls in (infinite query, keyset cursor). Rows up
// to the moment the log opened: what happens after comes from the live change feed (changes.ts),
// so the two lists meet at the open.
import { infiniteQueryOptions } from '@tanstack/react-query';
import { isNotNil } from 'es-toolkit';

import { getResearchActivity } from '@/api/logbook/queries/research';

import type { IActivityEntry } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

// Rows of one writer on one page, merged while they are at most GAP_MS apart: an hour of typing
// is one line, not sixty.
export interface IActivityRun {
  readonly key: string;
  readonly pageId: string;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
  readonly from: number; // ms, the oldest minute
  readonly to: number; // ms, the newest minute
  readonly inserted: number;
  readonly deleted: number;
  readonly removed: string; // its rows' removed text, oldest first
}

const GAP_MS = 5 * 60_000;
// A run of many rows shows at most this much removed text: a glance, not the whole record.
const RUN_REMOVED_MAX = 1000;

// Older text first (runs are built newest first), a space between pieces.
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

// "wrote 120 characters and removed 8": Yjs clocks, so a block or picture counts as one.
export function summaryOf(run: Pick<IActivityRun, 'inserted' | 'deleted'>): string {
  if (run.deleted === 0) return `wrote ${n(run.inserted)}`;
  if (run.inserted === 0) return `removed ${n(run.deleted)}`;
  return `wrote ${n(run.inserted)} and removed ${run.deleted}`;
}

// `openedAt`: when this visit of the log began (ISO). A new visit is a new key, so it reads
// again; within a visit the pages stay (closing and opening History fetches nothing).
// Limit: rows of the minute the log opened may hold a few changes the live feed shows too (the
// server counts per minute). Upgrade: finer rows, for a per-second boundary.
export const activityQuery = (project: IProject, logId: string, openedAt: string) =>
  infiniteQueryOptions({
    queryKey: ['activity', logId, openedAt],
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
