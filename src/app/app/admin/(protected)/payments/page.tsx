import { PaymentsList } from '@/admin/sections/virtual-lab/ui/payments-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function PaymentsPage() {
  await requireCapability('virtualLab.read');
  return <PaymentsList />;
}
