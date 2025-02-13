import { getSession } from 'next-auth/react';
import uniqBy from 'lodash/uniqBy';

import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import {
  VirtualLabExistsVerificationResponse,
  VirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { virtualLabApi } from '@/config';

/**
 * Checks if a virtual lab with the given name already exists.
 *
 * @param {string} name - The name of the virtual lab.
 * @returns {Promise<boolean>} - Returns `true` if the lab exists, otherwise `false`.
 * @throws {Error} - Throws an error if the API request fails.
 */
export async function checkVirtualLabExists({ name }: { name: string }): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      throw new Error('User session not found. Please log in.');
    }
    const response = await fetch(
      `${virtualLabApi.url}/virtual-labs/_check?q=${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('validating virtual lab name failed');
    }

    const result = (await response.json()) as VirtualLabExistsVerificationResponse;
    return result.data.exists;
  } catch (error) {
    // TODO: capture exception with sentry
    throw new Error(`Failed to check virtual lab existence: ${(error as Error).message}`);
  }
}

/**
 * Creates a new virtual lab.
 *
 * @param {Object} params - Parameters for virtual lab creation.
 * @param {VirtualLabPayload} lab - The virtual lab details.
 * @returns {Promise<VirtualLabResponse>} - api response with the created virtual lab.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function createVirtualLab({ ...lab }: VirtualLabPayload): Promise<VirtualLabResponse> {
  const session = await getSession();
  try {
    const response = await fetch(`${virtualLabApi.url}/virtual-labs`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify({
        ...lab,
        include_members: uniqBy(lab.include_members, (o) => o.email.toLowerCase()),
        // FIXME: should be removed after plans are integrated
        plan_id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`creating virtual lab failed ${response.status}`);
    }

    const result: VirtualLabResponse = await response.json();
    return result;
  } catch (error) {
    // TODO: capture exception with sentry
    // eslint-disable-next-line no-console
    console.error('Error creating virtual lab:', error);
    throw new Error(`Failed to create virtual lab: ${(error as Error).message}`);
  }
}
