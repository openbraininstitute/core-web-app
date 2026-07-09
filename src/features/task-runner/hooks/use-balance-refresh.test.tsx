import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import { invalidateProjectBalance, useBalanceRefreshOnTaskCompletion } from './use-balance-refresh';

import type { ReactNode } from 'react';
import type { TActivityStatus } from '@/api/entitycore/types/entities/task-activity';

const context = { virtualLabId: 'vlab-1', projectId: 'proj-1' };

function setup(initialStatus: TActivityStatus | undefined) {
  const queryClient = new QueryClient();
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { rerender } = renderHook(
    ({ status }: { status: TActivityStatus | undefined }) =>
      useBalanceRefreshOnTaskCompletion({ status, context }),
    { wrapper, initialProps: { status: initialStatus } }
  );
  return { spy, rerender };
}

function expectBalanceInvalidated(spy: ReturnType<typeof vi.spyOn>) {
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith(
    { queryKey: keyBuilder.accounting({ virtualLabId: context.virtualLabId }) },
    { cancelRefetch: false }
  );
  expect(spy).toHaveBeenCalledWith(
    { queryKey: keyBuilder.wallet(context) },
    { cancelRefetch: false }
  );
}

describe('invalidateProjectBalance', () => {
  it('invalidates both the accounting and wallet keys', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateProjectBalance({ queryClient, context });

    expectBalanceInvalidated(spy);
  });

  it('builds keys from explicit fields even when context carries extra route params', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const routeContext = { ...context, campaignId: 'extra-param' } as typeof context;

    await invalidateProjectBalance({ queryClient, context: routeContext });

    expect(spy).toHaveBeenCalledWith(
      { queryKey: keyBuilder.wallet(context) },
      { cancelRefetch: false }
    );
  });
});

describe('useBalanceRefreshOnTaskCompletion', () => {
  it('does not fire when the first observed status is already terminal', () => {
    const { spy } = setup(ActivityStatus.DONE);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not fire when status loads terminal after being unknown', () => {
    const { spy, rerender } = setup(undefined);
    rerender({ status: ActivityStatus.DONE });
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    [ActivityStatus.PENDING, ActivityStatus.DONE],
    [ActivityStatus.RUNNING, ActivityStatus.ERROR],
    [ActivityStatus.RUNNING, ActivityStatus.CANCELLED],
    [ActivityStatus.CREATED, ActivityStatus.ERROR],
  ])('fires once (both keys) on %s → %s', (from, to) => {
    const { spy, rerender } = setup(from);
    rerender({ status: to });
    expectBalanceInvalidated(spy);
  });

  it('does not fire on active → active transitions', () => {
    const { spy, rerender } = setup(ActivityStatus.PENDING);
    rerender({ status: ActivityStatus.RUNNING });
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not fire again on re-renders with an unchanged status', () => {
    const { spy, rerender } = setup(ActivityStatus.RUNNING);
    rerender({ status: ActivityStatus.DONE });
    rerender({ status: ActivityStatus.DONE });
    rerender({ status: ActivityStatus.DONE });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not fire on terminal → terminal changes', () => {
    const { spy, rerender } = setup(ActivityStatus.RUNNING);
    rerender({ status: ActivityStatus.ERROR });
    spy.mockClear();
    rerender({ status: ActivityStatus.DONE });
    expect(spy).not.toHaveBeenCalled();
  });
});
