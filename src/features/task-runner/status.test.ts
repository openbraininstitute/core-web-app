import { describe, expect, it } from 'vitest';

import { buildActivityStatusMap, findLatestExecutionForEntity } from './status';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';

function makeExecution(args: {
  status: string;
  creation_date: string;
  used: string[];
}): ITaskActivity {
  return {
    status: args.status,
    creation_date: args.creation_date,
    used: args.used.map((id) => ({ id })),
  } as unknown as ITaskActivity;
}

describe('buildActivityStatusMap()', () => {
  it('returns an empty Map when there are no entity IDs and no executions', () => {
    const result = buildActivityStatusMap({ entityIds: [], executions: [] });
    expect(result.size).toBe(0);
  });

  it('returns an empty Map when no executions reference the requested entities', () => {
    const executions = [
      makeExecution({
        status: 'done',
        creation_date: '2026-01-01T00:00:00Z',
        used: ['other'],
      }),
    ];
    const result = buildActivityStatusMap({ entityIds: ['e1'], executions });
    expect(result.size).toBe(0);
  });

  it('maps each entity to the status of its latest execution', () => {
    const executions = [
      makeExecution({
        status: 'old',
        creation_date: '2026-01-01T00:00:00Z',
        used: ['e1'],
      }),
      makeExecution({
        status: 'latest',
        creation_date: '2026-03-01T00:00:00Z',
        used: ['e1'],
      }),
      makeExecution({
        status: 'middle',
        creation_date: '2026-02-01T00:00:00Z',
        used: ['e1'],
      }),
    ];
    const result = buildActivityStatusMap({ entityIds: ['e1'], executions });
    expect(result.get('e1')).toBe('latest');
  });

  it('skips entity IDs that have no matching execution', () => {
    const executions = [
      makeExecution({
        status: 'done',
        creation_date: '2026-01-01T00:00:00Z',
        used: ['e1'],
      }),
    ];
    const result = buildActivityStatusMap({ entityIds: ['e1', 'e2'], executions });
    expect(result.get('e1')).toBe('done');
    expect(result.has('e2')).toBe(false);
  });

  it('supports executions that target multiple entities via `used`', () => {
    const executions = [
      makeExecution({
        status: 'running',
        creation_date: '2026-01-01T00:00:00Z',
        used: ['e1', 'e2'],
      }),
    ];
    const result = buildActivityStatusMap({ entityIds: ['e1', 'e2'], executions });
    expect(result.get('e1')).toBe('running');
    expect(result.get('e2')).toBe('running');
  });
});

describe('findLatestExecutionForEntity()', () => {
  it('returns undefined when no execution references the entity', () => {
    const executions = [
      makeExecution({
        status: 'done',
        creation_date: '2026-01-01T00:00:00Z',
        used: ['other'],
      }),
    ];
    expect(findLatestExecutionForEntity(executions, 'e1')).toBeUndefined();
  });

  it('returns undefined when executions list is empty', () => {
    expect(findLatestExecutionForEntity([], 'e1')).toBeUndefined();
  });

  it('returns the most recent execution by creation_date', () => {
    const older = makeExecution({
      status: 'old',
      creation_date: '2026-01-01T00:00:00Z',
      used: ['e1'],
    });
    const newer = makeExecution({
      status: 'new',
      creation_date: '2026-04-01T00:00:00Z',
      used: ['e1'],
    });
    const result = findLatestExecutionForEntity([older, newer], 'e1');
    expect(result?.status).toBe('new');
  });
});
