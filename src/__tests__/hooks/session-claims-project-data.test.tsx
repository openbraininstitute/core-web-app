import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useSessionState from '@/hooks/session';

import type { Session } from 'next-auth';

const session = vi.hoisted(() => ({ current: { status: 'loading', data: null } as unknown }));
const claim = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/virtual-lab' }));
const disown = vi.hoisted(() => vi.fn());
vi.mock('@/utils/project-data-caches', () => ({
  claimProjectDataCaches: claim,
  disownProjectDataCaches: disown,
}));

const signedIn = (id: string | undefined) => ({
  status: 'authenticated',
  data: { user: { id }, accessToken: `token-${id}`, expires: '' } as unknown as Session,
});

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reload = vi.fn();
  vi.stubGlobal('location', { ...window.location, reload });
  claim.mockClear();
  disown.mockClear();
  session.current = { status: 'loading', data: null };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSessionState and the project data caches', () => {
  it('claims them once for the user who signs in, not on every session update', () => {
    const { rerender } = renderHook(() => useSessionState());
    expect(claim).not.toHaveBeenCalled();

    session.current = signedIn('user-a');
    rerender();
    session.current = signedIn('user-a');
    rerender();

    expect(claim).toHaveBeenCalledExactlyOnceWith('user-a');
  });

  it('does not claim them without a user id', () => {
    session.current = signedIn(undefined);
    renderHook(() => useSessionState());

    expect(claim).not.toHaveBeenCalled();
  });

  it('forgets the owner and starts afresh when another user signs in from another window', () => {
    session.current = signedIn('user-a');
    const { rerender } = renderHook(() => useSessionState());
    rerender();
    expect(reload).not.toHaveBeenCalled();
    expect(disown).not.toHaveBeenCalled();

    session.current = signedIn('user-b');
    rerender();

    expect(disown).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    expect(disown.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0]);
    expect(claim).toHaveBeenLastCalledWith('user-b');
  });
});
