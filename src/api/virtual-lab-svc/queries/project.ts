import { getSession } from '@/authFetch';

import {
  ProjectCreationResponse,
  ProjectExistsVerificationResponse,
  ProjectUsersCountResponse,
  VlmAttachUsersToProjectResponse,
  VlmProjectsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { virtualLabApi } from '@/config';

const BASE_URL = `${virtualLabApi.url}/virtual-labs`;
// const BASE_URL = `http://localhost:8000/virtual-labs`;
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
 * Gets the count of users in a project.
 *
 * @param {string} virtualLabId - The ID of the virtual lab.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<ProjectUsersCountResponse>} - Returns the count of users in the project.
 * @throws {Error} - Throws an error if the API request fails.
 */
async function getProjectUsersCount(
  virtualLabId: string,
  projectId: string
): Promise<ProjectUsersCountResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects/${projectId}/users/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get project users count`, { cause: await response.json() });
  }

  const result = (await response.json()) as ProjectUsersCountResponse;
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
  size = 20,
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
