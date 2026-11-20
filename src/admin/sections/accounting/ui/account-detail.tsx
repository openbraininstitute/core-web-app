'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { Loaded } from '../../../shared/load-state';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { getAccount, listProjectAccounts } from '../api';
import { ACCOUNT_TYPE_LABELS, accountingHref } from '../helpers';
import { AccountingPage, AccountType } from '../types';
import { EnabledPill } from './accounts-list';
import { Credits } from './cells';
import { creditsColumn } from './columns';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TAccount, TProjectAccount } from '../types';

const PROJECTS_SOURCE = pagedSource(listProjectAccounts);

const PROJECT_COLUMNS: Array<ISimpleColumn<TProjectAccount>> = [
  {
    id: 'name',
    header: 'Project',
    width: { flex: 3, minWidth: 240 },
    renderCell: (project) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{project.name}</span>
        <EnabledPill enabled={project.enabled} />
      </span>
    ),
  },
  creditsColumn('balance', 'Balance', (project) => project.balance),
  creditsColumn('reservation', 'Reserved', (project) => project.reservation),
  {
    id: 'created_at',
    header: 'Created',
    width: { flex: 1, minWidth: 180 },
    getValue: (project) => formatDateTime(project.created_at),
  },
];

function accountLinks({ id, account_type: type }: TAccount) {
  const journal = {
    label: 'Journal',
    href: accountingHref(AccountingPage.Journal, { account: id }),
  };
  if (type === AccountType.VirtualLab) {
    return [
      { label: 'Jobs', href: accountingHref(AccountingPage.Jobs, { vlab: id }) },
      journal,
      { label: 'Report', href: accountingHref(AccountingPage.Reports, { vlab: id }) },
    ];
  }
  if (type === AccountType.Project) {
    return [
      { label: 'Jobs', href: accountingHref(AccountingPage.Jobs, { project: id }) },
      journal,
      { label: 'Report', href: accountingHref(AccountingPage.Reports, { project: id }) },
    ];
  }
  return [journal];
}

function AccountView({ account }: { account: TAccount }) {
  const router = useRouter();
  const isLab = account.account_type === AccountType.VirtualLab;
  const isProject = account.account_type === AccountType.Project;

  return (
    <>
      <PageHeader
        title={account.name}
        parent={{ label: 'Accounts', href: accountingHref(AccountingPage.Accounts) }}
        actions={accountLinks(account).map((link) => (
          <Button key={link.label} rounded variant="outline" size="sm" asChild>
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
      />
      <DetailList>
        <Detail label="Account">
          <DetailId>{account.id}</DetailId>
        </Detail>
        <Detail label="Type">{ACCOUNT_TYPE_LABELS[account.account_type]}</Detail>
        <Detail label="Balance">
          <Credits amount={account.balance} />
        </Detail>
        <Detail label="State">
          {account.enabled ? 'Enabled' : <EnabledPill enabled={false} />}
        </Detail>
        <Detail label="Parent account">
          {account.parent_id && <AdminLink kind="account" id={account.parent_id} />}
        </Detail>
        {(isLab || isProject) && (
          <CapabilityGate need="virtualLab.read">
            <Detail label="On the platform">
              <AdminLink kind={isLab ? 'vlab' : 'project'} id={account.id} />
            </Detail>
          </CapabilityGate>
        )}
        <Detail label="Created">{formatDateTime(account.created_at)}</Detail>
        <Detail label="Updated">{formatDateTime(account.updated_at)}</Detail>
      </DetailList>
      {isLab && (
        <>
          <h2 className="text-primary-9 font-semibold">Projects</h2>
          <AdminPagedGrid<TProjectAccount>
            what="projects"
            columns={PROJECT_COLUMNS}
            getRowId={(project) =>
              `${project.id}:${project.name}:${project.balance}:${project.reservation}:${project.enabled}`
            }
            dataSource={PROJECTS_SOURCE}
            queryKey={adminQueryKeys.accountingProjects(account.id)}
            params={{ vlabId: account.id }}
            onRowClick={(project) => router.push(adminHref('account', project.id))}
          />
        </>
      )}
    </>
  );
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const query = useQuery({
    queryKey: adminQueryKeys.accountingAccount(accountId),
    queryFn: ({ signal }) => getAccount(accountId, signal),
  });

  return (
    <div className="flex flex-col gap-4">
      <Loaded query={query} what="the account">
        {(account) => <AccountView account={account} />}
      </Loaded>
    </div>
  );
}
