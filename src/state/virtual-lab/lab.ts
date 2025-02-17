import { RefObject } from 'react';
import { PrimitiveAtom, atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh, atomWithReset } from 'jotai/utils';
import fastDeepEqual from 'fast-deep-equal';

import sessionAtom from '../session';

import {
  getVirtualLabDetail,
  getVirtualLabUsers,
  getVirtualLabsOfUser,
  getPlans,
  getVirtualLabAccountBalance,
} from '@/services/virtual-lab/labs';
import { VirtualLab } from '@/types/virtual-lab/lab';
import { VirtualLabAPIListData } from '@/types/virtual-lab/common';
import { VirtualLabMember } from '@/types/virtual-lab/members';
import { getVirtualLabPaymentMethods } from '@/services/virtual-lab/billing';
import { PaymentMethod } from '@/types/virtual-lab/billing';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

export const virtualLabDetailAtomFamily = atomFamily<
  string | undefined,
  PrimitiveAtom<Promise<VirtualLab | null>>
>((virtualLabId) =>
  atomWithDefault(async () => {
    if (!virtualLabId) return null;
    const response = await getVirtualLabDetail(virtualLabId);
    return response?.data.virtual_lab ?? null;
  })
);

export const virtualLabMembersAtomFamily = atomFamily((virtualLabId?: string) =>
  atomWithRefresh<Promise<VirtualLabMember[] | null>>(async () => {
    if (!virtualLabId) return null;
    const response = await getVirtualLabUsers(virtualLabId);
    return response.data.users;
  })
);

export const transactionFormStateAtom = atomWithReset<{
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

export const virtualLabPaymentMethodsAtomFamily = atomFamily((virtualLabId: string) =>
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

export const projectTopMenuRefAtom = atom<RefObject<HTMLDivElement> | null>(null);

export const userVirtualLabTotalsAtom = atom<Promise<number | undefined>>(async (get) => {
  const session = get(sessionAtom);
  if (!session) {
    return;
  }
  const virtualLabs = await get(virtualLabsOfUserAtom);
  return virtualLabs?.total || 0;
});

export const virtualLabPlansAtom = atom<
  Promise<
    | Array<{
        id: number;
        name: string;
        price: number;
        features: Record<string, Array<string>>;
      }>
    | undefined
  >
>(async () => {
  const { data } = await getPlans();
  const { all_plans: allPlans } = data;

  return allPlans;
});

export const virtualLabBalanceRefreshTriggerAtom = atom(0);
export const refreshBalanceAtom = atom(null, (get, set) => {
  console.log('refreshBalanceAtom');
  set(virtualLabBalanceRefreshTriggerAtom, (prev) => prev + 1);
});

export const virtualLabBalanceAtomFamily = readAtomFamilyWithExpiration(
  ({ virtualLabId }: { virtualLabId: string }) =>
    atom(async (get) => {
      get(virtualLabBalanceRefreshTriggerAtom);

      return getVirtualLabAccountBalance({ virtualLabId, includeProjects: true });
    }),
  { ttl: 20_000, areEqual: fastDeepEqual }
);
