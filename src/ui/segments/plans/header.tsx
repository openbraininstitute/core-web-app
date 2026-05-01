import { RiInformation2Line } from '@remixicon/react';
import { Tooltip } from 'antd';
import Link from 'next/link';

import SubscriptionToggle from '@/ui/segments/plans/subscription-toggle';
import SubscriptionsCosts from '@/ui/segments/plans/subscriptions-costs';
import { cn } from '@/utils/css-class';

import type { AdvantagesProps, PlanV2 } from '@/types/virtual-lab/pricing';

export default function PlanHeader({
  plan,
  billingInterval,
  setBillingInterval,
  dark,
  hideContactButton,
}: {
  plan: PlanV2;
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
  dark?: boolean;
  hideContactButton?: boolean;
}) {
  const displayedFeatures = plan.has_subscription
    ? ((billingInterval === 'month'
        ? plan.monthly_subscriptions[0]?.features
        : plan.yearly_subscriptions[0]?.features) ?? [])
    : [];
  const advantages = plan.advantages ?? [];

  const textColor = dark ? 'text-white' : 'text-primary-9';
  const iconColor = dark ? 'text-primary-4' : 'text-primary-9';

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
                dark={dark}
              />
            )}
          </div>
          {plan.has_subtitle && <div className="text-lg font-normal">{plan.subtitle}</div>}
        </div>
        {plan.has_subscription && (
          <SubscriptionsCosts billingInterval={billingInterval} plan={plan} dark={dark} />
        )}
      </div>
      {plan.has_contact_button && !hideContactButton && (
        <div className="w-full">
          <Link
            href="mailto:subscription@openbraininstitute.org"
            className={cn(
              'block w-full border py-4 text-center text-base',
              dark ? 'border-primary-5 text-white' : 'text-primary border-primary'
            )}
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
              className={cn('flex items-center gap-2 text-lg font-normal', textColor)}
            >
              <div>+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line className={cn('size-5', iconColor)} />
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
          {advantages.map((advantage: AdvantagesProps) => (
            <div
              key={`advantage-${advantage.title}`}
              className={cn('flex items-center gap-2 text-lg font-normal', textColor)}
            >
              <div className="mr-2">+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line className={cn('size-5', iconColor)} />
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
