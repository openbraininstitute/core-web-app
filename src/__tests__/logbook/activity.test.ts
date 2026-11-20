import { expect, test } from 'vitest';

import { runsOf, summaryOf } from '@/features/logbook/api/activity';

import type { IActivityEntry } from '@/api/logbook/types';

const entry = (
  minute: string,
  userId: string,
  inserted: number,
  deleted = 0,
  removed = ''
): IActivityEntry => ({
  pageId: 'p1',
  actorId: userId === 'alice' ? 1 : 2,
  userId,
  label: userId,
  via: 'ui',
  minute: `2026-11-15T10:${minute}:00.000Z`,
  inserted,
  deleted,
  removed,
});

test('rows of one writer at most 5 minutes apart merge; another writer or a gap starts a run', () => {
  const runs = runsOf([
    entry('30', 'alice', 10),
    entry('28', 'alice', 5, 2),
    entry('24', 'alice', 1), // 4 min gap: same run
    entry('23', 'bob', 7),
    entry('10', 'bob', 3), // 13 min gap: new run
  ]);
  expect(runs.map((r) => [r.userId, r.inserted, r.deleted])).toEqual([
    ['alice', 16, 2],
    ['bob', 7, 0],
    ['bob', 3, 0],
  ]);
  expect(runs[0]?.from).toBe(Date.parse('2026-11-15T10:24:00.000Z'));
  expect(runs[0]?.to).toBe(Date.parse('2026-11-15T10:30:00.000Z'));
});

test('the summary says what was written and removed', () => {
  expect(summaryOf({ inserted: 1, deleted: 0 })).toBe('wrote 1 character');
  expect(summaryOf({ inserted: 0, deleted: 4 })).toBe('removed 4 characters');
  expect(summaryOf({ inserted: 12, deleted: 3 })).toBe(
    'wrote 12 characters and removed 3 characters'
  );
});

test('a run keeps the removed text of its rows, oldest first', () => {
  const [run] = runsOf([
    entry('30', 'alice', 0, 3, 'new'),
    entry('29', 'alice', 2),
    entry('28', 'alice', 0, 4, 'old'),
  ]);
  expect(run?.removed).toBe('old new');
});
