'use client';

import { adminQueryKeys } from '../../../shared/query-keys';
import { useAdminWrite } from '../../../shared/use-admin-write';

import type { AdminWriteOptions } from '../../../shared/use-admin-write';

// Labs, projects, members and users all show each other's data, so a write refreshes them all.
export const useTenancyWrite = <Args>(options: AdminWriteOptions<Args>) =>
  useAdminWrite({ ...options, refreshes: adminQueryKeys.tenancy() });
