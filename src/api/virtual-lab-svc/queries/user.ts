import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { log } from '@/utils/logger';

import type {
  UpdateUserProfileRequest,
  UserProfileResponse,
  VlmRecentWorkspace,
  VlmUserGroupsResponse,
  VlmUserProfile,
} from '@/api/virtual-lab-svc/queries/types';
import type { IWorkspaceHierarchySpeciesPreference } from '@/features/brain-region-hierarchy/types';
import type { WorkspaceContext } from '@/types/common';

function getBaseUrl() {
  return `${config.VIRTUAL_LAB_API_URL}/users`;
}

/**
 * get the profile information for the authenticated user
 *
 * @returns user profile information
 */
export const getUserProfile = async (): Promise<{
  profile: UserProfileResponse;
} | null> => {
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
    throw new Error(`Failed to update user profile`, {
      cause: await response.json(),
    });
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
    throw new Error(`Failed to get user groups`, {
      cause: await response.json(),
    });
  }

  return await response.json();
};

const userPreferencesBaseUri = '/users/preferences';
/**
 * Fetches the current user's most recently used workspace preference
 *
 * @returns Promise<VlmGetRecentWorkspace> A promise that resolves with the recent workspace data for the current user.
 * @throws Will propagate errors thrown while creating the API client or performing the HTTP request.
 */
export const getUserRecentWorkspace = async () => {
  const api = await virtualLabRootApi();
  return await api.get<VlmRecentWorkspace>(`${userPreferencesBaseUri}/recent-workspace`);
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
  return await api.post<VlmRecentWorkspace>(`${userPreferencesBaseUri}/recent-workspace`, {
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

/**
 * Response shape for brain region preference API
 */
export interface IVlmWorkspaceHierarchySpeciesPreference {
  message: string;
  data: {
    user_id: string;
    preference: IWorkspaceHierarchySpeciesPreference;
    updated_at: string;
  } | null;
}

/**
 * Fetches the user's brain region hierarchy preference from the API
 *
 * @returns Promise with the user's brain region preference, or null if not set
 */
export async function getWorkspaceHierarchySpeciesPreference(): Promise<IVlmWorkspaceHierarchySpeciesPreference | null> {
  try {
    const api = await virtualLabRootApi();
    return await api.get<IVlmWorkspaceHierarchySpeciesPreference>(
      `${userPreferencesBaseUri}/workspace-hierarchy-species`
    );
  } catch (error) {
    log('warn', 'Failed to fetch brain region preference from API:', error);
    return null;
  }
}

/**
 * sets the user's brain region hierarchy species preference
 *
 * @param preference - The brain region preference to persist
 */
export async function updateBrainRegionPreference(
  preference: IWorkspaceHierarchySpeciesPreference
): Promise<void> {
  // Fire-and-forget: execute async but don't await

  try {
    const api = await virtualLabRootApi();
    await api.patch(`${userPreferencesBaseUri}/workspace-hierarchy-species`, {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: preference,
    });
  } catch (error) {
    // Log but don't throw - this is intentionally fire-and-forget
    log('warn', 'Failed to persist brain region preference to API:', error);
  }
}
