import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { config } from '@/config';
import { getSession } from '@/auth-fetch';

import type {
  UpdateUserProfileRequest,
  UserProfileResponse,
  VlmRecentWorkspace,
  VlmUserGroupsResponse,
  VlmUserProfile,
} from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

function getBaseUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/users`;
}

/**
 * get the profile information for the authenticated user
 *
 * @returns user profile information
 */
export const getUserProfile = async (): Promise<{ profile: UserProfileResponse } | null> => {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/profile`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.statusText}`);
  }

  const result: VlmUserProfile = await response.json();
  return result.data;
};

/**
 * update the profile information for the authenticated user
 *
 * @param payload -  user profile data to update
 * @returns  updated user profile information
 */
export const updateUserProfile = async (
  payload: UpdateUserProfileRequest
): Promise<{ profile: UserProfileResponse } | null> => {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      address: {
        street: payload.street,
        postal_code: payload.postal_code,
        locality: payload.locality,
        region: payload.region,
        country: payload.country,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update user profile`, { cause: await response.json() });
  }

  const result: VlmUserProfile = await response.json();
  return result.data;
};

/**
 * Get the groups that the authenticated user belongs to
 *
 * @returns list of user's groups
 */
export const getUserGroups = async (): Promise<VlmUserGroupsResponse> => {
  const session = await getSession();
  const response = await fetch(`${getBaseUrl()}/groups`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user groups`, { cause: await response.json() });
  }

  return await response.json();
};

/**
 * Fetches the current user's most recently used workspace preference
 *
 * @returns Promise<VlmGetRecentWorkspace> A promise that resolves with the recent workspace data for the current user.
 * @throws Will propagate errors thrown while creating the API client or performing the HTTP request.
 */
export const getUserRecentWorkspace = async () => {
  const api = await virtualLabRootApi();
  return await api.get<VlmRecentWorkspace>(`/users/preferences/recent-workspace`);
};

/**
 * Sets the current user's most recently used workspace preference.
 *
 * @param {Object} params - The parameters object.
 * @param {WorkspaceContext} params.workspace - The workspace context containing virtualLabId and projectId.
 * @returns {Promise<VlmRecentWorkspace>} A promise that resolves with the updated recent workspace data for the current user.
 * @throws Will propagate errors thrown while creating the API client or performing the HTTP request.
 */
export const setUserRecentWorkspace = async ({
  workspace,
}: {
  workspace: WorkspaceContext;
}): Promise<VlmRecentWorkspace> => {
  const api = await virtualLabRootApi();
  return await api.post<VlmRecentWorkspace>(`/users/preferences/recent-workspace`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: {
      workspace: {
        virtual_lab_id: workspace.virtualLabId,
        project_id: workspace.projectId,
      },
    },
  });
};
