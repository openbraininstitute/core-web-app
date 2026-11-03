'use client';

import { useQuery } from '@tanstack/react-query';

import { adminQueryKeys } from '../shared/query-keys';

import type { OperatorCapabilities } from '../capabilities/types';

async function fetchOperatorCapabilities(): Promise<OperatorCapabilities> {
  const res = await fetch('/api/admin/capabilities');
  if (!res.ok) throw new Error(`operator capabilities request failed: ${res.status}`);
  return res.json();
}

// A display hint only, so one read per page load is enough for every signed-in user: the
// server re-checks on every page and every service on every call.
export function useOperatorCapabilities() {
  return useQuery({
    queryKey: adminQueryKeys.operatorCapabilities(),
    queryFn: fetchOperatorCapabilities,
    staleTime: Infinity,
  });
}
