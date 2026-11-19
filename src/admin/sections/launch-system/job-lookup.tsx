import { JobStatusDict } from '@/features/task-logs-stream/types';
import { CodeBlock, CodeBlockCopyButton } from '@/ui/molecules/code-blocks';

import { Detail, DetailId, DetailList } from '../../shared/detail-list';
import { formatDateTime } from '../../shared/format';
import { PageHeader } from '../../shared/page-header';
import { StatusPill } from '../../shared/status-pill';
import { AdminLink } from '../../shell/admin-link';
import { JobIdSearch } from './job-id-search';

import type { TJobStatus } from '@/features/task-logs-stream/types';
import type { TStatusTone } from '../../shared/status-pill';
import type { JobLookup, LaunchSystemJob } from './job';

const STATUS_TONES: Record<TJobStatus, TStatusTone> = {
  [JobStatusDict.Created]: 'neutral',
  [JobStatusDict.Pending]: 'neutral',
  [JobStatusDict.Running]: 'warn',
  [JobStatusDict.Done]: 'good',
  [JobStatusDict.Error]: 'bad',
  [JobStatusDict.Cancelled]: 'neutral',
};

const when = (iso: string | null) => iso && formatDateTime(iso);

function JobDetail({ job }: { job: LaunchSystemJob }) {
  const { code, resources, meta, logs } = job;

  return (
    <>
      <DetailList>
        <Detail label="Job">
          <DetailId>{job.id}</DetailId>
        </Detail>
        <Detail label="Status">
          <StatusPill tone={STATUS_TONES[job.status] ?? 'neutral'}>{job.status}</StatusPill>
        </Detail>
        <Detail label="Error">{job.error_reason}</Detail>
        <Detail label="User">
          <AdminLink kind="user" id={job.user_id} />
        </Detail>
        <Detail label="Virtual lab">
          <AdminLink kind="vlab" id={job.virtual_lab_id} />
        </Detail>
        <Detail label="Project">
          <AdminLink kind="project" id={job.project_id} />
        </Detail>
        <Detail label="Created">{when(job.creation_date)}</Detail>
        <Detail label="Started">{when(job.start_time)}</Detail>
        <Detail label="Ended">{when(job.end_time)}</Detail>
        <Detail label="Updated">{when(job.update_date)}</Detail>
        <Detail label="Code">{code.type}</Detail>
        <Detail label="Resources">{resources.type}</Detail>
        <Detail label="Ran on">{meta?.type}</Detail>
        <Detail label="Inputs">
          {job.inputs.length > 0 && (
            <ul className="flex flex-col gap-1">
              {job.inputs.map((input) => (
                <li key={input} className="font-mono text-sm break-all">
                  {input}
                </li>
              ))}
            </ul>
          )}
        </Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Code, resources, task and logs</h2>
      <CodeBlock
        language="json"
        code={JSON.stringify({ code, resources, meta, logs }, null, 2)}
        scrollableX
        className="border-neutral-2 rounded-lg border"
      >
        <CodeBlockCopyButton aria-label="Copy" className="absolute top-2 right-2 z-10" />
      </CodeBlock>
    </>
  );
}

function lookupMessage(lookup: Exclude<JobLookup, { outcome: 'found' }>) {
  switch (lookup.outcome) {
    case 'invalid-id':
      return 'Enter a full job ID.';
    case 'not-found':
      return 'Launch system on cell A has no job with this ID. Jobs on cell B can’t be looked up.';
    case 'denied':
      return 'Launch system refused your account. A new group can take 5 minutes to reach it.';
    case 'not-reachable':
      return `Launch system isn’t reachable from this server${lookup.status ? ` (${lookup.status})` : ''}. It answers only the deployed web app.`;
    case 'failed':
      return `Launch system answered ${lookup.status}. ${lookup.message ?? ''}`;
  }
}

// `null` until an id is entered.
export function JobLookupView({ lookup }: { lookup: JobLookup | null }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Job lookup">
        Finds a launch system job on cell A by its ID. Launch system has no job list and no way for
        an operator to cancel a job.
      </PageHeader>
      <JobIdSearch />
      {lookup?.outcome === 'found' ? (
        <JobDetail job={lookup.job} />
      ) : (
        <p className="text-neutral-4">
          {lookup ? lookupMessage(lookup) : 'Enter a job ID to look it up.'}
        </p>
      )}
    </div>
  );
}
