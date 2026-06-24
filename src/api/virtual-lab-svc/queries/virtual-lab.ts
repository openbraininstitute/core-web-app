import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type {
  IVirtualLabExpandedResponse,
  ListResponse,
  TGetSelfVirtualLabResponse,
  TGetVirtualLabExpandParam,
  TVirtualLab,
  TVirtualLabExistsVerificationResponse,
  TVirtualLabWithInviteRow,
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
    course: null
  };
}

/**
 * Lists pending virtual lab requests (invite / access rows) with optional pagination.
 *
 * @param {Object} [params={}] - Request parameters.
 * @param {{ page: number; page_size: number }} [params.pagination] - Page index and page size.
 * @returns {Promise<ListResponse<TVirtualLabWithInviteRow>>} Paginated pending request rows.
 * @throws {Error} Throws if the virtual lab API request fails.
 */
export async function listPendingVirtualLabRequests({
  pagination,
}: {
  pagination?: { page: number; page_size: number };
} = {}) {
  const api = await virtualLabRootApi();
  return api.get<ListResponse<TVirtualLabWithInviteRow>>('/virtual-labs/requests', {
    headers: { accept: 'application/json' },
    queryParams: { ...pagination },
  });
}

/**
 * Lists virtual labs visible to the caller with optional pagination and filters.
 *
 * @param {Object} params - Request parameters.
 * @param {{ page: number; page_size: number }} [params.pagination] - Page index and page size.
 * @param {Object} [params.filters] - Filter and sort options forwarded as query parameters.
 * @param {'all'|'self'|'external'} params.filters.scope - Which labs to include when filters are sent.
 * @param {boolean} [params.filters.admin_access_only] - Restrict to labs where the user has admin access.
 * @param {'created_at'|'updated_at'|'name'|'owner'} [params.filters.order_by] - Sort field.
 * @param {'asc'|'desc'} [params.filters.order_direction] - Sort direction.
 * @param {string} [params.filters.query] - Case-insensitive search on lab fields (API-defined).
 * @returns {Promise<ListResponse<TVirtualLab>>} Paginated virtual lab rows.
 * @throws {Error} Throws if the virtual lab API request fails.
 */
export async function listVirtualLabs({
  pagination,
  filters,
}: {
  pagination?: { page: number; page_size: number };
  filters?: {
    scope?: 'all' | 'self' | 'external';
    admin_access_only?: boolean;
    order_by?: 'created_at' | 'updated_at' | 'name' | 'owner';
    order_direction?: 'asc' | 'desc';
    query?: string;
  };
}) {
  const api = await virtualLabRootApi();
  return api.get<ListResponse<TVirtualLab>>('/virtual-labs', {
    headers: { accept: 'application/json' },
    queryParams: {
      ...pagination,
      ...filters,
    },
  });
}

/**
 * Fetches the virtual lab associated with the authenticated user (`/virtual-labs/self`).
 *
 * @returns {Promise<TGetSelfVirtualLabResponse>} The current user's virtual lab payload from the API.
 * @throws {Error} Throws if the virtual lab API request fails.
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
 * @returns {Promise<TVirtualLab>} - api response with the created virtual lab.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function createVirtualLab({
  name,
  description,
  entity,
}: TVirtualLabPayload): Promise<TVirtualLab> {
  const api = await virtualLabRootApi();
  return await api.post('/virtual-labs', {
    headers: {
      'Content-Type': 'application/json',
    },
    body: { name, description: description ?? '', entity },
  });
}

/**
 * Get details for a single virtual lab.
 *
 * @param {string} id - The ID of the virtual lab to retrieve
 * @returns {Promise<TVirtualLabResponse>} - API response with the virtual lab details
 * @throws {Error} - Throws an error if the request fails or the response is invalid
 */
export async function getVirtualLab({
  id,
  expand,
}: {
  id: string;
  expand?: Array<TGetVirtualLabExpandParam>;
}) {
  const api = await virtualLabRootApi();
  return await api.get<IVirtualLabExpandedResponse>(`/virtual-labs/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    queryParams: { expand },
  });
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

export async function getMissingStudentEmails({
  virtualLabId,
  emails,
}: {
  virtualLabId: string;
  emails: string[];
}) {
  const api = await virtualLabRootApi();
  return await api.post<string[]>(`/virtual-labs/${virtualLabId}/missing-student-emails`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: { emails },
  });
}
