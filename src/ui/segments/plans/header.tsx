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
  compact = false,
}: {
  plan: PlanV2;
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
  compact?: boolean;
}) {
  const displayedFeatures = plan.has_subscription
    ? ((billingInterval === 'month'
        ? plan.monthly_subscriptions[0]?.features
        : plan.yearly_subscriptions[0]?.features) ?? [])
    : [];
  const advantages = plan.advantages ?? [];

  return (
    <header
      className={`relative flex w-full flex-col justify-between ${compact ? 'gap-3' : 'h-[260px]'}`}
    >
      <div>
        <div>
          <div className="flex flex-row items-center" style={{ justifyContent: 'space-between' }}>
            <div className={`font-serif font-normal ${compact ? 'text-2xl' : 'text-4xl'}`}>
              {plan.name}
            </div>
            {plan.has_subscription && (
              <SubscriptionToggle
                billingInterval={billingInterval}
                setBillingInterval={setBillingInterval}
              />
            )}
          </div>
          {plan.has_subtitle && (
            <div className={`font-normal ${compact ? 'text-sm' : 'text-lg'}`}>{plan.subtitle}</div>
          )}
        </div>
        {plan.has_subscription && (
          <SubscriptionsCosts billingInterval={billingInterval} plan={plan} />
        )}
      </div>
      {plan.has_contact_button && (
        <div className="w-full">
          <Link
            href="mailto:subscription@openbraininstitute.org"
            className={`text-primary border-primary block w-full border text-center ${compact ? 'py-2 text-sm' : 'py-4 text-base'}`}
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
              className={`text-primary-9 flex items-center gap-2 font-normal ${compact ? 'text-sm' : 'text-lg'}`}
            >
              <div>+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line
                      className={`text-primary-9 ${compact ? 'size-4' : 'size-5'}`}
                    />
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
          {advantages.map((advantage: AdvantagesProps) => (
            <div
              key={`advantage-${advantage.title}`}
              className={`text-primary-9 flex items-center gap-2 font-normal ${compact ? 'text-sm' : 'text-lg'}`}
            >
              <div className="mr-2">+</div>
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div>
                  <Tooltip title={advantage.tooltip}>
                    <RiInformation2Line
                      className={`text-primary-9 ${compact ? 'size-4' : 'size-5'}`}
                    />
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
