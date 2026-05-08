import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type {
  SetupIntentResponse,
  StandalonePaymentRequest,
  StandalonePaymentResponse,
  SubscriptionPaymentsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import type { VlmResponse } from '@/types/virtual-lab/common';

const paymentsBaseUri = '/payments';
const subscriptionsBaseUri = '/subscriptions';

export async function getSetupIntent(): Promise<SetupIntentResponse> {
  const api = await virtualLabRootApi();
  return await api.get<SetupIntentResponse>(`${paymentsBaseUri}/setup-intent`, {
    headers: {
      accept: 'application/json',
    },
  });
}

export async function createStandalonePayment(payload: StandalonePaymentRequest) {
  const api = await virtualLabRootApi();
  return await api.post<VlmResponse<StandalonePaymentResponse>>(`${paymentsBaseUri}/standalone`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: payload,
  });
}

export async function listStandalonePayments({
  page = 1,
  pageSize = 5,
  virtualLabId,
}: {
  page?: number;
  pageSize?: number;
  virtualLabId?: string;
}): Promise<SubscriptionPaymentsResponse> {
  const api = await virtualLabRootApi();
  return await api.get<SubscriptionPaymentsResponse>(`${subscriptionsBaseUri}/payments`, {
    headers: {
      accept: 'application/json',
    },
    queryParams: {
      payment_type: 'standalone',
      page,
      page_size: pageSize,
      virtual_lab_id: virtualLabId,
    },
  });
}
