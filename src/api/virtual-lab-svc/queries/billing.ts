import { virtualLabRootApi } from '../utils';

import type { VlmResponse } from '@/types/virtual-lab/common';
import type {
  BillingQuoteResponse,
  CreditConversionRequest,
  CreditConversionResponse,
  TBillingQuoteRequest,
} from './types';

const baseUri = '/billing';

export async function createBillingQuote(
  payload: TBillingQuoteRequest
): Promise<BillingQuoteResponse> {
  const api = await virtualLabRootApi();
  const response = await api.post<VlmResponse<BillingQuoteResponse>>(`${baseUri}/quotes`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: payload,
  });
  if (!response.data) {
    throw new Error('Billing quote response did not include data');
  }
  return response.data;
}

export async function convertCreditsToCurrency(
  payload: CreditConversionRequest
): Promise<CreditConversionResponse> {
  const api = await virtualLabRootApi();
  const response = await api.post<VlmResponse<CreditConversionResponse>>(
    `${baseUri}/credit-conversions`,
    {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: payload,
    }
  );
  if (!response.data) {
    throw new Error('Credit conversion response did not include data');
  }
  return response.data;
}
