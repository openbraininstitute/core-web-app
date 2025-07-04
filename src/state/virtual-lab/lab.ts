import { RefObject } from 'react';
import { PrimitiveAtom, atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh, atomWithReset } from 'jotai/utils';
import isEqual from 'lodash/isEqual';
import isNil from 'lodash/isNil';

import sessionAtom from '@/state/session';
import { getVirtualLabsOfUser, getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { VirtualLabAPIListData } from '@/types/virtual-lab/common';
import { getVirtualLabPaymentMethods } from '@/services/virtual-lab/billing';
import { PaymentMethod } from '@/types/virtual-lab/billing';
import { readAtomFamilyWithExpiration } from '@/util/atoms';
import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import {
  MembersResponse,
  VirtualLab,
  VirtualLabResponseData,
  VlmUserStatsResponse,
  VlmVirtualLabStatsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { getUserStats, getVirtualLabStats } from '@/api/virtual-lab-svc/queries/stats';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { tryCatch } from '@/api/utils';

export const virtualLabDetailAtomFamily = atomFamily<
  string | undefined,
  PrimitiveAtom<Promise<VirtualLabResponseData | null>>
>((virtualLabId?: string) =>
  atomWithDefault(async () => {
    if (isNil(virtualLabId)) return null;
    const response = await getVirtualLab(virtualLabId);
    return response.data;
  })
);

export const virtualLabMembersAtomFamily = atomFamily((virtualLabId?: string) =>
  atomWithRefresh<Promise<MembersResponse | null>>(async () => {
    if (!virtualLabId) return null;
    const response = await listVirtualLabMembers({ virtualLabId });
    return response;
  })
);

const transactionFormStateAtom = atomWithReset<{
  credit: string;
  selectedPaymentMethodId?: string;
  loading: boolean;
  errors?: {
    credit?: string[] | undefined;
    selectedPaymentMethodId?: string[] | undefined;
    defaultPaymentMethodId?: string[] | undefined;
  };
}>({
  credit: '',
  loading: false,
  errors: undefined,
  selectedPaymentMethodId: undefined,
});

const virtualLabPaymentMethodsAtomFamily = atomFamily((virtualLabId: string) =>
  atomWithRefresh<Promise<Array<PaymentMethod> | undefined>>(async (get) => {
    const session = get(sessionAtom);
    if (!session) {
      return;
    }
    const response = await getVirtualLabPaymentMethods(virtualLabId, session.accessToken);
    return response.data.payment_methods;
  })
);

// TODO: cleanup
// export const virtualLabBalanceAtomFamily = atomFamily((virtualLabId: string) =>
//   atomWithRefresh<Promise<VlabBalance | undefined>>(async (get) => {
//     const session = get(sessionAtom);
//     if (!session) {
//       return;
//     }
//     const response = await getVirtualLabBalanceDetails(virtualLabId, session.accessToken);
//     return response.data;
//   })
// );

export const virtualLabsOfUserAtom = atomWithRefresh<
  Promise<VirtualLabAPIListData<VirtualLab> | undefined>
>(async () => {
  const response = await getVirtualLabsOfUser();
  return response.data;
});

export const projectTopMenuRefAtom = atom<RefObject<HTMLDivElement | null> | null>(null);

const userVirtualLabTotalsAtom = atom<Promise<number | undefined>>(async (get) => {
  const session = get(sessionAtom);
  if (!session) {
    return;
  }
  const virtualLabs = await get(virtualLabsOfUserAtom);
  return virtualLabs?.total || 0;
});

export const virtualLabBalanceRefreshTriggerAtom = atom(0);
export const refreshBalanceAtom = atom(null, (get, set) =>
  set(virtualLabBalanceRefreshTriggerAtom, (prev) => prev + 1)
);

export const virtualLabBalanceAtomFamily = readAtomFamilyWithExpiration(
  ({ virtualLabId }: { virtualLabId?: string }) =>
    atom(async (get) => {
      if (!virtualLabId) return;

      get(virtualLabBalanceRefreshTriggerAtom);

      return getVirtualLabAccountBalance({ virtualLabId, includeProjects: true });
    }),
  { ttl: 20_000, areEqual: isEqual }
);

export const virtualLabStatsAtomFamily = atomFamily((virtualLabId: string) =>
  atomWithRefresh<Promise<VlmVirtualLabStatsResponse | null>>(async () => {
    const { data } = await tryCatch(getVirtualLabStats(virtualLabId), undefined, {
      section: 'virtual-lab-stats-family',
      feature: 'get-virtual-lab-stats',
    });
    return data;
  })
);

export const userStatsAtom = atomWithRefresh<Promise<VlmUserStatsResponse | null>>(async () => {
  const { data } = await tryCatch(getUserStats());
  return data;
});
