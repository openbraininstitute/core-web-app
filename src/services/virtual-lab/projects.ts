import { createApiHeaders } from './common';
import { virtualLabApi } from '@/config';
import { Project, ProjectResponse } from '@/types/virtual-lab/projects';
import {
  ProjectBalance,
  ProjectBalanceResponse,
  ProjectJobReportsResponse,
} from '@/types/virtual-lab/accounting';
import { VirtualLabAPIListData, VlmResponse } from '@/types/virtual-lab/common';
import { UsersResponse } from '@/types/virtual-lab/members';
import authFetch, { authFetchRetryOnError } from '@/authFetch';
import { assertVLApiResponse } from '@/util/utils';

export async function getVirtualLabProjects(
  id: string,
  size?: number
): Promise<VlmResponse<VirtualLabAPIListData<Project>>> {
  const url = new URL(`${virtualLabApi.url}/virtual-labs/${id}/projects`);
  if (size) {
    const params = new URLSearchParams(url.search);
    params.set('size', `${size}`);
    url.search = params.toString();
  }

  const response = await authFetchRetryOnError(url);
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getVirtualLabProjectDetails(
  virtualLabId: string,
  projectId: string
): Promise<ProjectResponse> {
  const response = await authFetchRetryOnError(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}`
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function getVirtualLabProjectUsers(
  virtualLabId: string,
  projectId: string
): Promise<UsersResponse> {
  const response = await authFetchRetryOnError(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/users`
  );
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getUsersProjects(): Promise<VlmResponse<VirtualLabAPIListData<Project>>> {
  const response = await authFetchRetryOnError(`${virtualLabApi.url}/virtual-labs/projects`);
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function createProject(
  {
    name,
    description,
    includeMembers,
  }: {
    name: string;
    description: string;
    includeMembers: { email: string; role: 'admin' | 'member' }[];
  },
  virtualLabId: string
): Promise<VlmResponse<{ project: Project }>> {
  const response = await authFetch(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description,
      include_members: includeMembers,
    }),
  });

  return assertVLApiResponse(response);
}

export async function inviteUser({
  virtualLabId,
  projectId,
  email,
  role,
  token,
}: {
  virtualLabId: string;
  projectId: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
}): Promise<VlmResponse<{ project: Project }>> {
  const response = await fetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/invites`,
    {
      method: 'POST',
      headers: { ...createApiHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role,
      }),
    }
  );

  return assertVLApiResponse(response);
}

export async function patchProject(
  formData: Partial<Project>,
  virtualLabId: string,
  projectId: string
): Promise<
  VlmResponse<{
    project: Project;
  }>
> {
  return authFetch(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  }).then(async (response) => {
    if (!response.ok) {
      const { details, message } = await response.json();

      throw new Error(message, { cause: details });
    }

    return response.json();
  });
}

export async function getProjectAccountBalance({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}): Promise<ProjectBalance> {
  const response = await authFetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/balance`
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  const projectBalanceResponse: ProjectBalanceResponse = await response.json();

  return projectBalanceResponse.data;
}

export async function getProjectJobReports({
  virtualLabId,
  projectId,
  page = 1,
  pageSize = 10,
  signal,
}: {
  virtualLabId: string;
  projectId: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<ProjectJobReportsResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set('page', page.toString());
  searchParams.set('page_size', pageSize.toString());

  const url = new URL(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/reports`
  );
  url.search = searchParams.toString();

  const response = await authFetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function assignProjectBudget({
  virtualLabId,
  projectId,
  amount,
}: {
  virtualLabId: string;
  projectId: string;
  amount: number;
}): Promise<any> {
  const response = await authFetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/budget/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function reverseProjectBudget({
  virtualLabId,
  projectId,
  amount,
}: {
  virtualLabId: string;
  projectId: string;
  amount: number;
}): Promise<any> {
  const response = await authFetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/budget/reverse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}
