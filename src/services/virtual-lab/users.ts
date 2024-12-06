import { TotalUsersResponse, Agent } from '@/types/virtual-lab/members';
import { virtualLabApi } from '@/config';
import authFetch from '@/authFetch';
import { VlmResponse } from '@/types/virtual-lab/common';

export async function getTotalUsers(): Promise<TotalUsersResponse> {
  const response = await authFetch(`${virtualLabApi.url}/users_count`);

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getAgentForUser(): Promise<VlmResponse<Agent>> {
  const response = await authFetch(`${virtualLabApi.url}/agent`);

  if (!response.ok) {
    throw new Error(`Agent could not be fetched. Status: ${response.status}`);
  }

  return response.json();
}
