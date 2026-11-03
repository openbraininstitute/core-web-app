'use client';

import { useQuery } from '@tanstack/react-query';

import { deriveCapabilities } from '../capabilities/derive';
import { adminQueryKeys } from '../shared/query-keys';

import type { OperatorCapabilities } from '../capabilities/types';

async function fetchOperatorCapabilities(): Promise<OperatorCapabilities> {
  const res = await fetch('/api/admin/capabilities', { credentials: 'same-origin' });
  if (res.status === 401) return deriveCapabilities([]);
  if (!res.ok) throw new Error(`operator capabilities request failed: ${res.status}`);
  return (await res.json()) as OperatorCapabilities;
}

// A display hint only: the server re-checks on every page and every service on every call.
export function useOperatorCapabilities() {
  return useQuery({
    queryKey: adminQueryKeys.operatorCapabilities(),
    queryFn: fetchOperatorCapabilities,
    staleTime: 5 * 60 * 1000,
  });
}
