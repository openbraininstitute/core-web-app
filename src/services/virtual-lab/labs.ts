import type { VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import authFetch, { authFetchRetryOnError } from '@/auth-fetch';
import { config } from '@/config';
import type { VirtualLabBalanceResponse } from '@/types/accounting';
import type { VirtualLabAPIListData, VlmResponse } from '@/types/virtual-lab/common';
import { assertApiResponse } from '@/util/utils';

export async function getVirtualLabsOfUser(): Promise<
  VlmResponse<VirtualLabAPIListData<VirtualLab>>
> {
  const response = await authFetchRetryOnError(`${config.VIRTUAL_LAB_API_URL}/virtual-labs`);

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function patchVirtualLab(
  partialVlab: Partial<VirtualLab>,
  id: string,
): Promise<
  VlmResponse<{
    virtual_lab: VirtualLab;
  }>
> {
  const res = await authFetch(`${config.VIRTUAL_LAB_API_URL}/virtual-labs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partialVlab),
  });

  return assertApiResponse(res);
}

export async function getVirtualLabAccountBalance({
  virtualLabId,
  includeProjects = false,
}: {
  virtualLabId: string;
  includeProjects: boolean;
}): Promise<VirtualLabBalanceResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('include_projects', includeProjects.toString());

  const url = new URL(
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/accounting/balance`,
  );
  url.search = searchParams.toString();

  const response = await authFetch(url.toString());

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}
