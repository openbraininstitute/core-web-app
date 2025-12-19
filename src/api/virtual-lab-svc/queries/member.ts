import type {
  MemberResponse,
  MembersResponse,
  Role,
  VlmDeleteProjectMemberResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';

import type { VlmResponse } from '@/types/virtual-lab/common';

const baseUri = `${config.VIRTUAL_LAB_API_URL}/virtual-labs`;

/**
 * List all users (members + admin + pending invites)  for a specific virtual lab.
 *
 * @returns {Promise<UsersResponse>} - api response with the list of users.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function listVirtualLabMembers({
  virtualLabId,
}: {
  virtualLabId: string;
}): Promise<MembersResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/users`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`listing virtual labs members failed`, {
      cause: await response.json(),
    });
  }

  const result: MembersResponse = await response.json();
  return result;
}

/**
 * List all users (members + admin + pending invites)  for a specific project.
 *
 * @returns {Promise<MembersResponse>} - api response with the list of users.
 * @throws {Error} - Throws an error if the request fails or the response is invalid.
 */
export async function listProjectMembers({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}): Promise<MembersResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/projects/${projectId}/users`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`listing project members failed`, {
      cause: await response.json(),
    });
  }

  const result: MembersResponse = await response.json();
  return result;
}

/**
 * Changes the role of a user in a virtual lab
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param userId - The UUID of the user whose role needs to be changed
 * @param newRole - The new role to assign to the user (admin or member)
 * @returns Promise containing the updated user information
 * @throws Error if the request fails or if the last admin tries to become a member
 *
 */
export async function updateVirtualLabUserRole({
  virtualLabId,
  userId,
  newRole,
}: {
  virtualLabId: string;
  userId: string;
  newRole: Role;
}): Promise<MemberResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/users/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      new_role: newRole,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to change user role', {
      cause: await response.json(),
    });
  }

  const result: MemberResponse = await response.json();
  return result;
}

/**
 * Deletes a pending invite for a virtual lab.
 * This only works for invites that have not been accepted yet.
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param email - Email address of the invited user
 * @param role - Role of the invite (defaults to UserRole.MEMBER if not specified)
 *
 * @returns Promise that resolves when the invite is successfully deleted
 *
 * @throws {Error} If the invite cannot be deleted (e.g., already accepted, not found)
 *
 */

export async function cancelVirtualLabInvite({
  virtualLabId,
  email,
  role,
}: {
  virtualLabId: string;
  email: string;
  role?: Role;
}): Promise<VlmResponse<null>> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/invites/cancel`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      email,
      role,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete lab invite', {
      cause: await response.json(),
    });
  }

  const result: VlmResponse<null> = await response.json();
  return result;
}

/**
 * remove user from virtual lab
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param userId - The UUID of the user to remove
 *
 * @returns Promise that resolves when the user is successfully removed
 *
 * @throws {Error} If the user cannot be removed (e.g., not found)
 */
export async function removeUserFromVirtualLab({
  virtualLabId,
  userId,
}: {
  virtualLabId: string;
  userId: string;
}): Promise<VlmResponse<null>> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/users/detach`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove user from virtual lab', {
      cause: await response.json(),
    });
  }

  const result: VlmResponse<null> = await response.json();
  return result;
}

/**
 * Changes the role of a user in a project
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param projectId - The UUID of the project
 * @param userId - The UUID of the user whose role needs to be changed
 * @param newRole - The new role to assign to the user (admin or member)
 * @returns Promise containing the updated user information
 * @throws Error if the request fails or if the last admin tries to become a member
 *
 */
export async function updateProjectUserRole({
  virtualLabId,
  projectId,
  userId,
  newRole,
}: {
  virtualLabId: string;
  projectId: string;
  userId: string;
  newRole: Role;
}): Promise<MemberResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/projects/${projectId}/users/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      new_role: newRole,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to change user role within project', {
      cause: await response.json(),
    });
  }

  const result: MemberResponse = await response.json();
  return result;
}

/**
 * Deletes a pending invite for a project.
 * This only works for invites that have not been accepted yet.
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param projectId - The UUID of the project
 * @param email - Email address of the invited user
 * @param role - Role of the invite (defaults to UserRole.MEMBER if not specified)
 *
 * @returns Promise that resolves when the invite is successfully deleted
 *
 * @throws {Error} If the invite cannot be deleted (e.g., already accepted, not found)
 *
 */
export async function cancelProjectInvite({
  virtualLabId,
  projectId,
  email,
  role,
}: {
  virtualLabId: string;
  projectId: string;
  email: string;
  role?: Role;
}): Promise<VlmResponse<null>> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/projects/${projectId}/invites/cancel`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      email,
      role,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete virtual lab lab invite', {
      cause: await response.json(),
    });
  }

  const result: VlmResponse<null> = await response.json();
  return result;
}

/**
 * remove user from project
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @param project - The UUID of the project
 * @param userId - The UUID of the user to remove
 *
 * @returns Promise that resolves when the user is successfully removed
 *
 * @throws {Error} If the user cannot be removed (e.g., not found)
 */
export async function removeUserFromProject({
  virtualLabId,
  projectId,
  userId,
}: {
  virtualLabId: string;
  projectId: string;
  userId: string;
}): Promise<VlmDeleteProjectMemberResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${virtualLabId}/projects/${projectId}/users/detach`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to remove user from virtual lab', {
      cause: await response.json(),
    });
  }

  const result: VlmDeleteProjectMemberResponse = await response.json();
  return result;
}
