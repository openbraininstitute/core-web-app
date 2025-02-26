import { virtualLabApi } from '@/config';
import { VirtualLab, VirtualLabResponse } from '@/types/virtual-lab/lab';
import { VirtualLabBalanceResponse, VirtualLabJobReportsResponse } from '@/types/accounting';
import { VirtualLabAPIListData, VlmResponse } from '@/types/virtual-lab/common';
import { UsersResponse } from '@/types/virtual-lab/members';
import authFetch, { authFetchRetryOnError } from '@/authFetch';
import { assertApiResponse } from '@/util/utils';
import { VirtualLabWithOptionalId } from '@/components/VirtualLab/CreateVirtualLabButton/types';

export async function getVirtualLabDetail(id: string): Promise<VirtualLabResponse> {
  const response = await authFetchRetryOnError(`${virtualLabApi.url}/virtual-labs/${id}`);

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getVirtualLabUsers(virtualLabId: string): Promise<UsersResponse> {
  const response = await authFetchRetryOnError(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/users`
  );
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

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

export async function deleteVirtualLab(id: string): Promise<
  VlmResponse<{
    virtual_lab: VirtualLab;
  }>
> {
  const response = await authFetch(`${virtualLabApi.url}/virtual-labs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function getPlans(): Promise<
  VlmResponse<{
    all_plans: [
      {
        id: number;
        name: string;
        price: number;
        features: Record<string, Array<string>>;
      },
    ];
  }>
> {
  const response = await authFetch(`${virtualLabApi.url}/plans`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function createVirtualLab({
  lab,
}: {
  lab: VirtualLabWithOptionalId;
}): Promise<VlmResponse<{ virtual_lab: VirtualLab }>> {
  const response = await authFetch(`${virtualLabApi.url}/virtual-labs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lab),
  });

  return assertApiResponse(response);
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

export async function getVirtualLabJobReports({
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

export async function topUpVirtualLabAccount({
  virtualLabId,
  amount,
}: {
  virtualLabId: string;
  amount: number;
}): Promise<VirtualLabJobReportsResponse> {
  const response = await authFetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/accounting/budget/top-up`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

// ! This endpoint is only for demo purposes
// TODO Replace with a proper integration with the payment provider
export async function topUpVirtualLabBudget({
  virtualLabId,
  amount,
}: {
  virtualLabId: string;
  amount: number;
}): Promise<VirtualLabJobReportsResponse> {
  const response = await authFetch(
    `${virtualLabApi.url}/virtual-labs/${virtualLabId}/accounting/budget/top-up`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}
