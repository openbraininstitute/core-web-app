import { useMutation } from '@tanstack/react-query';

import { createStandalonePayment } from '@/api/virtual-lab-svc/queries/payment';

import type { StandalonePaymentRequest } from '@/api/virtual-lab-svc/queries/types';

export function useCreateStandalonePaymentMutation() {
  return useMutation({
    mutationFn: (payload: StandalonePaymentRequest) => createStandalonePayment(payload),
  });
}
