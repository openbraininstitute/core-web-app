import { AccountingJobDetail } from '@/admin/sections/accounting/ui/job-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  await requireCapability('accounting.admin');
  const { jobId } = await params;
  return <AccountingJobDetail jobId={jobId} />;
}
