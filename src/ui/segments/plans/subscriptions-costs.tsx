import { PlanV2 } from '@/api/sanity/pricing/planv2';

export default function SubscriptionsCosts({
  subscription,
  plan,
}: {
  subscription: 'month' | 'year';
  plan: PlanV2;
}) {
  return (
    <div className="border-neutral-2 relative my-2 w-full border-y py-2">
      {subscription === 'month' ? (
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
