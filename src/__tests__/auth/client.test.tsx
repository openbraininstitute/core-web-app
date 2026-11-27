import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus, type TAuthSession } from '@/features/auth/types';

const session = (accessToken: string): TAuthSession => ({
  user: { id: 'subject-1', name: 'Ada', email: 'ada@example.org', username: 'ada' },
  accessToken,
  idToken: 'id',
  expires: '2026-11-23T11:00:00.000Z',
});

let served: TAuthSession | null;
let release: () => void;

async function loadClient() {
  vi.resetModules();
  const { AuthSessionProvider } = await import('@/features/auth/auth-session-provider');
  return { AuthSessionProvider, ...(await import('@/features/auth/client')) };
}

beforeEach(() => {
  served = null;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      await gate;
      return new Response(JSON.stringify(served), {
        headers: { 'content-type': 'application/json' },
      });
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('useAuthSession', () => {
  it('renders the session the server rendered with, then the one the browser fetched', async () => {
    const { AuthSessionProvider, useAuthSession } = await loadClient();
    served = session('fetched');
    function Probe() {
      const { data, status } = useAuthSession();
      return <p>{`${status}:${data?.accessToken}`}</p>;
    }

    render(
      <AuthSessionProvider session={session('from-server')}>
        <Probe />
      </AuthSessionProvider>
    );

    expect(screen.getByText(`${AuthStatus.Authenticated}:from-server`)).toBeDefined();
    release();
    await waitFor(() =>
      expect(screen.getByText(`${AuthStatus.Authenticated}:fetched`)).toBeDefined()
    );
  });

  it('is signed out at once when the server found no session', async () => {
    const { AuthSessionProvider, useAuthSession } = await loadClient();

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: ({ children }) => (
        <AuthSessionProvider session={null}>{children}</AuthSessionProvider>
      ),
    });

    expect(result.current).toEqual({ data: null, status: AuthStatus.Unauthenticated });
  });

  it('is loading outside the provider until the browser has an answer', async () => {
    const { useAuthSession } = await loadClient();
    served = session('fetched');

    const { result } = renderHook(() => useAuthSession());

    expect(result.current.status).toBe(AuthStatus.Loading);
    release();
    await waitFor(() => expect(result.current.data?.accessToken).toBe('fetched'));
  });
});

describe('getClientAuthSession', () => {
  it('answers from the session the server rendered with, without waiting for the network', async () => {
    const { AuthSessionProvider, getClientAuthSession } = await loadClient();

    render(<AuthSessionProvider session={session('from-server')}>{null}</AuthSessionProvider>);

    expect((await getClientAuthSession())?.accessToken).toBe('from-server');
  });

  it('waits for the first answer when nothing was rendered by the server', async () => {
    const { getClientAuthSession } = await loadClient();
    served = session('fetched');

    let answered = false;
    const pending = getClientAuthSession().then((answer) => {
      answered = true;
      return answer;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(answered).toBe(false);
    release();

    expect((await pending)?.accessToken).toBe('fetched');
  });

  it('answers null for a signed-out visitor', async () => {
    const { getClientAuthSession } = await loadClient();
    release();

    expect(await getClientAuthSession()).toBeNull();
  });
});
