import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { keyBuilder } from '@/ui/use-query-keys/user';

import type { CreateSubscriptionRequest } from '@/api/virtual-lab-svc/queries/types';

export function useCreateSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionRequest) => createSubscription(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keyBuilder.subscription() });
    },
  });
}
