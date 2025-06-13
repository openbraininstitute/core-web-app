import isEmpty from 'lodash/isEmpty';

import { getSession } from '@/authFetch';
import { LabTypeEnum, VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import {
  VirtualLabExistsVerificationResponse,
  VirtualLabListResponse,
  VirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { virtualLabApi } from '@/config';

const BASE_URL = `${virtualLabApi.url}/virtual-labs`;

/**
 * Checks if a virtual lab with the given name already exists.
 *
 * @param {string} name - The name of the virtual lab.
 * @returns {Promise<boolean>} - Returns `true` if the lab exists, otherwise `false`.
 * @throws {Error} - Throws an error if the API request fails.
 */
export async function checkVirtualLabExists({ name }: { name: string }): Promise<boolean | null> {
  try {
    const session = await getSession();
    const response = await fetch(`${BASE_URL}/_check?q=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('validating virtual lab name failed', { cause: await response.json() });
    }

    const result = (await response.json()) as VirtualLabExistsVerificationResponse;
    return result.data?.exists ?? null;
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
  const response = await fetch(BASE_URL, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(lab),
  });

  if (!response.ok) {
    throw new Error(`creating virtual lab failed`, { cause: await response.json() });
  }

  const result: VirtualLabResponse = await response.json();
  return result;
}

/**
 * List all virtual labs for a user.
 *
 * @returns {Promise<VirtualLabResponse[]>} - api response with the list of virtual labs.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */

export async function listVirtualLabs({
  include = [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS, LabTypeEnum.PENDING_LABS],
  page = 1,
  size = 10,
  query = '',
}: {
  include: Array<LabTypeEnum>;
  page?: number;
  size?: number;
  query?: string;
}): Promise<VirtualLabListResponse> {
  const session = await getSession();
  const params = new URLSearchParams({
    include: include.join(','),
    page: page.toString(),
    size: size.toString(),
    ...(!isEmpty(query) ? { query } : {}),
  });
  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
    next: {
      tags: ['list-virtual-labs'],
    },
  });

  if (!response.ok) {
    throw new Error(`listing virtual labs failed`, { cause: await response.json() });
  }

  const result: VirtualLabListResponse = await response.json();
  return result;
}

/**
 * Get details for a single virtual lab.
 *
 * @param {string} id - The ID of the virtual lab to retrieve
 * @returns {Promise<VirtualLabResponse>} - API response with the virtual lab details
 * @throws {Error} - Throws an error if the request fails or the response is invalid
 */
export async function getVirtualLab(id: string): Promise<VirtualLabResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`getting virtual lab failed`, { cause: await response.json() });
  }

  const result: VirtualLabResponse = await response.json();
  return result;
}
