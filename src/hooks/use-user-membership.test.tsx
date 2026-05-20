import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab, listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';

import {
  makeRoles,
  useSuspenseWorkspaceAccessControl,
  useWorkspaceMembership,
} from './use-user-membership';

import type { ReactNode } from 'react';
import type { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';

vi.mock('@/api/virtual-lab-svc/queries/user', () => ({
  getUserGroups: vi.fn(),
}));

vi.mock('@/api/virtual-lab-svc/queries/project', () => ({
  getProject: vi.fn(),
}));

vi.mock('@/api/virtual-lab-svc/queries/virtual-lab', () => ({
  getVirtualLab: vi.fn(),
  listVirtualLabs: vi.fn(),
}));

const mockedGetUserGroups = vi.mocked(getUserGroups);
const mockedGetProject = vi.mocked(getProject);
const mockedGetVirtualLab = vi.mocked(getVirtualLab);
const mockedListVirtualLabs = vi.mocked(listVirtualLabs);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>loading…</div>}>{children}</Suspense>
      </QueryClientProvider>
    );
  };
}

function groupsResponse(
  groups: Array<{
    group_id?: string;
    name?: string;
    group_type: 'vlab' | 'project';
    virtual_lab_id?: string;
    project_id?: string;
    role: 'admin' | 'member';
  }>
): VlmUserGroupsResponse {
  return {
    message: 'ok',
    data: {
      groups: groups.map((g, i) => ({
        group_id: g.group_id ?? `g-${i}`,
        name: g.name ?? `group-${i}`,
        group_type: g.group_type,
        virtual_lab_id: g.virtual_lab_id,
        project_id: g.project_id,
        // TRole is wider than 'admin' | 'member'; cast through never to keep mocks self-contained.
        role: g.role as never,
      })),
    },
  };
}

describe('makeRoles', () => {
  it('returns all-false roles when data is undefined', () => {
    const roles = makeRoles(undefined, 'vl-1', 'p-1');
    expect(roles).toEqual({
      userGroups: undefined,
      isVirtualLabMember: false,
      isVirtualLabAdmin: false,
      isProjectMember: false,
      isProjectAdmin: false,
    });
  });

  it('detects virtual-lab membership without admin when role is member', () => {
    const data = groupsResponse([{ group_type: 'vlab', virtual_lab_id: 'vl-1', role: 'member' }]);

    const roles = makeRoles(data, 'vl-1', undefined);

    expect(roles.isVirtualLabMember).toBe(true);
    expect(roles.isVirtualLabAdmin).toBe(false);
    expect(roles.isProjectMember).toBe(false);
    expect(roles.isProjectAdmin).toBe(false);
  });

  it('keys project roles on project_id and requires admin role for isProjectAdmin', () => {
    const data = groupsResponse([
      { group_type: 'vlab', virtual_lab_id: 'vl-1', role: 'admin' },
      { group_type: 'project', project_id: 'p-1', role: 'admin' },
      { group_type: 'project', project_id: 'p-2', role: 'member' },
    ]);

    const asAdmin = makeRoles(data, 'vl-1', 'p-1');
    expect(asAdmin.isProjectMember).toBe(true);
    expect(asAdmin.isProjectAdmin).toBe(true);
    expect(asAdmin.isVirtualLabAdmin).toBe(true);

    const asMember = makeRoles(data, 'vl-1', 'p-2');
    expect(asMember.isProjectMember).toBe(true);
    expect(asMember.isProjectAdmin).toBe(false);
  });

  it('returns userGroups: undefined when data.data is missing', () => {
    const roles = makeRoles({ message: 'ok', data: null }, 'vl-1', 'p-1');
    expect(roles.userGroups).toBeUndefined();
    expect(roles.isVirtualLabMember).toBe(false);
  });
});

