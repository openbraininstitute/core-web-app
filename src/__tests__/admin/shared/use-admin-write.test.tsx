import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAdminWrite } from '@/admin/shared/use-admin-write';

import type { ReactNode } from 'react';

const { errorMock } = vi.hoisted(() => ({ errorMock: vi.fn() }));

vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ success: vi.fn(), error: errorMock }),
}));

function setup(
  write: () => Promise<unknown>,
  failed: string | ((error: unknown) => string) = 'Failed'
) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useAdminWrite({ refreshes: ['admin', 'x'], write, done: 'Done', failed }),
    { wrapper }
  );
  return { result, invalidate };
}

describe('useAdminWrite', () => {
  it('reloads what the page shows after a write', async () => {
    const { result, invalidate } = setup(async () => null);

    await act(() => result.current.mutateAsync(undefined));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'x'] });
  });

  it('reloads it after a failed write too, which may still have changed something', async () => {
    const { result, invalidate } = setup(async () => {
      throw new Error('outcome unknown');
    });

    act(() => result.current.mutate(undefined));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'x'] });
  });

  it('titles a failure from the error when asked to', async () => {
    const { result } = setup(
      async () => {
        throw new Error('half');
      },
      (error) => (error instanceof Error && error.message === 'half' ? 'Half done' : 'Failed')
    );

    act(() => result.current.mutate(undefined));

    await waitFor(() =>
      expect(errorMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Half done' }))
    );
  });
});
