'use client';

import { adminQueryKeys } from '../../../shared/query-keys';
import { useAdminWrite } from '../../../shared/use-admin-write';

import type { AdminWriteOptions } from '../../../shared/use-admin-write';

export const useBillingWrite = <Args>(options: AdminWriteOptions<Args>) =>
  useAdminWrite({ ...options, refreshes: adminQueryKeys.billing() });
