'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { Button } from '@/ui/molecules/button';
import { CodeBlock, CodeBlockCopyButton } from '@/ui/molecules/code-blocks';

import { adminQueryKeys } from '../../../query-keys';
import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { formatDateTime } from '../../../shared/format';
import { AdminRowsGrid } from '../../../shared/grid';
import { Loaded } from '../../../shared/load-state';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { getJob } from '../api';
import { accountingHref } from '../helpers';
import { AccountingPage } from '../types';
import { Credits, JOURNAL_COLUMNS, JobPhasePill, journalRowId } from './columns';

import type { TAccountingJobDetail } from '../types';

const when = (iso: string | null) => iso && formatDateTime(iso);

function JobView({ job }: { job: TAccountingJobDetail }) {
  return (
    <>
      <PageHeader
        title={job.name ?? `Job ${job.id.slice(0, 8)}`}
        parent={{ label: 'Jobs', href: accountingHref(AccountingPage.Jobs) }}
        actions={
          <Button rounded variant="outline" size="sm" asChild>
            <Link href={accountingHref(AccountingPage.Journal, { job: job.id })}>Journal</Link>
          </Button>
        }
      />
      <DetailList>
        <Detail label="Job">
          <DetailId>{job.id}</DetailId>
        </Detail>
        <Detail label="Status">
          <JobPhasePill job={job} />
        </Detail>
        <Detail label="Service">
          {job.service_type} / {job.service_subtype}
        </Detail>
        <Detail label="Virtual lab account">
          <AdminLink kind="account" id={job.vlab_id} />
        </Detail>
        <Detail label="Project account">
          <AdminLink kind="account" id={job.proj_id} />
        </Detail>
        <Detail label="User">
          {job.user_id && (
            <CapabilityGate need="virtualLab.read" fallback={<DetailId>{job.user_id}</DetailId>}>
              <AdminLink kind="user" id={job.user_id} />
            </CapabilityGate>
          )}
        </Detail>
        <Detail label="Group">{job.group_id && <DetailId>{job.group_id}</DetailId>}</Detail>
        <Detail label="Charged">
          <Credits amount={job.total_charged} />
        </Detail>
        <Detail label="Refunded">
          <Credits amount={job.total_refunded} />
        </Detail>
        <Detail label="Still reserved">
          <Credits amount={job.remaining_reservation} />
        </Detail>
        <Detail label="Created">{when(job.created_at)}</Detail>
        <Detail label="Reserved">{when(job.reserved_at)}</Detail>
        <Detail label="Started">{when(job.started_at)}</Detail>
        <Detail label="Last alive">{when(job.last_alive_at)}</Detail>
        <Detail label="Last charged">{when(job.last_charged_at)}</Detail>
        <Detail label="Finished">{when(job.finished_at)}</Detail>
        <Detail label="Cancelled">{when(job.cancelled_at)}</Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Journal, oldest first</h2>
      <AdminRowsGrid
        what="journal entries"
        columns={JOURNAL_COLUMNS.filter((column) => column.id !== 'job_id')}
        rows={job.journal}
        getRowId={journalRowId}
      />
      <h2 className="text-primary-9 font-semibold">Reservation and usage parameters</h2>
      <CodeBlock
        language="json"
        code={JSON.stringify(
          { reservation_params: job.reservation_params, usage_params: job.usage_params },
          null,
          2
        )}
        scrollableX
        className="border-neutral-2 rounded-lg border"
      >
        <CodeBlockCopyButton aria-label="Copy" className="absolute top-2 right-2 z-10" />
      </CodeBlock>
    </>
  );
}

export function AccountingJobDetail({ jobId }: { jobId: string }) {
  const query = useQuery({
    queryKey: adminQueryKeys.accountingJob(jobId),
    queryFn: ({ signal }) => getJob(jobId, signal),
  });

  return (
    <div className="flex flex-col gap-4">
      <Loaded query={query} what="the job">
        {(job) => <JobView job={job} />}
      </Loaded>
    </div>
  );
}
