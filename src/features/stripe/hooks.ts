import { useQuery } from '@tanstack/react-query';

import { getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { keyBuilder as externalKeyBuilder } from '@/ui/use-query-keys/third-parties';

import { getStripe } from './client';

export function useSetupIntentQuery({
  enabled = true,
  virtualLabId,
}: {
  enabled?: boolean;
  virtualLabId: string;
}) {
  return useQuery({
    queryKey: externalKeyBuilder.stripeSetupIntent({ virtualLabId }),
    queryFn: getSetupIntent,
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useStripeInstanceQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: externalKeyBuilder.stripeInstance(),
    queryFn: getStripe,
    enabled,
  });
}
