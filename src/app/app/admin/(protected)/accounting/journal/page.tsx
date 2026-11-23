import { JournalList } from '@/admin/sections/accounting/ui/journal-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingJournalPage() {
  await requireCapability('accounting.admin');
  return <JournalList />;
}
