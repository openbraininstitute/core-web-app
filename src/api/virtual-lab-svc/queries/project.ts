import { getSession } from 'next-auth/react';
import uniqBy from 'lodash/uniqBy';

import {
  ProjectCreationResponse,
  ProjectExistsVerificationResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { virtualLabApi } from '@/config';

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
}): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('User session not found. Please log in.');
    }
    const response = await fetch(
      `${virtualLabApi.url}/virtual-labs/${vlabId}/projects/_check?q=${encodeURIComponent(name)}`,
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
    return result.data.exists;
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
    const response = await fetch(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects`, {
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
