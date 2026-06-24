import { PlusOutlined } from '@ant-design/icons';
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
  isCurrentTier,
  hideContactButton,
}: {
  plan: PlanV2;
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
  isCurrentTier?: boolean;
  hideContactButton?: boolean;
}) {
  const displayedFeatures = plan.has_subscription
    ? ((billingInterval === 'month'
        ? plan.monthly_subscriptions[0]?.features
        : plan.yearly_subscriptions[0]?.features) ?? [])
    : [];
  const advantages = plan.advantages ?? [];

  const textColor = 'text-white';
  const iconColor = 'text-white';

  return (
    <header
      id={`${plan.name}-header`}
      className="relative flex h-[260px] w-full flex-col justify-between"
    >
      <div className="w-full">
        <div className="w-full">
          <div className="flex flex-row items-center justify-between">
            <div
              className={cn(
                'font-serif text-4xl font-normal',
                isCurrentTier ? 'text-white' : 'text-primary-9!'
              )}
            >
              {plan.name}
            </div>
            {plan.has_subscription && (
              <SubscriptionToggle
                billingInterval={billingInterval}
                setBillingInterval={setBillingInterval}
                isCurrentTier={isCurrentTier}
              />
            )}
          </div>
          {plan.has_subtitle && <div className="text-lg font-normal">{plan.subtitle}</div>}
        </div>
        {plan.has_subscription && (
          <SubscriptionsCosts
            billingInterval={billingInterval}
            plan={plan}
            isCurrentTier={isCurrentTier}
          />
        )}
      </div>

      {plan.has_contact_button && !hideContactButton && (
        <div className="w-full">
          <Link
            href="mailto:subscription@openbraininstitute.org"
            className={cn(
              'block w-full border py-4 text-center text-base',
              isCurrentTier ? 'border-primary-5 text-white' : 'text-primary border-primary'
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
              className={cn(
                'flex items-center justify-center gap-2 text-lg font-normal w-full',
                textColor
              )}
            >
              <PlusOutlined className="size-3" />
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div className="ml-auto">
                  <Tooltip placement="top" title={advantage.tooltip}>
                    <RiInformation2Line className={cn('size-5 cursor-pointer', iconColor)} />
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
          {advantages.map((advantage: AdvantagesProps) => (
            <div
              key={`advantage-${advantage.title}`}
              className={cn(
                'flex items-center justify-center gap-2 text-lg font-normal w-full',
                textColor
              )}
            >
              <PlusOutlined className="size-3" />
              <div>{advantage.title}</div>
              {advantage.tooltip && (
                <div className="ml-auto">
                  <Tooltip
                    title={advantage.tooltip}
                    classNames={{
                      body: 'bg-white! text-primary-9!',
                      root: '[&_.ant-tooltip-arrow]:after:bg-white!',
                    }}
                  >
                    <RiInformation2Line className={cn('size-5 cursor-pointer', iconColor)} />
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
