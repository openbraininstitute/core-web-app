import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

export default function SubscriptionsCosts({
  billingInterval,
  plan,
  isCurrentTier,
}: {
  billingInterval: 'month' | 'year';
  plan: PlanV2;
  isCurrentTier?: boolean;
}) {
  const borderColor = isCurrentTier ? 'border-primary-7' : 'border-neutral-2';

  return (
    <div className={cn('relative my-2 w-full border-y py-2', borderColor)}>
      {billingInterval === 'month' ? (
        <div>
          <span className="text-2xl font-bold">
            {plan.monthly_subscriptions[0].currency} {plan.monthly_subscriptions[0].price}
          </span>
          <span className="relative ml-2 text-base font-normal">
            / {plan.monthly_subscriptions[0].name}
          </span>{' '}
        </div>
      ) : (
        <div>
          <span className="text-2xl font-bold">
            {plan.yearly_subscriptions[0].currency} {plan.yearly_subscriptions[0].price}
          </span>
          <span className="relative ml-2 text-base font-normal">
            / {plan.yearly_subscriptions[0].name}
          </span>{' '}
        </div>
      )}
    </div>
  );
}
