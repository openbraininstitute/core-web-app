import { JobLookupView } from '@/admin/sections/launch-system/job-lookup';
import { lookupJob } from '@/admin/server/launch-system';
import { requireCapability } from '@/admin/server/require-capability';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  await requireCapability('launchSystem.admin');
  const { id } = await searchParams;
  const jobId = typeof id === 'string' ? id.trim() : '';

  return <JobLookupView lookup={jobId ? await lookupJob(jobId) : null} />;
}
