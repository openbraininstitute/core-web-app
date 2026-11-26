'use client';

import { useRouter } from 'next/navigation';

import { adminQueryKeys } from '../../../query-keys';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminHref } from '../../../shell/admin-link';
import { useListFilters } from '../../virtual-lab/ui/list-filters';
import { listVlabAccounts } from '../api';
import { accountNameColumn, createdColumn, creditsColumn } from './columns';
import { useEnabledFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TVlabAccount, TVlabAccountFilters } from '../types';

const LABS_SOURCE = pagedSource(listVlabAccounts);

const COLUMNS: Array<ISimpleColumn<TVlabAccount>> = [
  accountNameColumn('Virtual lab'),
  creditsColumn('balance', 'Balance', (account) => account.balance),
  createdColumn(),
];

export function AccountsList() {
  const router = useRouter();
  const search = useListFilters({ placeholder: 'Search by name' });
  const enabled = useEnabledFilter();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Accounts">
        Virtual lab accounts in accounting. Open one for its projects, jobs and journal.
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {search.controls}
        {enabled.control}
      </div>
      <AdminPagedGrid<TVlabAccount>
        fill
        what="accounts"
        columns={COLUMNS}
        getRowId={(account) =>
          `${account.id}:${account.name}:${account.balance}:${account.enabled}`
        }
        dataSource={LABS_SOURCE}
        queryKey={adminQueryKeys.accountingLabs()}
        params={
          {
            name: search.params.query,
            enabled: enabled.enabled,
          } satisfies TVlabAccountFilters
        }
        onRowClick={(account) => router.push(adminHref('account', account.id))}
      />
    </div>
  );
}
