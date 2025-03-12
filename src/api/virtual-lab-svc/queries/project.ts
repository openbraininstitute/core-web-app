import uniqBy from 'lodash/uniqBy';
import { getSession } from '@/authFetch';

import {
  ProjectCreationResponse,
  ProjectExistsVerificationResponse,
  ProjectUsersCountResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { virtualLabApi } from '@/config';

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
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('User session not found. Please log in.');
    }
    const response = await fetch(
      `${BASE_URL}/${vlabId}/projects/_check?q=${encodeURIComponent(name)}`,
      {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Validating project name failed');
    }

    const result = (await response.json()) as ProjectExistsVerificationResponse;
    return result.data?.exist ?? null;
  } catch (error) {
    // TODO: capture exception with sentry
    throw new Error(`Failed to check project existence: ${(error as Error).message}`);
  }
}

export async function createProject(
  virtualLabId: string,
  { name, description, include_members }: ProjectPayload
): Promise<ProjectCreationResponse> {
  const session = await getSession();
  try {
    const response = await fetch(`${BASE_URL}/${virtualLabId}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        name,
        description,
        include_members: uniqBy(include_members, (o) => o.email.toLowerCase()),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `Creating project failed: ${response.status} - ${errorBody?.message || 'Unknown error'}`
      );
    }

    const result: ProjectCreationResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    // eslint-disable-next-line no-console
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${(error as Error).message}`);
  }
}

/**
 * Gets the count of users in a project.
 *
 * @param {string} virtualLabId - The ID of the virtual lab.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<ProjectUsersCountResponse>} - Returns the count of users in the project.
 * @throws {Error} - Throws an error if the API request fails.
 */
export async function getProjectUsersCount(
  virtualLabId: string,
  projectId: string
): Promise<ProjectUsersCountResponse> {
  const session = await getSession();
  if (!session?.accessToken) {
    throw new Error('User session not found. Please log in.');
  }

  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects/${projectId}/users/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get project users count: ${response.statusText}`);
  }

  const result = (await response.json()) as ProjectUsersCountResponse;
  return result;
}
