import User from '@/components/VirtualLab/subscription-billing/user';
import BuyCredits from '@/components/VirtualLab/subscription-billing/buy-credits';
import SubscriptionStatus from '@/components/VirtualLab/subscription-billing/subscription-status';
import CurrentBalance from '@/components/VirtualLab/subscription-billing/current-balance';
import BillingTable from '@/components/VirtualLab/subscription-billing/billing-table';

export default function Page() {
  return (
    <div className="min-h-screen w-full font-sans text-white antialiased">
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        <User />
        <SubscriptionStatus />
        <CurrentBalance />
        <BuyCredits />
        <BillingTable />
      </div>
    </div>
  );
}
