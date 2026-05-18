import { useQuery } from '@tanstack/react-query';

import { convertCreditsToCurrency } from '@/api/virtual-lab-svc/queries/billing';

import type {
  CreditConversionRequest,
  CreditConversionResponse,
} from '@/api/virtual-lab-svc/queries/types';

export function useCreditConversionQuery({
  enabled,
  payload,
}: {
  enabled: boolean;
  payload: CreditConversionRequest | null;
}) {
  return useQuery<CreditConversionResponse>({
    queryKey: ['billing', 'credit-conversion', payload],
    // biome-ignore lint/style/noNonNullAssertion: queryFn only runs when payload is present
    queryFn: () => convertCreditsToCurrency(payload!),
    enabled: enabled && Boolean(payload),
    staleTime: 30_000,
  });
}
