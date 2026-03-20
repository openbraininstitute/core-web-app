import { virtualLabRootApi } from '../utils';

import type { RedeemPromotionCodeRequest, VlmPromotionResponse } from './types';

const baseUri = '/promotions';

export async function redeemPromotionCode({ payload }: { payload: RedeemPromotionCodeRequest }) {
  const api = await virtualLabRootApi();
  return await api.post<VlmPromotionResponse>(`${baseUri}/redeem`, {
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: { ...payload },
  });
}
