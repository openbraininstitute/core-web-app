import { PageHeader } from '../../shared/page-header';
import { JobDetail } from './job-detail';
import { JobIdSearch } from './job-id-search';

import type { JobLookup } from './job';

function lookupMessage(lookup: Exclude<JobLookup, { outcome: 'found' }>) {
  switch (lookup.outcome) {
    case 'invalid-id':
      return 'Enter a full job ID.';
    case 'not-found':
      return 'Launch system on cell A has no job with this ID. Jobs on cell B can’t be looked up.';
    case 'denied':
      return 'Launch system refused your account. A new group can take 5 minutes to reach it.';
    case 'no-answer':
      return 'Launch system didn’t answer. Try again in a moment.';
    case 'not-reachable':
      return `Launch system isn’t reachable from this server (${lookup.status}). It answers only the deployed web app.`;
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
