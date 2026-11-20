import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginRedirect } from '@/features/auth/components/login-redirect';
import { AuthStatus } from '@/features/auth/constants';

const mocks = vi.hoisted(() => ({
  search: new URLSearchParams(),
  signIn: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.search }));
vi.mock('@/config', () => ({ config: { ROOT_ROUTE: '/app', AUTH_PROXY_URL: undefined } }));
vi.mock('@/features/auth/client', () => ({
  signIn: mocks.signIn,
  useAuthSession: mocks.useAuthSession,
}));

const signedIn = { status: AuthStatus.Authenticated, data: { accessToken: 'a' } };

beforeEach(() => {
  mocks.signIn.mockReset().mockResolvedValue({});
  mocks.useAuthSession.mockReturnValue(signedIn);
});

describe('LoginRedirect', () => {
  it('sends a signed-in user on without a new sign-in', async () => {
    mocks.search = new URLSearchParams('callbackUrl=/app/admin');
    render(<LoginRedirect />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('signs in again with reauth=1 even when the session looks valid', async () => {
    mocks.search = new URLSearchParams('reauth=1&callbackUrl=/app/admin');
    render(<LoginRedirect />);
    await waitFor(() =>
      expect(mocks.signIn).toHaveBeenCalledWith('keycloak', {
        callbackUrl: `${window.location.origin}/app/sync?redirectUrl=${encodeURIComponent('/app/admin')}`,
      })
    );
  });
});
