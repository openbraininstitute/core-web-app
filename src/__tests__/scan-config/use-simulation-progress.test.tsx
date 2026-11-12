import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  MAX_PROGRESS_STREAMS,
  progressFollowed,
  useSimulationProgress,
} from '@/features/scan-config/use-cases/simulations/use-simulation-progress';

const stream = vi.hoisted(() => ({ data: undefined as number | null | undefined, isError: false }));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQuery: (options: { queryKey: unknown[] }) =>
    options.queryKey[0] === 'scan-config-simulation-execution-id' ? { data: null } : stream,
}));

const context = { virtualLabId: 'vlab', projectId: 'proj' };
const progress = () =>
  renderHook(() =>
    useSimulationProgress({ simulationId: 'sim', jobId: 'job', context, running: true })
  ).result.current;

beforeEach(() => {
  stream.data = undefined;
  stream.isError = false;
});

describe('the progress of a running simulation', () => {
  it('is not said before its log starts to arrive: it may be far past initialization', () => {
    expect(progress()).toBeNull();
  });

  it('is initialization once the log has lines and none of them a step', () => {
    stream.data = null;

    expect(progress()).toBe('initialization');
  });

  it('is the percentage the log reports, then finalizing', () => {
    stream.data = 60;
    expect(progress()).toBe(60);

    stream.data = 100;
    expect(progress()).toBe('finalizing');
  });
});

describe('the simulations whose progress is followed', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `sim-${i}`);
  const all = (status: ActivityStatus) => new Map(ids.map((id) => [id, status]));

  it('are the first running ones listed, a few at once', () => {
    const statuses = all(ActivityStatus.RUNNING).set('sim-1', ActivityStatus.DONE);

    const followed = progressFollowed(ids, statuses);

    expect([...followed]).toEqual(['sim-0', 'sim-2', 'sim-3', 'sim-4']);
    expect(followed.size).toBe(MAX_PROGRESS_STREAMS);
  });

  it('take in the active one wherever it is listed, while it runs', () => {
    expect(progressFollowed(ids, all(ActivityStatus.RUNNING), 'sim-9').has('sim-9')).toBe(true);
    expect(progressFollowed(ids, all(ActivityStatus.DONE), 'sim-9').size).toBe(0);
  });
});
