import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthSession } from '@/features/auth/client/use-auth-session';
import SessionStateProvider from '@/features/auth/components/session-state-provider';
import { AuthStatus } from '@/features/auth/constants';

import type { ReactNode } from 'react';
import type { ISession } from '@/features/auth/types';

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  hydrateSession: vi.fn(),
}));

vi.mock('@/features/auth/client/auth-client', () => ({
  authClient: { useSession: mocks.useSession, hydrateSession: mocks.hydrateSession },
}));

const session: ISession = {
  user: { id: 'u1', name: 'Mock', email: 'm@example.org', username: 'mock' },
  accessToken: 'access',
  idToken: 'id',
};
const pending = { data: null, isPending: true, isRefetching: false, refetch: vi.fn() };

const withSeed = (seed: ISession | null) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <SessionStateProvider initialSession={seed}>{children}</SessionStateProvider>;
  };

describe('useAuthSession', () => {
  it('is Loading while the store is pending and nothing seeded it', () => {
    mocks.useSession.mockReturnValue(pending);
    const { result } = renderHook(() => useAuthSession());
    expect(result.current.status).toBe(AuthStatus.Loading);
  });

  it('returns the server session while the store is pending', () => {
    mocks.useSession.mockReturnValue(pending);
    const { result } = renderHook(() => useAuthSession(), { wrapper: withSeed(session) });
    expect(result.current.status).toBe(AuthStatus.Authenticated);
    expect(result.current.data).toBe(session);
    expect(mocks.hydrateSession).toHaveBeenCalledWith(session);
  });

  it('is Unauthenticated at once when the server had no session', () => {
    mocks.useSession.mockReturnValue(pending);
    const { result } = renderHook(() => useAuthSession(), { wrapper: withSeed(null) });
    expect(result.current.status).toBe(AuthStatus.Unauthenticated);
  });

  it('prefers the store once its fetch has settled', () => {
    mocks.useSession.mockReturnValue({ ...pending, isPending: false, data: null });
    const { result } = renderHook(() => useAuthSession(), { wrapper: withSeed(session) });
    expect(result.current.status).toBe(AuthStatus.Unauthenticated);
  });
});
