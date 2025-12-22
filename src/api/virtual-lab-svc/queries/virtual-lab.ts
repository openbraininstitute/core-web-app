import isEmpty from 'es-toolkit/compat/isEmpty';

import { LabTypeEnum, VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { getSession } from '@/auth-fetch';
import {
  VirtualLab,
  VirtualLabExistsVerificationResponse,
  VirtualLabListResponse,
  VirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { config } from '@/config';

import type { VlmResponse } from '@/types/virtual-lab/common';

function getBaseUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/virtual-labs`;
}

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
    const response = await fetch(`${getBaseUrl()}/_check?q=${encodeURIComponent(name)}`, {
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
  const response = await fetch(getBaseUrl(), {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({ ...lab, description: '' }),
  });

  if (!response.ok) {
    const res = await response.json();
    throw new Error(`creating virtual lab failed`, { cause: res });
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
    page: page.toString(),
    size: size.toString(),
    ...(!isEmpty(query) ? { query } : {}),
  });
  for (const item of include) {
    params.append('include', item);
  }
  const url = `${getBaseUrl()}?${params.toString()}`;

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
  const response = await fetch(`${getBaseUrl()}/${id}`, {
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

export interface VirtualLabUpdate {
  name?: string | null;
  description?: string | null;
  reference_email?: string | null;
  entity?: string | null;
}

/**
 * Update a Virtual Lab by sending a PATCH request to the virtual lab service.
 *
 * Sends a JSON PATCH request to `${getBaseUrl()}/virtual-lab/{virtualLabId}` using the
 * configured virtual lab API client. The provided `updatePayload` is stringified
 * and sent as the request body with `Content-Type: application/json`.
 *
 * @param params - Parameter object
 * @param params.virtualLabId - The unique identifier of the Virtual Lab to update.
 * @param params.updatePayload - The partial update payload conforming to `VirtualLabUpdate`.
 *
 * @returns A promise that resolves with the service response. The response type is
 * a `VlmResponse` wrapping an object containing the updated `virtual_lab: VirtualLab`.
 *
 * @throws Will throw if the API client initialization (`virtualLabRootApi`) fails,
 *         if the network request fails, or if the service returns an error status.
 */
export async function updateVirtualLab({
  virtualLabId,
  updatePayload,
}: {
  virtualLabId: string;
  updatePayload: VirtualLabUpdate;
}) {
  const api = await virtualLabRootApi();
  return await api.patch<VlmResponse<{ virtual_lab: VirtualLab }>>(
    `/virtual-labs/${virtualLabId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: { ...updatePayload },
    }
  );
}
