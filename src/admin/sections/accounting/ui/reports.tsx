'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { match } from 'ts-pattern';

import { formatBytes } from '@/utils/format';

import { adminQueryKeys } from '../../../query-keys';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { getSystemBalance, listReport, reportPath } from '../api';
import { formatDuration } from '../helpers';
import { ChargeType } from '../types';
import { Credits, creditsColumn } from './columns';
import { useDayRange, useIdFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TJobReport } from '../types';

const REPORT_SOURCE = pagedSource(listReport);

const usage = (report: TJobReport) =>
  match(report)
    .with({ type: ChargeType.Oneshot }, ({ count }) => `${count} units`)
    .with({ type: ChargeType.Longrun }, ({ duration }) => formatDuration(duration))
    .with(
      { type: ChargeType.Storage },
      ({ size, duration }) => `${formatBytes(size)} for ${formatDuration(duration)}`
    )
    .exhaustive();

const COLUMNS: Array<ISimpleColumn<TJobReport>> = [
  {
    id: 'started_at',
    header: 'Started',
    width: { width: 170 },
    getValue: (report) => formatDateTime(report.started_at),
  },
  {
    id: 'service',
    header: 'Service',
    width: { flex: 2, minWidth: 220 },
    renderCell: (report) => (
      <span className="flex min-w-0 flex-col">
        <span className="text-primary-9 truncate">
          {'name' in report && report.name ? report.name : report.subtype}
        </span>
        <span className="text-neutral-4 truncate text-sm">{report.type}</span>
      </span>
    ),
  },
  {
    id: 'project',
    header: 'Project',
    width: { width: 120 },
    renderCell: (report) => <AdminLink kind="account" id={report.proj_id} />,
  },
  creditsColumn('amount', 'Charged', (report) => report.amount),
  creditsColumn('reserved', 'Reserved', (report) =>
    'reserved_amount' in report ? report.reserved_amount : undefined
  ),
  {
    id: 'usage',
    header: 'Usage',
    width: { flex: 1, minWidth: 160 },
    getValue: usage,
  },
];

function SystemBalance() {
  const { data } = useQuery({
    queryKey: adminQueryKeys.systemBalance(),
    queryFn: ({ signal }) => getSystemBalance(signal),
  });
  if (!data) return null;

  return (
    <span>
      System account balance: <Credits amount={data.balance} />
    </span>
  );
}

export function Reports() {
  const router = useRouter();
  const vlab = useIdFilter('vlab', 'Virtual lab');
  const project = useIdFilter('project', 'Project');
  const range = useDayRange();
  const path = reportPath({ vlabId: vlab.id, projectId: project.id });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Reports">
        Finished, fully charged jobs. Open an account to see the report for one lab or project.
        {!vlab.id && !project.id && (
          <>
            {' '}
            <SystemBalance />
          </>
        )}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {project.id ? project.control : vlab.control}
        {range.control}
      </div>
      <AdminPagedGrid<TJobReport>
        fill
        what="charged jobs"
        columns={COLUMNS}
        getRowId={(report) => report.job_id}
        dataSource={REPORT_SOURCE}
        queryKey={adminQueryKeys.accountingReport(path)}
        params={{
          path,
          started_after: range.bounds.after,
          started_before: range.bounds.before,
        }}
        onRowClick={(report) => router.push(adminHref('accountingJob', report.job_id))}
      />
    </div>
  );
}
