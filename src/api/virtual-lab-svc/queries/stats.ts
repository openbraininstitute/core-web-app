import {
  VlmProjectStatsResponse,
  VlmUserStatsResponse,
  VlmVirtualLabStatsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { getSession } from '@/auth-fetch';
import { serverConfig } from '@/config/server';

const BASE_URL = `${serverConfig.VIRTUAL_LAB_API_URL}/virtual-labs`;

/**
 * Get statistics for the current user.
 *
 * @returns {Promise<VlmUserStatsResponse>} - User statistics including lab and project counts
 * @throws {Error} - Throws an error if the request fails
 */
export async function getUserStats(): Promise<VlmUserStatsResponse> {
  const session = await getSession();
  const response = await fetch(`${serverConfig.VIRTUAL_LAB_API_URL}/users/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    cache: 'no-store',
    next: {
      tags: ['user-stats'],
    },
  });

  if (!response.ok) {
    throw new Error(`Getting user stats failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmUserStatsResponse = await response.json();
  return result;
}

/**
 * Get statistics for a specific project.
 *
 * @param projectId - The UUID of the project
 * @returns {Promise<VlmProjectStatsResponse>} - Project statistics
 * @throws {Error} - Throws an error if the request fails
 */
export async function getProjectStats(
  virtualLabId: string,
  projectId: string
): Promise<VlmProjectStatsResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${virtualLabId}/projects/${projectId}/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Getting project stats failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmProjectStatsResponse = await response.json();
  return result;
}

/**
 * Get statistics for a specific virtual lab.
 *
 * @param virtualLabId - The UUID of the virtual lab
 * @returns {Promise<VlmVirtualLabStatsResponse>} - Virtual lab statistics
 * @throws {Error} - Throws an error if the request fails
 */
export async function getVirtualLabStats(
  virtualLabId: string
): Promise<VlmVirtualLabStatsResponse> {
  const session = await getSession();
  const response = await fetch(`${BASE_URL}/${virtualLabId}/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Getting virtual lab stats failed`, {
      cause: await response.json(),
    });
  }

  const result: VlmVirtualLabStatsResponse = await response.json();
  return result;
}
