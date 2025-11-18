import { getSession } from '@/authFetch';

import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { virtualLabApi } from '@/config';

import type { ProjectResponse } from '@/types/virtual-lab/projects';
import type { ProjectPayload, Role } from '@/api/virtual-lab-svc/types';
import type { WorkspaceContext } from '@/types/common';
import type {
  ProjectCreationResponse,
  ProjectExistsVerificationResponse,
  VlmAttachUsersToProjectResponse,
  VlmProjectsResponse,
} from '@/api/virtual-lab-svc/queries/types';

const BASE_URL = `${virtualLabApi.url}/virtual-labs`;
/**
 * Checks if a project with the given name already exists in a virtual lab.
 *
 * @param {string} vlabId - The ID of the virtual lab.
 * @param {string} name - The name of the project.
 * @returns {Promise<boolean>} - Returns `true` if the project exists, otherwise `false`.
 * @throws {Error} - Throws an error if the API request fails.
 */
export async function checkProjectExists({
  vlabId,
  name,
}: {
  vlabId: string;
  name: string;
}): Promise<boolean | null> {
  const session = await getSession();
  const response = await fetch(
    `${BASE_URL}/${vlabId}/projects/_check?q=${encodeURIComponent(name)}`,
    {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Validating project name failed', { cause: await response.json() });
  }

  const result = (await response.json()) as ProjectExistsVerificationResponse;
  return result.data?.exist ?? null;
}

export async function createProject(
  virtualLabId: string,
  { name, description, include_members }: ProjectPayload
): Promise<ProjectCreationResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      name,
      description,
      include_members,
    }),
  });

  if (!response.ok) {
    throw new Error(`Creating project failed`, { cause: await response.json() });
  }

  const result: ProjectCreationResponse = await response.json();
  return result;
}

/**
 * list projects for a virtual lab with pagination.
 *
 * @param {Object} params - The parameters for fetching projects
 * @param {string} params.virtualLabId - The ID of the virtual lab
 * @param {number} params.page - The page number (default: 1)
 * @param {number} params.size - The number of items per page (default: 20)
 * @returns {Promise<VlmProjectsResponse>} - Returns the paginated projects data
 * @throws {Error} - Throws an error if the API request fails
 */
export async function listProjects({
  virtualLabId,
  page = 1,
  size = 40,
}: {
  virtualLabId: string;
  page?: number;
  size?: number;
}): Promise<VlmProjectsResponse> {
  const session = await getSession();

  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects?page=${page}&size=${size}`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetching projects failed`, { cause: await response.json() });
  }

  const result = (await response.json()) as VlmProjectsResponse;
  return result;
}

/**
 * Add users to project
 *
 * @param {string} params.virtualLabId - The ID of the virtual lab
 * @param {string} params.projectId - The ID of the project
 * @param {Array<AddUserToProjectIn>} params.users - The list of users to add
 * @returns {Promise<VlmAttachUsersToProjectResponse>} - Returns the paginated projects data
 * @throws {Error} - Throws an error if the API request fails
 */
export async function attachUsersToProject({
  virtualLabId,
  projectId,
  users,
}: {
  virtualLabId: string;
  projectId: string;
  users: Array<{ email: string; role: string; id: string }>;
}): Promise<VlmAttachUsersToProjectResponse> {
  const session = await getSession();

  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects/${projectId}/users/attach`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      users,
    }),
  });

  if (!response.ok) {
    throw new Error(`Attaching users to project failed`, { cause: await response.json() });
  }

  const result = (await response.json()) as VlmAttachUsersToProjectResponse;
  return result;
}

export async function getProject({ virtualLabId, projectId }: WorkspaceContext) {
  const api = await virtualLabRootApi();
  return await api.get<ProjectResponse>(`/virtual-labs/${virtualLabId}/projects/${projectId}`);
}

export async function updateProject({
  virtualLabId,
  projectId,
  payload,
}: WorkspaceContext & {
  payload: {
    name?: string;
    description?: string;
  };
}) {
  const api = await virtualLabRootApi();
  return await api.patch<ProjectResponse>(`/virtual-labs/${virtualLabId}/projects/${projectId}`, {
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload,
  });
}

type InvitePayload = {
  email: string;
  role: Role;
};

export async function inviteToProject({
  virtualLabId,
  projectId,
  payload,
}: WorkspaceContext & {
  payload: InvitePayload;
}) {
  const api = await virtualLabRootApi();
  return await api.patch<ProjectResponse>(
    `/virtual-labs/${virtualLabId}/projects/${projectId}/invite`,
    {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: payload,
    }
  );
}
