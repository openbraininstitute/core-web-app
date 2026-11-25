import { useQuery } from '@tanstack/react-query';

import { adminQueryKeys } from '../../../query-keys';
import { getAccount, listPricesFor } from '../api';
import { priceKey } from '../helpers';

import type { TPriceScope } from '../types';

export const useAccount = (accountId?: string) =>
  useQuery({
    queryKey: adminQueryKeys.accountingAccount(accountId ?? ''),
    queryFn: ({ signal }) => getAccount(accountId ?? '', signal),
    enabled: !!accountId,
  });

export const usePricesFor = (scope: TPriceScope) =>
  useQuery({
    queryKey: adminQueryKeys.accountingPricesFor(priceKey(scope)),
    queryFn: ({ signal }) => listPricesFor(scope, signal),
  });
