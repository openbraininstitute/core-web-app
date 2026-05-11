import authFetch, { authFetchWithoutRetry } from '@/auth-fetch';
import { config } from '@/config';

import type {
  ProjectBalance,
  ProjectBalanceResponse,
  ProjectJobReportsResponse,
} from '@/types/accounting';

export async function getProjectAccountBalance({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}): Promise<ProjectBalance> {
  const response = await authFetch(
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/balance`
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  const projectBalanceResponse: ProjectBalanceResponse = await response.json();

  return projectBalanceResponse.data;
}

export async function getProjectJobReports({
  virtualLabId,
  projectId,
  page = 1,
  pageSize = 10,
  signal,
}: {
  virtualLabId: string;
  projectId: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<ProjectJobReportsResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set('page', page.toString());
  searchParams.set('page_size', pageSize.toString());

  const url = new URL(
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/reports`
  );
  url.search = searchParams.toString();

  const response = await authFetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}

export async function assignProjectBudget({
  virtualLabId,
  projectId,
  amount,
}: {
  virtualLabId: string;
  projectId: string;
  amount: number;
}): Promise<any> {
  const response = await authFetchWithoutRetry(
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/budget/assign`,
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

export async function reverseProjectBudget({
  virtualLabId,
  projectId,
  amount,
}: {
  virtualLabId: string;
  projectId: string;
  amount: number;
}): Promise<any> {
  const response = await authFetchWithoutRetry(
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/projects/${projectId}/accounting/budget/reverse`,
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
