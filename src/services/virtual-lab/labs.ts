import authFetch from '@/auth-fetch';
import { config } from '@/config';

import type { VirtualLabBalanceResponse } from '@/types/accounting';

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
    `${config.VIRTUAL_LAB_API_URL}/virtual-labs/${virtualLabId}/accounting/balance`
  );
  url.search = searchParams.toString();

  const response = await authFetch(url.toString());

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.json();
}
