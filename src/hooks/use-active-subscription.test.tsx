import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';

import { useActiveSubscription } from './use-active-subscription';

import type { ReactNode } from 'react';

vi.mock('@/api/virtual-lab-svc/queries/subscription', () => ({
  getUserActiveSubscription: vi.fn(),
}));

const mockedGet = vi.mocked(getUserActiveSubscription);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useActiveSubscription', () => {
  it('exposes the resolved subscription and unblocks paid users', async () => {
    mockedGet.mockResolvedValueOnce({
      subscription: {
        id: 'sub_1',
        status: 'active' as never,
        type: 'paid',
        tier: 'PRO',
        next_billing_date: '2026-12-01',
      },
    });

    const { result } = renderHook(() => useActiveSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.status).toBe('active');
    expect(result.current.data.type).toBe('paid');
    expect(result.current.data.next_billing_date).toBe('2026-12-01');
    expect(result.current.forbiddenOperation).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('flags forbiddenOperation for free-tier users', async () => {
    mockedGet.mockResolvedValueOnce({
      subscription: { type: 'free', tier: 'FREE', status: 'active' as never },
    });

    const { result } = renderHook(() => useActiveSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.forbiddenOperation).toBe(true);
  });

  it('does not leak cache between tests (fresh QueryClient)', async () => {
    // If the previous test's resolved data leaked, this third call would skip the fetch.
    mockedGet.mockResolvedValueOnce({
      subscription: { type: 'paid', tier: 'PRO', status: 'active' as never },
    });

    const { result } = renderHook(() => useActiveSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Across all three tests, the mocked fetch should have run exactly three times.
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });
});
