import { infiniteQueryOptions } from '@tanstack/react-query';
import { isNotNil } from 'es-toolkit';
import { match } from 'ts-pattern';

import { getResearchActivity } from '@/api/logbook/queries/research';
import { ACTIVITY_GAP_MS, ACTIVITY_REMOVED_MAX_CHARS } from '@/features/logbook/constants';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IActivityEntry } from '@/api/logbook/types';
import type { IActivityRun } from '@/features/logbook/types';
import type { WorkspaceContext } from '@/types/common';

const joinRemoved = (older: string, newer: string): string =>
  (older.length === 0 || newer.length === 0 ? older + newer : `${older} ${newer}`).slice(
    0,
    ACTIVITY_REMOVED_MAX_CHARS
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
      last.from - at <= ACTIVITY_GAP_MS
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

export function summaryOf(run: Pick<IActivityRun, 'inserted' | 'deleted'>): string {
  return match(run)
    .with({ deleted: 0 }, () => `wrote ${n(run.inserted)}`)
    .with({ inserted: 0 }, () => `removed ${n(run.deleted)}`)
    .otherwise(() => `wrote ${n(run.inserted)} and removed ${n(run.deleted)}`);
}

export const activityQuery = (project: WorkspaceContext, logId: string, openedAt: string) =>
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
