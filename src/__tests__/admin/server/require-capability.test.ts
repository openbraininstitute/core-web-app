import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  capabilityDenial,
  requireCapability,
  writeAccess,
} from '@/admin/server/require-capability';

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

describe('capabilityDenial', () => {
  it('answers a signed-out caller with 401 instead of a redirect', async () => {
    authMock.mockResolvedValueOnce(null);

    expect((await capabilityDenial('admin.access'))?.status).toBe(401);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('answers a token Keycloak rejects with 401', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(null);

    expect((await capabilityDenial('admin.access'))?.status).toBe(401);
  });

  it('answers a caller without the capability with 403', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    expect((await capabilityDenial('launchSystem.admin'))?.status).toBe(403);
  });

  it('lets a caller with the capability through', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/launch-system/admin']);

    await expect(capabilityDenial('launchSystem.admin')).resolves.toBeNull();
  });
});

describe('writeAccess', () => {
  it('reads groups past the cache and names the operator', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok', user: { id: 'sub-1', username: 'op' } });
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/accounting/admin']);

    await expect(writeAccess('accounting.admin')).resolves.toEqual({
      operator: { id: 'sub-1', username: 'op' },
    });
    expect(getKeycloakGroupsMock).toHaveBeenCalledWith(expect.anything(), { fresh: true });
  });

  it('refuses with 503 when fresh groups cannot be read', async () => {
    getKeycloakGroupsMock.mockRejectedValueOnce(new Error('userinfo down'));

    const access = await writeAccess('accounting.admin');

    expect('denial' in access && access.denial.status).toBe(503);
  });

  it('refuses with 403 without the capability', async () => {
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    const access = await writeAccess('accounting.admin');

    expect('denial' in access && access.denial.status).toBe(403);
  });

  it('refuses with 401 when the session names no operator', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok', user: {} });
    getKeycloakGroupsMock.mockResolvedValueOnce(['/service/accounting/admin']);

    const access = await writeAccess('accounting.admin');

    expect('denial' in access && access.denial.status).toBe(401);
  });
});
