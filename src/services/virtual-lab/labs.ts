import { virtualLabApi } from '@/config';
import { VirtualLabBalanceResponse, VirtualLabJobReportsResponse } from '@/types/accounting';
import { VirtualLabAPIListData, VlmResponse } from '@/types/virtual-lab/common';

import { assertApiResponse } from '@/util/utils';
import authFetch, { authFetchRetryOnError } from '@/authFetch';
import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';

export async function getVirtualLabsOfUser(): Promise<
  VlmResponse<VirtualLabAPIListData<VirtualLab>>
> {
  const response = await authFetchRetryOnError(`${virtualLabApi.url}/virtual-labs`);

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function patchVirtualLab(
  partialVlab: Partial<VirtualLab>,
  id: string
): Promise<
  VlmResponse<{
    virtual_lab: VirtualLab;
  }>
> {
  const res = await authFetch(`${virtualLabApi.url}/virtual-labs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partialVlab),
  });

  return assertApiResponse(res);
}

async function deleteVirtualLab(id: string): Promise<
  VlmResponse<{
    virtual_lab: VirtualLab;
  }>
> {
  const response = await authFetch(`${virtualLabApi.url}/virtual-labs/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
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

  const url = new URL(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/accounting/balance`);
  url.search = searchParams.toString();

  const response = await authFetch(url.toString());

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

async function getVirtualLabJobReports({
  virtualLabId,
  page = 0,
  pageSize = 10,
}: {
  virtualLabId: string;
  page?: number;
  pageSize?: number;
}): Promise<VirtualLabJobReportsResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set('page', page.toString());
  searchParams.set('page_size', pageSize.toString());

  const url = new URL(`${virtualLabApi.url}/virtual-labs/${virtualLabId}/accounting/reports`);
  url.search = searchParams.toString();

  const response = await authFetch(url.toString());

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}
