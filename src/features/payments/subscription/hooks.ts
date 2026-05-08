import { useMutation } from '@tanstack/react-query';

import { createSubscription } from '@/api/virtual-lab-svc/queries/subscription';

import type { CreateSubscriptionRequest } from '@/api/virtual-lab-svc/queries/types';

export function useCreateSubscriptionMutation() {
  return useMutation({
    mutationFn: (payload: CreateSubscriptionRequest) => createSubscription(payload),
  });
}
