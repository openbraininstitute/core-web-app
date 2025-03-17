import { getSession } from '@/authFetch';

import { virtualLabApi } from '@/config';
import {
  UpdateUserProfileRequest,
  UserProfileResponse,
  VlmUserProfile,
} from '@/api/virtual-lab-svc/queries/types';

const BASE_URL = virtualLabApi.url;
// const BASE_URL = 'http://localhost:8000';

/**
 * get the profile information for the authenticated user
 *
 * @returns user profile information
 */
export const getUserProfile = async (): Promise<{ profile: UserProfileResponse } | null> => {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/users/profile`, {
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
  const response = await fetch(`${BASE_URL}/users/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
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
    throw new Error(`Failed to update user profile: ${response.statusText}`);
  }

  const result: VlmUserProfile = await response.json();
  return result.data;
};
