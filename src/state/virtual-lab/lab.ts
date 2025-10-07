import { RefObject } from 'react';
import { PrimitiveAtom, atom } from 'jotai';
import { atomFamily, atomWithDefault, atomWithRefresh } from 'jotai/utils';
import isEqual from 'es-toolkit/compat/isEqual';
import isNil from 'es-toolkit/compat/isNil';

import { getVirtualLabsOfUser, getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { VirtualLabAPIListData } from '@/types/virtual-lab/common';
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

export const virtualLabsOfUserAtom = atomWithRefresh<
  Promise<VirtualLabAPIListData<VirtualLab> | undefined>
>(async () => {
  const response = await getVirtualLabsOfUser();
  return response.data;
});

export const projectTopMenuRefAtom = atom<RefObject<HTMLDivElement | null> | null>(null);

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
