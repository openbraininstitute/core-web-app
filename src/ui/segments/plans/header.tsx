import { RiInformation2Line } from '@remixicon/react';
import { Tooltip } from 'antd';
import Link from 'next/link';

import SubscriptionToggle from '@/ui/segments/plans/subscription-toggle';
import SubscriptionsCosts from '@/ui/segments/plans/subscriptions-costs';

import type { AdvantagesProps, PlanV2 } from '@/types/virtual-lab/pricing';

export default function PlanHeader({
  plan,
  billingInterval,
  setBillingInterval,
}: {
  plan: PlanV2;
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
}) {
  const displayedFeatures = plan.has_subscription
    ? ((billingInterval === 'month'
        ? plan.monthly_subscriptions[0]?.features
        : plan.yearly_subscriptions[0]?.features) ?? [])
    : [];
  const advantages = plan.advantages ?? [];

  return (
    <header className="relative flex h-[260px] w-full flex-col justify-between">
      <div>
        <div>
          <div className="flex flex-row items-center" style={{ justifyContent: 'space-between' }}>
            <div className="font-serif text-4xl font-normal">{plan.name}</div>
            {plan.has_subscription && (
              <SubscriptionToggle
                billingInterval={billingInterval}
                setBillingInterval={setBillingInterval}
              />
            )}
          </div>
          {plan.has_subtitle && <div className="text-lg font-normal">{plan.subtitle}</div>}
        </div>
        {plan.has_subscription && (
          <SubscriptionsCosts billingInterval={billingInterval} plan={plan} />
        )}
      </div>
      {plan.has_contact_button && (
        <div className="w-full">
          <Link
            href="mailto:subscription@openbraininstitute.org"
            className="text-primary border-primary block w-full border py-4 text-center text-base"
          >
            Contact Us
          </Link>
        </div>
      )}
      {(displayedFeatures.length > 0 || advantages.length > 0) && (
        <div className="flex flex-col gap-1">
          {displayedFeatures.map((advantage: AdvantagesProps) => (
            <div
              key={`feature-${advantage.title}`}
              className="text-primary-9 flex items-center gap-2 text-lg font-normal"
            >
              <div>+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line className="text-primary-9 size-5" />
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
          {advantages.map((advantage: AdvantagesProps) => (
            <div
              key={`advantage-${advantage.title}`}
              className="text-primary-9 flex items-center gap-2 text-lg font-normal"
            >
              <div className="mr-2">+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line className="text-primary-9 size-5" />
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
