import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type {
  TOnboardingUpdateUserProfileRequest,
  TUpdateUserProfileRequest,
  UserProfileResponse,
  VlmRecentWorkspace,
  VlmUserGroupsResponse,
  VlmUserProfile,
} from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';
import type { VlmResponse } from '@/types/virtual-lab/common';

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
export const updateUserProfile = async (payload: TUpdateUserProfileRequest) => {
  const api = await virtualLabRootApi();
  return api.patch<VlmResponse<{ profile: UserProfileResponse }>>('/users/profile', {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: {
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      country: payload.country,
      address: {
        street: payload.street,
        postal_code: payload.postal_code,
        locality: payload.locality,
        region: payload.region,
      },
    },
  });
};

/**
 * update the profile information during onboarding for the authenticated user
 *
 * @param payload -  user profile data to update
 * @returns  updated user profile information
 */
export const updateUserOnboardingProfile = async (payload: TOnboardingUpdateUserProfileRequest) => {
  const api = await virtualLabRootApi();
  return api.patch<VlmResponse<{ profile: UserProfileResponse }>>('/users/onboarding/profile', {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: {
      first_name: payload.first_name,
      last_name: payload.last_name,
      country: payload.country,
    },
  });
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
