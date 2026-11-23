import { match } from 'ts-pattern';

import { PageHeader } from '../../shared/page-header';
import { JobOutcome } from './job';
import { JobDetail } from './job-detail';
import { JobIdSearch } from './job-id-search';

import type { TJobLookup } from './job';

function lookupMessage(lookup: Exclude<TJobLookup, { outcome: typeof JobOutcome.Found }>) {
  return match(lookup)
    .with({ outcome: JobOutcome.InvalidId }, () => 'Enter a full job ID.')
    .with(
      { outcome: JobOutcome.NotFound },
      () => 'Launch system on cell A has no job with this ID. Jobs on cell B can’t be looked up.'
    )
    .with(
      { outcome: JobOutcome.Denied },
      () => 'Launch system refused your account. A new group can take 5 minutes to reach it.'
    )
    .with(
      { outcome: JobOutcome.NoAnswer },
      () => 'Launch system didn’t answer. Try again in a moment.'
    )
    .with(
      { outcome: JobOutcome.NotReachable },
      ({ status }) =>
        `Launch system isn’t reachable from this server (${status}). It answers only the deployed web app.`
    )
    .with(
      { outcome: JobOutcome.Failed },
      ({ status, message }) => `Launch system answered ${status}. ${message ?? ''}`
    )
    .exhaustive();
}

export function JobLookupView({ lookup }: { lookup: TJobLookup | null }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Job lookup">
        Finds a launch system job on cell A by its ID. Launch system has no job list and no way for
        an operator to cancel a job.
      </PageHeader>
      <JobIdSearch />
      {lookup?.outcome === JobOutcome.Found ? (
        <JobDetail job={lookup.job} />
      ) : (
        <p className="text-neutral-4">
          {lookup ? lookupMessage(lookup) : 'Enter a job ID to look it up.'}
        </p>
      )}
    </div>
  );
}
