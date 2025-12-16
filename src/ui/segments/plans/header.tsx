import Link from 'next/link';

import { RiInformation2Line } from '@remixicon/react';
import { Tooltip } from 'antd';

import { PlanV2, AdvantagesProps } from '@/types/virtual-lab/pricing';
import SubscriptionToggle from '@/ui/segments/plans/subscription-toggle';
import SubscriptionsCosts from '@/ui/segments/plans/subscriptions-costs';

export default function PlanHeader({
  plan,
  billingInterval,
  setBillingInterval,
}: {
  plan: PlanV2;
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
}) {
  return (
    <header className="relative flex h-[260px] w-full flex-col justify-between">
      <div>
        <div>
          <div className="flex flex-row items-center" style={{ justifyContent: 'space-between' }}>
            <div className="font-serif text-4xl font-normal">{plan.name}</div>
            {plan.has_subscription && (
              <SubscriptionToggle billingInterval={billingInterval} setBillingInterval={setBillingInterval} />
            )}
          </div>
          {plan.has_subtitle && <div className="text-lg font-normal">{plan.subtitle}</div>}
        </div>
        {plan.has_subscription && <SubscriptionsCosts billingInterval={billingInterval} plan={plan} />}
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
      {plan.advantages && plan.advantages.length > 0 && (
        <div className="flex flex-col gap-1">
          {plan.advantages.map((advantage: AdvantagesProps) => (
            <div
              key={advantage.title}
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
        </div>
      )}
    </header>
  );
}
