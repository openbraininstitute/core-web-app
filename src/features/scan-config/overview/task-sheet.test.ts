import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import { taskRows } from './task-sheet';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';

const execution = (configId: string, status: ActivityStatus, created: string, end?: string) =>
  ({
    used: [{ id: configId }],
    generated: [],
    status,
    creation_date: created,
    start_time: created,
    end_time: end ?? null,
  }) as unknown as ITaskActivity;

describe('taskRows', () => {
  it('takes each config’s status and timing from its latest execution', () => {
    const rows = taskRows(
      [
        { id: 'a', name: 'Build 0' },
        { id: 'b', name: 'Build 1' },
      ],
      [
        execution('a', ActivityStatus.ERROR, '2026-11-13T17:00:00Z'),
        execution('a', ActivityStatus.DONE, '2026-11-13T17:07:37Z', '2026-11-13T17:14:50Z'),
      ]
    );
    expect(rows.map((r) => [r.id, r.status, r.durationMs])).toEqual([
      ['a', ActivityStatus.DONE, 433_000],
      ['b', ActivityStatus.CREATED, undefined],
    ]);
  });
});
