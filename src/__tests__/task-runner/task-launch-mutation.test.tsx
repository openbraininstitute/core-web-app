import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';

import type { ReactNode } from 'react';
import type { TObiOneTaskType } from '@/api/one/types/task';

const mocks = vi.hoisted(() => ({
  runTask: vi.fn(),
  notificationError: vi.fn(),
}));

vi.mock('@/api/one/runner', () => ({ runTask: mocks.runTask }));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ error: mocks.notificationError }),
}));
vi.mock('@/features/offline-auth-management', () => ({
  useRunWithOfflineTokenConsent: () => ({ runWithConsent: vi.fn() }),
}));

const context = { virtualLabId: 'vlab-1', projectId: 'proj-1' };

function renderLaunchMutation(obiOneTaskType: TObiOneTaskType) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useTaskLaunchMutation({
        context,
        obiOneTaskType,
        executionActivityType: TaskActivityType.IonChannelModelingExecution,
        notificationKey: 'launch',
        failureMessage: 'failed',
        logTopic: 'Task',
      }),
    { wrapper }
  ).result;
}

describe('useTaskLaunchMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTask.mockResolvedValue({ activity_id: 'activity', job_id: 'job' });
  });

  it('launches ion channel fitting through the launch system, once per config', async () => {
    const taskType = ObiOneTaskTypeDict.IonChannelFitting;
    const result = renderLaunchMutation(taskType);

    await result.current.mutateAsync(['c1', 'c2']);

    expect(mocks.runTask.mock.calls).toEqual([
      [{ ctx: context, task_type: taskType, config_id: 'c1' }],
      [{ ctx: context, task_type: taskType, config_id: 'c2' }],
    ]);
  });

  it('keeps launching the other configs when one fails', async () => {
    mocks.runTask.mockRejectedValueOnce(new Error('boom'));
    const result = renderLaunchMutation(ObiOneTaskTypeDict.IonChannelFitting);

    await result.current.mutateAsync(['c1', 'c2']);

    expect(mocks.runTask).toHaveBeenCalledTimes(2);
    expect(mocks.notificationError).toHaveBeenCalledTimes(1);
  });
});
