import { Metadata } from 'next';
import SubscriptionHistory from '@/components/VirtualLab/create-entity-flows/subscription/history';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'View your subscription invoices',
};

export const dynamic = 'force-dynamic';

export default function History() {
  return (
    <div className="mt-5 space-y-6">
      <SubscriptionHistory />
    </div>
  );
}
