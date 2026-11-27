// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AuthSessionProvider } from '@/features/auth/auth-session-provider';
import { getClientAuthSession, useAuthSession } from '@/features/auth/client';

import type { TAuthSession } from '@/features/auth/types';

const session = (name: string): TAuthSession => ({
  user: { id: `subject-${name}`, name, email: `${name}@example.org`, username: name },
  accessToken: `token-of-${name}`,
  idToken: `id-token-of-${name}`,
  expires: '2026-11-23T11:00:00.000Z',
});

function Probe() {
  const { data, status } = useAuthSession();
  return <p>{`${status}|${data?.user.id}|${data?.accessToken}`}</p>;
}

const render = (value: TAuthSession | null) =>
  renderToString(
    <AuthSessionProvider session={value}>
      <Probe />
    </AuthSessionProvider>
  );

describe('rendering client components on the server, where one module serves every request', () => {
  it('gives each request the session it came with, never the one of the request before', () => {
    const fetched = vi.fn();
    vi.stubGlobal('fetch', fetched);

    const ada = render(session('ada'));
    const bob = render(session('bob'));
    const visitor = render(null);
    const adaAgain = render(session('ada'));

    expect(ada).toContain('authenticated|subject-ada|token-of-ada');
    expect(ada).not.toContain('bob');
    expect(bob).toContain('authenticated|subject-bob|token-of-bob');
    expect(bob).not.toContain('ada');
    expect(visitor).toContain('unauthenticated|undefined|undefined');
    expect(adaAgain).toBe(ada);
    expect(fetched).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('leaves the shared session store empty, so nothing can be read from it later', async () => {
    render(session('ada'));

    const stored = await Promise.race([
      getClientAuthSession(),
      new Promise((resolve) => setTimeout(() => resolve('still empty'), 50)),
    ]);

    expect(stored).toBe('still empty');
  });
});
