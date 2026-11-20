'use client';

import { useRouter } from 'next/navigation';

import { adminQueryKeys } from '../../../query-keys';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { adminHref } from '../../../shell/admin-link';
import { listVlabAccounts } from '../api';
import { creditsColumn } from './columns';
import { useEnabledFilter, useNameFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TVlabAccount } from '../types';

const LABS_SOURCE = pagedSource(listVlabAccounts);

export function EnabledPill({ enabled }: { enabled: boolean }) {
  return enabled ? null : <StatusPill tone="bad">Disabled</StatusPill>;
}

const COLUMNS: Array<ISimpleColumn<TVlabAccount>> = [
  {
    id: 'name',
    header: 'Virtual lab',
    width: { flex: 3, minWidth: 260 },
    renderCell: (account) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{account.name}</span>
        <EnabledPill enabled={account.enabled} />
      </span>
    ),
  },
  creditsColumn('balance', 'Balance', (account) => account.balance),
  {
    id: 'created_at',
    header: 'Created',
    width: { flex: 1, minWidth: 180 },
    getValue: (account) => formatDateTime(account.created_at),
  },
];

export function AccountsList() {
  const router = useRouter();
  const name = useNameFilter();
  const enabled = useEnabledFilter();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Accounts">
        Virtual lab accounts in accounting. Open one for its projects, jobs and journal.
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {name.control}
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
        params={{
          name: name.name,
          enabled: enabled.enabled,
        }}
        onRowClick={(account) => router.push(adminHref('account', account.id))}
      />
    </div>
  );
}
