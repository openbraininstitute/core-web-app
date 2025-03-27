import { getSession } from '@/authFetch';

import { virtualLabApi } from '@/config';
import {
  UpdateUserProfileRequest,
  UserProfileResponse,
  VlmUserGroupsResponse,
  VlmUserProfile,
} from '@/api/virtual-lab-svc/queries/types';

const BASE_URL = `${virtualLabApi.url}/users`;
// const BASE_URL = 'http://localhost:8000';

/**
 * get the profile information for the authenticated user
 *
 * @returns user profile information
 */
export const getUserProfile = async (): Promise<{ profile: UserProfileResponse } | null> => {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/profile`, {
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
  const response = await fetch(`${BASE_URL}/profile`, {
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
  const response = await fetch(`${BASE_URL}/groups`, {
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
