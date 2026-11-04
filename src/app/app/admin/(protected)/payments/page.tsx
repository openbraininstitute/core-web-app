import { requireCapability } from '@/admin/server/resolve';
import { PaymentsList } from '@/admin/services/virtual-lab/ui/payments-list';

export default async function PaymentsPage() {
  await requireCapability('virtualLab.read');
  return <PaymentsList />;
}
