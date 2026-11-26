import { JobsList } from '@/admin/sections/accounting/ui/jobs-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingJobsPage() {
  await requireCapability('accounting.admin');
  return <JobsList />;
}
