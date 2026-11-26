'use client';

import { Input } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { isUuid } from '@/features/data-grid/react/filters/id-tokens';

import { adminQueryKeys } from '../../../query-keys';
import { useDayRange } from '../../../shared/day';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { listJobs } from '../api';
import { dayBounds, SERVICE_TYPE_OPTIONS, SUBTYPE_OPTIONS } from '../helpers';
import { AccountingFilter, JobStatusFilter } from '../types';
import { JobPhasePill } from './cells';
import { useIdFilter, useOptionFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TAccountingJob, TJobFilters, TJobStatusFilter } from '../types';

const JOBS_SOURCE = pagedSource(listJobs);

const STATUS_OPTIONS: Array<{ value: TJobStatusFilter; label: string }> = [
  { value: JobStatusFilter.Open, label: 'Open' },
  { value: JobStatusFilter.Finished, label: 'Finished' },
  { value: JobStatusFilter.Cancelled, label: 'Cancelled' },
];

const COLUMNS: Array<ISimpleColumn<TAccountingJob>> = [
  {
    id: 'job',
    header: 'Job',
    width: { flex: 2, minWidth: 220 },
    renderCell: (job) => (
      <span className="flex min-w-0 flex-col">
        <span className="text-primary-9 truncate font-semibold">{job.name ?? job.id}</span>
        <span className="text-neutral-4 truncate text-sm">{job.service_subtype}</span>
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 120 },
    renderCell: (job) => <JobPhasePill job={job} />,
  },
  {
    id: 'project',
    header: 'Project',
    width: { width: 120 },
    renderCell: (job) => <AdminLink kind="account" id={job.proj_id} />,
  },
  {
    id: 'started_at',
    header: 'Started',
    width: { width: 170 },
    getValue: (job) => formatDateTime(job.started_at),
  },
  {
    id: 'ended',
    header: 'Ended',
    width: { flex: 1, minWidth: 170 },
    getValue: (job) => formatDateTime(job.finished_at ?? job.cancelled_at),
  },
];

export function JobsList() {
  const router = useRouter();
  const [badId, setBadId] = useState(false);
  const vlab = useIdFilter(AccountingFilter.Vlab, 'Virtual lab');
  const project = useIdFilter(AccountingFilter.Project, 'Project');
  const type = useOptionFilter({
    key: 'type',
    placeholder: 'Any type',
    options: SERVICE_TYPE_OPTIONS,
    width: 'w-40!',
  });
  const subtype = useOptionFilter({
    key: 'subtype',
    placeholder: 'Any service',
    options: SUBTYPE_OPTIONS,
  });
  const status = useOptionFilter({
    key: 'status',
    placeholder: 'Any status',
    options: STATUS_OPTIONS,
    width: 'w-40!',
  });
  const range = useDayRange();
  const bounds = dayBounds(range.from, range.to);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Jobs"
        actions={
          <Input.Search
            allowClear
            placeholder="Open a job by its full id"
            status={badId ? 'error' : undefined}
            title={badId ? 'Paste the whole job id' : undefined}
            onChange={() => setBadId(false)}
            onSearch={(value) => {
              const id = value.trim();
              if (isUuid(id)) router.push(adminHref('accountingJob', id));
              else setBadId(id !== '');
            }}
            className="w-80!"
          />
        }
      >
        Jobs as accounting charges them. The dates filter on when a job started.
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {vlab.control}
        {project.control}
        {type.control}
        {subtype.control}
        {status.control}
        {range.control}
      </div>
      <AdminPagedGrid<TAccountingJob>
        fill
        what="jobs"
        columns={COLUMNS}
        getRowId={(job) => `${job.id}:${job.updated_at}`}
        dataSource={JOBS_SOURCE}
        queryKey={adminQueryKeys.accountingJobs()}
        params={
          {
            vlab_id: vlab.id,
            proj_id: project.id,
            service_type: type.value,
            service_subtype: subtype.value,
            status: status.value,
            started_after: bounds.after,
            started_before: bounds.before,
          } satisfies TJobFilters
        }
        onRowClick={(job) => router.push(adminHref('accountingJob', job.id))}
      />
    </div>
  );
}
