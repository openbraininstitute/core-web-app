import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireCapability } from '@/admin/server/require-capability';

const { authMock, getKeycloakGroupsMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getKeycloakGroupsMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/admin/server/keycloak-groups', () => ({
  getKeycloakGroups: getKeycloakGroupsMock,
}));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

beforeEach(() => {
  redirectMock.mockClear();
  authMock.mockReset();
  authMock.mockResolvedValue({ accessToken: 'tok' });
  getKeycloakGroupsMock.mockReset();
});

describe('requireCapability', () => {
  it('sends a signed-out visitor to log in', async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireCapability('admin.access')).rejects.toThrow(
      'redirect:/app/log-in?callbackUrl=%2Fapp%2Fadmin'
    );
    expect(getKeycloakGroupsMock).not.toHaveBeenCalled();
  });

  it('sends a session whose refresh token died to log in, not to forbidden', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok', error: 'RefreshAccessTokenError' });

    await expect(requireCapability('admin.access')).rejects.toThrow('redirect:/app/log-in');
    expect(getKeycloakGroupsMock).not.toHaveBeenCalled();
  });

  it('throws on a token Keycloak rejects, since log-in would send it straight back', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(null);

    await expect(requireCapability('admin.access')).rejects.toThrow(
      'keycloak rejected the access token'
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('sends a user without the capability to the forbidden page', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    await expect(requireCapability('virtualLab.read')).rejects.toThrow(
      'redirect:/app/admin/forbidden'
    );
  });

  it('forbids a user with no groups, even on admin.access', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce([]);

    await expect(requireCapability('admin.access')).rejects.toThrow(
      'redirect:/app/admin/forbidden'
    );
  });

  it('returns the capabilities when held', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    await expect(requireCapability('admin.access')).resolves.toMatchObject({
      entitycore: { admin: true },
      admin: { access: true },
    });
  });
});
