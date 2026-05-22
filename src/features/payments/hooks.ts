import { useQuery } from '@tanstack/react-query';

import { createBillingQuote } from '@/api/virtual-lab-svc/queries/billing';

import type { TBillingQuoteRequest } from '@/api/virtual-lab-svc/queries/types';

export function useBillingQuoteQuery({
  enabled,
  payload,
}: {
  enabled: boolean;
  payload: TBillingQuoteRequest | null;
}) {
  return useQuery({
    queryKey: ['billing', 'quote', payload],
    // biome-ignore lint/style/noNonNullAssertion: queryFn only runs when payload is present
    queryFn: () => createBillingQuote(payload!),
    enabled: enabled && Boolean(payload),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
