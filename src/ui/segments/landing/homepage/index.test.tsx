import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/auth';
import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';

import Homepage from './homepage';
import HomePage from './index';

import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@ant-design/nextjs-registry', () => ({
  AntdRegistry: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./homepage', () => ({
  default: vi.fn(({ isAuthenticated }: { isAuthenticated: boolean }) => (
    <div data-testid="homepage" data-authenticated={isAuthenticated} />
  )),
}));
vi.mock('@/ui/segments/invites/error-dialog', () => ({
  InvitationErrorDialog: vi.fn(() => <div role="alert">Invitation error</div>),
}));

const session = {
  user: { name: 'Researcher', email: 'researcher@example.org', image: null },
  expires: '2099-01-01T00:00:00.000Z',
  accessToken: 'test-access-token',
} as Session;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null);
});

describe('homepage session state', () => {
  it('shows the signed-out state when there is no session', async () => {
    render(await HomePage({}));
    expect(screen.getByTestId('homepage')).toHaveAttribute('data-authenticated', 'false');
  });

  it('passes only a signed-in flag and the year to the client, without session credentials', async () => {
    vi.mocked(auth).mockResolvedValue(session);
    render(await HomePage({}));
    expect(screen.getByTestId('homepage')).toHaveAttribute('data-authenticated', 'true');
    expect(vi.mocked(Homepage).mock.calls[0][0]).toEqual({
      year: expect.any(Number),
      isAuthenticated: true,
    });
  });

  it('shows the signed-out state when the session needs re-authentication', async () => {
    vi.mocked(auth).mockResolvedValue({ ...session, error: 'RefreshAccessTokenError' });
    render(await HomePage({}));
    expect(screen.getByTestId('homepage')).toHaveAttribute('data-authenticated', 'false');
  });

  it('preserves invitation error handling while resolving the session', async () => {
    const error = {
      errorcode: 'invitation-error',
      originalCode: undefined,
      description: 'Invalid invitation',
    };
    render(await HomePage({ error }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invitation error');
    expect(vi.mocked(InvitationErrorDialog).mock.calls[0][0]).toEqual({ error });
  });
});
