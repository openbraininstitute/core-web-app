'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import Link from 'next/link';
import { useState } from 'react';

import SubscriptionToggle from '@/ui/segments/plans/subscription-toggle';

import type { PlanV2 } from '@/types/virtual-lab/pricing';

import pills from '@/ui/segments/landing/cta-pill.module.css';

const summaries = [
  {
    name: 'Free',
    description: 'Explore the platform and run your first experiments.',
    action: 'Start free',
    href: '/app/virtual-lab',
  },
  {
    name: 'Pro',
    description:
      'For researchers who run experiments regularly. Use fewer credits for many workflows.',
    action: 'Get Started',
    href: '/app/virtual-lab',
  },
  {
    name: 'Enterprise',
    description: 'For organizations that need team seats, scalable compute, and dedicated support.',
    action: 'Contact us',
    href: 'mailto:subscription@openbraininstitute.org',
  },
  {
    name: 'Education',
    description:
      'For instructors bringing neuroscience modeling into courses, with teaching credits and storage for course materials.',
    action: 'Contact us',
    href: 'mailto:subscription@openbraininstitute.org',
  },
];

export default function PlanSummaries({ plans }: { plans: PlanV2[] }) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  if (!plans.length) return null;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-5 md:min-h-[calc(100dvh-112px)]">
      <h2 className="mb-6 text-3xl text-primary-9 md:mt-auto">Choose a plan</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:mb-auto xl:grid-cols-4">
        {summaries.map(({ name, description, action, href }) => {
          const plan = plans.find((item) => item.name === name);
          if (!plan) return null;
          const monthly = plan.monthly_subscriptions?.[0];
          const yearly = plan.yearly_subscriptions?.[0];
          const subscription =
            billingInterval === 'year' ? (yearly ?? monthly) : (monthly ?? yearly);
          return (
            <article
              key={name}
              className="flex flex-col items-start gap-3 rounded-xl border border-neutral-200 bg-white p-5"
            >
              <h3 className="text-2xl font-semibold text-primary-9">{name}</h3>
              <p className="text-base text-primary-9">{description}</p>
              {name === 'Free' && (
                <p className="font-semibold text-primary-9">100 initial credits included</p>
              )}
              {name === 'Pro' && subscription && (
                <>
                  {monthly && yearly && (
                    <SubscriptionToggle
                      billingInterval={billingInterval}
                      setBillingInterval={setBillingInterval}
                    />
                  )}
                  <div aria-live="polite" className="font-semibold text-primary-9">
                    <p>
                      {subscription.currency} {subscription.price} /{' '}
                      {subscription === yearly ? 'year' : 'month'}
                    </p>
                    {subscription.features?.[0] && <p>{subscription.features[0].title}</p>}
                  </div>
                </>
              )}
              <div className="mt-auto self-center pt-2">
                <Link
                  href={href}
                  className={pills.pill}
                  aria-label={action === 'Contact us' ? `Contact us about ${name}` : undefined}
                >
                  {action}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <a
        href="#compare-credit-costs"
        className="mx-auto mt-6 flex min-h-11 w-fit flex-col items-center justify-center text-sm font-semibold text-primary-9 hover:opacity-60"
      >
        Compare credit costs
        <RiArrowDownSLine aria-hidden="true" className="size-6" />
      </a>
    </div>
  );
}
