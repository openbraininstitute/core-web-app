import { useQuery } from '@tanstack/react-query';

import { adminQueryKeys } from '../../../query-keys';
import { getAccount } from '../api';

export const useAccount = (accountId?: string) =>
  useQuery({
    queryKey: adminQueryKeys.accountingAccount(accountId ?? ''),
    queryFn: ({ signal }) => getAccount(accountId ?? '', signal),
    enabled: !!accountId,
  });