describe('useWorkspaceMembership', () => {
  it('resolves isLoading to false once enabled queries settle and does not call disabled queryFns', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(
      groupsResponse([{ group_type: 'vlab', virtual_lab_id: 'vl-1', role: 'member' }])
    );
    mockedListVirtualLabs.mockResolvedValueOnce({
      message: 'ok',
      data: null,
    } as never);

    const { result } = renderHook(() => useWorkspaceMembership({}), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // No virtualLabId / projectId → these queryFns must never fire.
    expect(mockedGetVirtualLab).not.toHaveBeenCalled();
    expect(mockedGetProject).not.toHaveBeenCalled();
  });

  it('does not call getProject when only virtualLabId is provided', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(groupsResponse([]));
    mockedListVirtualLabs.mockResolvedValueOnce({ message: 'ok', data: null } as never);
    mockedGetVirtualLab.mockResolvedValueOnce({
      message: 'ok',
      data: {
        virtual_lab: { id: 'vl-1' } as never,
        admins: ['admin-a'],
      },
    } as never);

    const { result } = renderHook(() => useWorkspaceMembership({ virtualLabId: 'vl-1' }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedGetVirtualLab).toHaveBeenCalledTimes(1);
    expect(mockedGetProject).not.toHaveBeenCalled();
    expect(result.current.virtualLabAdmins).toEqual(['admin-a']);
  });

  it('reports isVirtualLabOwner true when myVirtualLab id matches virtualLabId', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(groupsResponse([]));
    mockedListVirtualLabs.mockResolvedValueOnce({
      message: 'ok',
      data: { virtual_lab: { id: 'vl-1' } },
    } as never);
    mockedGetVirtualLab.mockResolvedValueOnce({
      message: 'ok',
      data: { virtual_lab: { id: 'vl-1' }, admins: null },
    } as never);

    const { result } = renderHook(() => useWorkspaceMembership({ virtualLabId: 'vl-1' }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVirtualLabOwner).toBe(true);
  });

  it('reports isVirtualLabOwner false when ids differ', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(groupsResponse([]));
    mockedListVirtualLabs.mockResolvedValueOnce({
      message: 'ok',
      data: { virtual_lab: { id: 'vl-other' } },
    } as never);
    mockedGetVirtualLab.mockResolvedValueOnce({
      message: 'ok',
      data: { virtual_lab: { id: 'vl-1' }, admins: [] },
    } as never);

    const { result } = renderHook(() => useWorkspaceMembership({ virtualLabId: 'vl-1' }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVirtualLabOwner).toBe(false);
  });

  it('surfaces virtualLabAdmins and projectAdmins from the resolved queries', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(groupsResponse([]));
    mockedListVirtualLabs.mockResolvedValueOnce({ message: 'ok', data: null } as never);
    mockedGetVirtualLab.mockResolvedValueOnce({
      message: 'ok',
      data: { virtual_lab: { id: 'vl-1' }, admins: ['vl-admin'] },
    } as never);
    mockedGetProject.mockResolvedValueOnce({
      message: 'ok',
      data: { project: { id: 'p-1', admins: ['proj-admin'] } },
    } as never);

    const { result } = renderHook(
      () => useWorkspaceMembership({ virtualLabId: 'vl-1', projectId: 'p-1' }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.virtualLabAdmins).toEqual(['vl-admin']);
    expect(result.current.projectAdmins).toEqual(['proj-admin']);
  });
});

describe('useSuspenseWorkspaceAccessControl', () => {
  it('grants workspace access when the user is a vlab member', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(
      groupsResponse([{ group_type: 'vlab', virtual_lab_id: 'vl-1', role: 'member' }])
    );

    const { result } = renderHook(
      () => useSuspenseWorkspaceAccessControl({ virtualLabId: 'vl-1' }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current.hasWorkspaceAccess).toBe(true);
  });

  it('denies workspace access when none of the four roles match', async () => {
    mockedGetUserGroups.mockResolvedValueOnce(
      groupsResponse([{ group_type: 'vlab', virtual_lab_id: 'vl-other', role: 'admin' }])
    );

    const { result } = renderHook(
      () => useSuspenseWorkspaceAccessControl({ virtualLabId: 'vl-1', projectId: 'p-1' }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current.hasWorkspaceAccess).toBe(false);
  });
});
