import { isEmpty } from 'es-toolkit/compat';

import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type {
  TGetSelfVirtualLabResponse,
  TListPendingVirtualLabsResponse,
  TListTenantVirtualLabsResponse,
  TVirtualLab,
  TVirtualLabExistsVerificationResponse,
  TVirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
import type { TVirtualLabPayload } from '@/api/virtual-lab-svc/validation';
import type { VlmResponse } from '@/types/virtual-lab/common';

function getBaseUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/virtual-labs`;
}

export function virtualLabServiceRowToClient(row: TVirtualLab): TVirtualLab {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    reference_email: row.reference_email ?? '',
    email_verified: row.email_verified ?? false,
    entity: row.entity,
    compute_cell: row.compute_cell ?? 'cell_a',
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    projects_count: row.projects_count ?? null,
    created_by: null,
  };
}

/**
 * Pending virtual-lab invitations for the authenticated user
 */
export async function listPendingVirtualLabRequests({
  page = 1,
  size = 10,
}: {
  page?: number;
  size?: number;
} = {}): Promise<TListPendingVirtualLabsResponse> {
  const api = await virtualLabRootApi();
  return api.get<TListPendingVirtualLabsResponse>('/virtual-labs/requests', {
    headers: { accept: 'application/json' },
    queryParams: { page, size },
  });
}

/**
 * Virtual labs the requester belongs to
 */
export async function listTenantVirtualLabs({
  page = 1,
  size = 10,
  query,
  scope,
  order_by = 'creation_date',
  order_direction = 'desc',
  admin_access_only,
}: {
  page?: number;
  size?: number;
  query?: string;
  scope?: 'all' | 'self' | 'external';
  order_by: 'creation_date' | 'update_date' | 'scope';
  order_direction: 'asc' | 'desc';
  admin_access_only?: boolean;
}): Promise<TListTenantVirtualLabsResponse> {
  const api = await virtualLabRootApi();
  return api.get<TListTenantVirtualLabsResponse>('/virtual-labs', {
    headers: { accept: 'application/json' },
    queryParams: {
      page,
      size,
      ...(!isEmpty(query) ? { query } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(order_by !== undefined ? { order_by } : {}),
      ...(order_direction !== undefined ? { order_direction } : {}),
      ...(admin_access_only !== undefined ? { admin_access_only } : {}),
    },
  });
}

/**
 * The requester's owned virtual lab
 */
export async function getSelfVirtualLab(): Promise<TGetSelfVirtualLabResponse> {
  const api = await virtualLabRootApi();
  return api.get<TGetSelfVirtualLabResponse>('/virtual-labs/self', {
    headers: { accept: 'application/json' },
  });
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

    const result = (await response.json()) as TVirtualLabExistsVerificationResponse;
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
 * @returns {Promise<TVirtualLabResponse>} - api response with the created virtual lab.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function createVirtualLab({
  ...lab
}: TVirtualLabPayload): Promise<TVirtualLabResponse> {
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

  const result: TVirtualLabResponse = await response.json();
  return result;
}

/**
 * Get details for a single virtual lab.
 *
 * @param {string} id - The ID of the virtual lab to retrieve
 * @returns {Promise<TVirtualLabResponse>} - API response with the virtual lab details
 * @throws {Error} - Throws an error if the request fails or the response is invalid
 */
export async function getVirtualLab(id: string): Promise<TVirtualLabResponse> {
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

  const result: TVirtualLabResponse = await response.json();
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
  return await api.patch<VlmResponse<{ virtual_lab: TVirtualLab }>>(
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
